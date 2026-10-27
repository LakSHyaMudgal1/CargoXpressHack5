const express = require('express');
const mergeRouter = express.Router();
const Route = require('../models/route');
const Truck = require('../models/truck');
const { adminAuth } = require('../middlewares/auth');
const MergeablePair = require('../models/mergeablePair');
const MergedSchedule = require('../models/mergedSchedule');
const FreeTruck = require('../models/freeTruck');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Evaluates route compatibility between a carrier's committed stops and an incoming truck's stops.
 * Supports:
 * - A shorter route contained as a subsequence within the carrier route.
 * - Partial overlaps with compatible pickup and delivery locations within the carrier's reach.
 * - Compatible intermediate stops that can be incorporated without violating stop order.
 * Rejects:
 * - Route where stop sequence violates delivery constraints (e.g. reversed order or cyclic dependencies).
 * - Partial overlap where incoming shipment begins before carrier origin or ends after carrier destination.
 */
function evaluateRouteCompatibility(carrierStops, incomingStops) {
    if (!carrierStops || carrierStops.length < 2 || !incomingStops || incomingStops.length < 2) {
        return { compatible: false, reason: "Invalid stop arrays" };
    }

    const carrierOrigin = carrierStops[0];
    const carrierDest = carrierStops[carrierStops.length - 1];
    const incomingOrigin = incomingStops[0];
    const incomingDest = incomingStops[incomingStops.length - 1];

    // 1. Check all shared stops appear in strictly increasing order in the carrier's committed sequence
    let lastCarrierIdx = -1;
    const sharedIndicesInCarrier = [];
    for (let i = 0; i < incomingStops.length; i++) {
        const stop = incomingStops[i];
        const cIdx = carrierStops.indexOf(stop);
        if (cIdx !== -1) {
            if (cIdx <= lastCarrierIdx) {
                return {
                    compatible: false,
                    reason: `Stop sequence violates delivery constraints: "${stop}" appears out of order relative to carrier itinerary.`
                };
            }
            lastCarrierIdx = cIdx;
            sharedIndicesInCarrier.push({ stop, inCarrierIdx: cIdx, inIncomingIdx: i });
        }
    }

    // Must share at least one stop to have any corridor overlap
    if (sharedIndicesInCarrier.length === 0) {
        return { compatible: false, reason: "No route overlap" };
    }

    // 2. Bound checks: The carrier must be able to service the incoming shipment from origin to destination
    const firstShared = sharedIndicesInCarrier[0];
    const lastShared = sharedIndicesInCarrier[sharedIndicesInCarrier.length - 1];

    // If incoming origin is not shared with carrier or comes before the first shared stop
    if (incomingOrigin !== firstShared.stop && firstShared.inIncomingIdx > 0) {
        return {
            compatible: false,
            reason: `Incoming shipment origin "${incomingOrigin}" is not reachable on the carrier's itinerary.`
        };
    }

    // If incoming destination is not shared or extends beyond the last shared stop
    if (incomingDest !== lastShared.stop && lastShared.inIncomingIdx < incomingStops.length - 1) {
        return {
            compatible: false,
            reason: `Incoming shipment destination "${incomingDest}" is beyond the carrier's itinerary bounds.`
        };
    }

    // 3. Construct the combined itinerary `allStops`
    const allStops = [...carrierStops];

    // Insert any intermediate unshared stops from incomingStops without altering carrier's sequence
    for (let i = 0; i < incomingStops.length; i++) {
        const stop = incomingStops[i];
        if (!allStops.includes(stop)) {
            let prevInAll = -1;
            for (let p = i - 1; p >= 0; p--) {
                const idx = allStops.indexOf(incomingStops[p]);
                if (idx !== -1) { prevInAll = idx; break; }
            }
            let nextInAll = -1;
            for (let n = i + 1; n < incomingStops.length; n++) {
                const idx = allStops.indexOf(incomingStops[n]);
                if (idx !== -1) { nextInAll = idx; break; }
            }

            if (prevInAll !== -1 && nextInAll !== -1 && prevInAll < nextInAll) {
                allStops.splice(prevInAll + 1, 0, stop);
            } else {
                return {
                    compatible: false,
                    reason: `Cannot safely incorporate intermediate stop "${stop}" without violating stop order.`
                };
            }
        }
    }

    // Sanity checks: both sequences must be forward subsequences of allStops
    let cCheck = -1;
    for (const s of carrierStops) {
        const idx = allStops.indexOf(s);
        if (idx <= cCheck) return { compatible: false, reason: "Carrier sequence integrity violation" };
        cCheck = idx;
    }

    let iCheck = -1;
    for (const s of incomingStops) {
        const idx = allStops.indexOf(s);
        if (idx <= iCheck) return { compatible: false, reason: "Incoming sequence integrity violation" };
        iCheck = idx;
    }

    return { compatible: true, allStops };
}

/**
 * Validates capacity along each affected route segment between consecutive stops.
 * Accounts for:
 * - Cargo already aboard the carrier.
 * - New cargo introduced by the incoming shipment.
 * - Actual pickup point (incoming cargo = 0 before pickup).
 * - Actual delivery point (incoming cargo = 0 after delivery).
 * - Cargo unloaded before subsequent segments (drops along the way).
 * - Intermediate pickups and continuing cargo.
 */
function evaluateSegmentCapacity(carrierStops, carrierCurrentLoads, carrierCapacity, incomingStops, incomingCurrentLoads, allStops) {
    const numStops = allStops.length;
    const finalCurrentLoad = [];
    const finalRemainingLoad = [];

    const incomingStartIdx = allStops.indexOf(incomingStops[0]);
    const incomingEndIdx = allStops.indexOf(incomingStops[incomingStops.length - 1]);

    for (let k = 0; k < numStops; k++) {
        const stopName = allStops[k];

        // 1. Carrier load at this stop
        let carrierLoad = 0;
        const cIdx = carrierStops.indexOf(stopName);
        if (cIdx !== -1) {
            carrierLoad = carrierCurrentLoads[cIdx] || 0;
        } else {
            // Stop was inserted: carrier continues with load from preceding carrier stop
            let lastC = -1;
            for (let p = k - 1; p >= 0; p--) {
                const idx = carrierStops.indexOf(allStops[p]);
                if (idx !== -1) { lastC = idx; break; }
            }
            carrierLoad = lastC !== -1 ? (carrierCurrentLoads[lastC] || 0) : 0;
        }

        // 2. Incoming load at this stop
        let incomingLoad = 0;
        if (k >= incomingStartIdx && k <= incomingEndIdx) {
            const iIdx = incomingStops.indexOf(stopName);
            if (iIdx !== -1) {
                incomingLoad = incomingCurrentLoads[iIdx] || 0;
            } else {
                let lastI = -1;
                for (let p = k - 1; p >= 0; p--) {
                    const idx = incomingStops.indexOf(allStops[p]);
                    if (idx !== -1) { lastI = idx; break; }
                }
                incomingLoad = lastI !== -1 ? (incomingCurrentLoads[lastI] || 0) : 0;
            }
        } else {
            // Before pickup or after delivery (unloaded!)
            incomingLoad = 0;
        }

        const totalLoadAtStop = carrierLoad + incomingLoad;

        if (totalLoadAtStop > carrierCapacity) {
            return {
                feasible: false,
                failedStopIndex: k,
                stopName,
                carrierLoad,
                incomingLoad,
                totalLoadAtStop,
                capacity: carrierCapacity,
                reason: `Capacity exceeded at stop "${stopName}": total load ${totalLoadAtStop} kg exceeds truck capacity ${carrierCapacity} kg.`
            };
        }

        finalCurrentLoad.push(totalLoadAtStop);
        finalRemainingLoad.push(Math.max(carrierCapacity - totalLoadAtStop, 0));
    }

    return {
        feasible: true,
        finalCurrentLoad,
        finalRemainingLoad,
    };
}

/**
 * Reconciles carrier vs absorbed truck and calculates unified route and consolidated loads.
 */
function buildMergedData(pair, truckOne, truckTwo, existingCarrierSchedule = null) {
    let finalTruck = truckOne;
    let freeTruck = truckTwo;

    if (truckTwo.totalCapacity > truckOne.totalCapacity) {
        finalTruck = truckTwo;
        freeTruck = truckOne;
    } else if (truckTwo.totalCapacity === truckOne.totalCapacity) {
        if (existingCarrierSchedule && existingCarrierSchedule.transportationTruckId === truckTwo._id.toString()) {
            finalTruck = truckTwo;
            freeTruck = truckOne;
        }
    }

    const totalCapacity = finalTruck.totalCapacity;

    let carrierStops = [];
    let carrierCurrentLoad = [];

    if (existingCarrierSchedule && existingCarrierSchedule.transportationTruckId === finalTruck._id.toString()) {
        carrierStops = existingCarrierSchedule.stops || [];
        carrierCurrentLoad = existingCarrierSchedule.finalCurrentLoad || [];
    } else {
        carrierStops = (finalTruck._id.toString() === truckOne._id.toString() ? pair.truckOneStops : pair.truckTwoStops) || [];
        carrierCurrentLoad = finalTruck.currentLoad || [];
    }

    const absorbedStops = (freeTruck._id.toString() === truckTwo._id.toString() ? pair.truckTwoStops : pair.truckOneStops) || [];
    const absorbedCurrentLoad = freeTruck.currentLoad || [];

    // 1. Evaluate route compatibility and construct unified stop sequence
    const routeCheck = evaluateRouteCompatibility(carrierStops, absorbedStops);
    if (!routeCheck.compatible) {
        throw new Error(`Route incompatibility: ${routeCheck.reason}`);
    }

    const allStops = routeCheck.allStops;

    // 2. Evaluate segment-by-segment load and capacity feasibility
    const capacityCheck = evaluateSegmentCapacity(
        carrierStops,
        carrierCurrentLoad,
        totalCapacity,
        absorbedStops,
        absorbedCurrentLoad,
        allStops
    );

    if (!capacityCheck.feasible) {
        throw new Error(`Insufficient capacity: ${capacityCheck.reason}`);
    }

    return {
        finalTruck,
        freeTruck,
        totalCapacity,
        allStops,
        finalCurrentLoad: capacityCheck.finalCurrentLoad,
        finalRemainingLoad: capacityCheck.finalRemainingLoad,
        finalSource: allStops[0],
        finalDestination: allStops[allStops.length - 1],
        carrierStops,
        carrierCurrentLoad,
        absorbedStops,
        absorbedCurrentLoad,
    };
}

/**
 * Core engine logic to discover mergeable pairs considering active carrier schedules.
 */
async function generateMergeablePairs() {
    const allRoutes = await Route.find();
    const allTrucks = await Truck.find();
    const allSchedules = await MergedSchedule.find();
    const allFreeTrucks = await FreeTruck.find();

    if (!allRoutes.length || !allTrucks.length) {
        return [];
    }

    const truckRoutesMap = new Map();
    allRoutes.forEach(r => truckRoutesMap.set(r.truckId.toString(), r.stops));

    // 1. Identify released / free trucks
    const freeTruckIds = new Set(allFreeTrucks.map(ft => ft.truckId.toString()));

    // 2. Identify trucks absorbed into other carriers
    const absorbedTruckIds = new Set();
    allSchedules.filter(s => s.status === 'accepted').forEach(s => {
        if (s.mergedFromTrucks) {
            s.mergedFromTrucks.forEach(t => {
                if (t.id && t.id !== s.transportationTruckId) {
                    absorbedTruckIds.add(t.id);
                }
            });
        }
    });

    // 3. Identify rejected trucks (dispatched independently)
    const rejectedTruckIds = new Set();
    allSchedules.filter(s => s.status === 'rejected').forEach(s => {
        rejectedTruckIds.add(s.transportationTruckId);
        if (s.mergedFromTrucks) {
            s.mergedFromTrucks.forEach(t => {
                if (t.id) rejectedTruckIds.add(t.id);
            });
        }
    });

    // 4. Map active accepted carriers to their live schedule
    const activeCarrierMap = new Map();
    allSchedules.filter(s => s.status === 'accepted').forEach(s => {
        activeCarrierMap.set(s.transportationTruckId, s);
    });

    // Ineligible trucks cannot be proposed as carriers or absorbed trucks
    const ineligibleTruckIds = new Set([
        ...freeTruckIds,
        ...absorbedTruckIds,
        ...rejectedTruckIds
    ]);

    // Prune stale pending MergeablePair records involving ineligible trucks
    await MergeablePair.deleteMany({
        $or: [
            { truckOneId: { $in: Array.from(ineligibleTruckIds) } },
            { truckTwoId: { $in: Array.from(ineligibleTruckIds) } },
        ]
    });

    // Build authoritative profiles for eligible candidate trucks
    const eligibleProfiles = [];
    for (const truck of allTrucks) {
        const tid = truck._id.toString();
        if (ineligibleTruckIds.has(tid)) continue;

        const carrierSchedule = activeCarrierMap.get(tid);
        let stops = [];
        let currentLoad = [];
        let remainingLoad = [];
        let totalCapacity = truck.totalCapacity;
        let mergedFromIds = new Set([tid]);
        let isCarrier = false;

        if (carrierSchedule) {
            isCarrier = true;
            stops = carrierSchedule.stops || [];
            currentLoad = carrierSchedule.finalCurrentLoad || [];
            remainingLoad = carrierSchedule.finalRemainingLoad || [];
            totalCapacity = carrierSchedule.totalCapacity || truck.totalCapacity;
            if (carrierSchedule.mergedFromTrucks) {
                carrierSchedule.mergedFromTrucks.forEach(t => {
                    if (t.id) mergedFromIds.add(t.id);
                });
            }
        } else {
            const rStops = truckRoutesMap.get(tid);
            if (!rStops || !rStops.length) continue;
            stops = rStops;
            currentLoad = truck.currentLoad || [];
            totalCapacity = truck.totalCapacity;
            remainingLoad = (truck.remainingLoad && truck.remainingLoad.length === stops.length)
                ? truck.remainingLoad
                : currentLoad.map(l => totalCapacity - l);
        }

        if (!stops.length) continue;

        eligibleProfiles.push({
            id: tid,
            truck,
            licensePlate: truck.licensePlate,
            totalCapacity,
            stops,
            currentLoad,
            remainingLoad,
            mergedFromIds,
            isCarrier,
        });
    }

    const usedTrucks = new Set();
    const newPairsToSave = [];

    // Find all already-saved pending pairs
    const existingPairs = await MergeablePair.find();
    const existingSet = new Set(existingPairs.map(p => `${p.truckOneId}-${p.truckTwoId}`));

    for (let i = 0; i < eligibleProfiles.length; i++) {
        const truckA = eligibleProfiles[i];
        if (usedTrucks.has(truckA.id)) continue;

        for (let j = 0; j < eligibleProfiles.length; j++) {
            if (i === j) continue;
            const truckB = eligibleProfiles[j];
            if (usedTrucks.has(truckB.id)) continue;

            // Do not merge trucks that already belong to the same manifest
            if (truckA.mergedFromIds.has(truckB.id) || truckB.mergedFromIds.has(truckA.id)) {
                continue;
            }

            // Determine carrier (bigger) and candidate to absorb (smaller)
            let bigger = truckA, smaller = truckB;
            if (truckB.totalCapacity > truckA.totalCapacity) {
                bigger = truckB;
                smaller = truckA;
            } else if (truckB.totalCapacity === truckA.totalCapacity) {
                if (truckB.isCarrier && !truckA.isCarrier) {
                    bigger = truckB;
                    smaller = truckA;
                }
            }

            // An active carrier cannot be absorbed into another truck
            if (smaller.isCarrier) continue;

            const biggerStops = bigger.stops;
            const smallerStops = smaller.stops;
            if (!smallerStops.length) continue;

            const routeCheck = evaluateRouteCompatibility(biggerStops, smallerStops);
            if (!routeCheck.compatible) continue;

            const capacityCheck = evaluateSegmentCapacity(
                biggerStops,
                bigger.currentLoad,
                bigger.totalCapacity,
                smallerStops,
                smaller.currentLoad,
                routeCheck.allStops
            );
            if (!capacityCheck.feasible) continue;

            const key = `${bigger.id}-${smaller.id}`;
            if (!existingSet.has(key)) {
                newPairsToSave.push({
                    truckOneId: bigger.truck._id,
                    truckOneLicensePlate: bigger.licensePlate,
                    truckOneStops: biggerStops,
                    truckTwoId: smaller.truck._id,
                    truckTwoLicensePlate: smaller.licensePlate,
                    truckTwoStops: smallerStops,
                });
                existingSet.add(key);
            }
            usedTrucks.add(bigger.id);
            usedTrucks.add(smaller.id);
            break;
        }
    }

    if (newPairsToSave.length) {
        await MergeablePair.insertMany(newPairsToSave);
    }

    return await MergeablePair.find()
        .populate('truckOneId')
        .populate('truckTwoId')
        .sort({ createdAt: -1 });
}

/**
 * Approves a mergeable pair, updating active schedules and releasing absorbed trucks.
 */
async function executeAcceptPair(pairId) {
    // 1. Atomically consume the pair document to prevent double-submit or concurrent race conditions
    const pair = await MergeablePair.findByIdAndDelete(pairId);
    if (!pair) {
        const err = new Error("This merge pair has already been processed or does not exist.");
        err.statusCode = 409;
        throw err;
    }

    // 2. Fetch fresh truck data from database
    const truckOne = await Truck.findById(pair.truckOneId);
    const truckTwo = await Truck.findById(pair.truckTwoId);
    if (!truckOne || !truckTwo) {
        throw new Error("One or more trucks in this pair no longer exist.");
    }

    // 3. Prevent merging a truck that has already been released as a Free Truck
    const isFreedOne = await FreeTruck.exists({ truckId: truckOne._id.toString() });
    const isFreedTwo = await FreeTruck.exists({ truckId: truckTwo._id.toString() });
    if (isFreedOne || isFreedTwo) {
        throw new Error("One or more trucks in this pair have already been released as Free Trucks.");
    }

    // 4. Determine if one of the trucks is already an active carrier
    const existingSchedOne = await MergedSchedule.findOne({
        transportationTruckId: truckOne._id.toString(),
        status: 'accepted'
    });
    const existingSchedTwo = await MergedSchedule.findOne({
        transportationTruckId: truckTwo._id.toString(),
        status: 'accepted'
    });

    if (existingSchedOne && existingSchedTwo) {
        throw new Error("Cannot merge two active carrier trucks with existing consolidated schedules.");
    }

    const activeCarrierSchedule = existingSchedOne || existingSchedTwo || null;

    // 5. Re-validate capacity and route, and calculate consolidated loads
    const { finalTruck, freeTruck, totalCapacity, allStops,
        finalCurrentLoad, finalRemainingLoad, finalSource, finalDestination,
        carrierStops, carrierCurrentLoad, absorbedStops, absorbedCurrentLoad } =
        buildMergedData(pair, truckOne, truckTwo, activeCarrierSchedule);

    if (!finalSource || !finalDestination) {
        throw new Error("Invalid route data");
    }

    // 6. Check if incoming truck is already in the carrier's manifest
    if (activeCarrierSchedule && activeCarrierSchedule.mergedFromTrucks) {
        const alreadyInManifest = activeCarrierSchedule.mergedFromTrucks.some(
            t => t.id === freeTruck._id.toString()
        );
        if (alreadyInManifest) {
            throw new Error(`Truck ${freeTruck.licensePlate} is already part of the carrier's manifest.`);
        }
    }

    // 7. Look up individual route details to record detailed shipment tracking
    const freeTruckRoute = await Route.findOne({ truckId: freeTruck._id });
    const incomingShipment = {
        id: freeTruck._id.toString(),
        licensePlate: freeTruck.licensePlate,
        companyId: freeTruck.companyId,
        source: freeTruckRoute ? freeTruckRoute.source : (absorbedStops[0] || ""),
        destination: freeTruckRoute ? freeTruckRoute.destination : (absorbedStops[absorbedStops.length - 1] || ""),
        stops: absorbedStops,
        load: absorbedCurrentLoad,
        role: 'absorbed',
    };

    let mergedSchedule;
    if (activeCarrierSchedule && activeCarrierSchedule.transportationTruckId === finalTruck._id.toString()) {
        // Consolidate into existing carrier schedule
        if (!activeCarrierSchedule.mergedFromTrucks || !activeCarrierSchedule.mergedFromTrucks.length) {
            const carrierRoute = await Route.findOne({ truckId: finalTruck._id });
            activeCarrierSchedule.mergedFromTrucks = [
                {
                    id: finalTruck._id.toString(),
                    licensePlate: finalTruck.licensePlate,
                    companyId: finalTruck.companyId,
                    source: carrierRoute ? carrierRoute.source : (carrierStops[0] || ""),
                    destination: carrierRoute ? carrierRoute.destination : (carrierStops[carrierStops.length - 1] || ""),
                    stops: carrierStops,
                    load: carrierCurrentLoad,
                    role: 'carrier',
                }
            ];
        }
        activeCarrierSchedule.mergedFromTrucks.push(incomingShipment);
        activeCarrierSchedule.stops = allStops;
        activeCarrierSchedule.finalSource = finalSource;
        activeCarrierSchedule.finalDestination = finalDestination;
        activeCarrierSchedule.finalCurrentLoad = finalCurrentLoad;
        activeCarrierSchedule.finalRemainingLoad = finalRemainingLoad;
        activeCarrierSchedule.totalCapacity = totalCapacity;
        activeCarrierSchedule.status = 'accepted';
        mergedSchedule = await activeCarrierSchedule.save();
    } else {
        const carrierRoute = await Route.findOne({ truckId: finalTruck._id });
        mergedSchedule = await MergedSchedule.create({
            transportationTruckId: finalTruck._id.toString(),
            transportationTruckLicensePlate: finalTruck.licensePlate,
            mergedFromTrucks: [
                {
                    id: finalTruck._id.toString(),
                    licensePlate: finalTruck.licensePlate,
                    companyId: finalTruck.companyId,
                    source: carrierRoute ? carrierRoute.source : (carrierStops[0] || ""),
                    destination: carrierRoute ? carrierRoute.destination : (carrierStops[carrierStops.length - 1] || ""),
                    stops: carrierStops,
                    load: carrierCurrentLoad,
                    role: 'carrier',
                },
                incomingShipment,
            ],
            finalSource,
            finalDestination,
            stops: allStops,
            finalCurrentLoad,
            finalRemainingLoad,
            totalCapacity,
            status: 'accepted',
        });
    }

    // 8. Synchronize carrier Truck and Route documents
    await Truck.findByIdAndUpdate(finalTruck._id, {
        currentLoad: finalCurrentLoad,
        remainingLoad: finalRemainingLoad,
    });

    await Route.findOneAndUpdate(
        { truckId: finalTruck._id },
        {
            stops: allStops,
            source: finalSource,
            destination: finalDestination,
        }
    );

    // 9. Reserve the absorbed truck into FreeTruck (avoid duplicates)
    if (!await FreeTruck.exists({ truckId: freeTruck._id.toString() })) {
        await FreeTruck.create({
            licensePlate: freeTruck.licensePlate,
            companyId: freeTruck.companyId,
            totalCapacity: freeTruck.totalCapacity,
            truckId: freeTruck._id.toString(),
        });
    }

    // 10. Invalidate any conflicting pending pairs involving the free truck or the carrier truck
    await MergeablePair.deleteMany({
        $or: [
            { truckOneId: freeTruck._id },
            { truckTwoId: freeTruck._id },
            { truckOneId: finalTruck._id },
            { truckTwoId: finalTruck._id },
        ]
    });

    return mergedSchedule;
}

// ─── GET /mergeableSchedule — find overlapping pairs, save & return with _id ─

mergeRouter.get('/mergeableSchedule', adminAuth, async (req, res) => {
    try {
        const allPairs = await generateMergeablePairs();
        res.json({ mergeablePairs: allPairs });
    } catch (error) {
        console.error("Error fetching mergeable trucks:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /mergedSchedule — read from MergedSchedule + refresh loads from live truck data ─

mergeRouter.get('/mergedSchedule', adminAuth, async (req, res) => {
    try {
        const saved = await MergedSchedule.find().sort({ createdAt: -1 });
        const MergeableTrader = require('../models/mergeableTrader');

        // Re-compute live loads for each schedule entry from the actual Truck document
        const refreshed = await Promise.all(saved.map(async (schedule) => {
            const truck = await Truck.findById(schedule.transportationTruckId);
            if (!truck) return schedule.toObject();

            const route = await Route.findOne({ truckId: truck._id });
            const truckStops = route ? route.stops : [];

            // Re-map load values from live truck data onto the schedule's stop list
            const liveCurrentLoad = schedule.stops.map((stop, sIdx) => {
                const idx = truckStops.indexOf(stop);
                if (idx !== -1 && truck.currentLoad && truck.currentLoad[idx] !== undefined) {
                    return truck.currentLoad[idx];
                }
                return (schedule.finalCurrentLoad && schedule.finalCurrentLoad[sIdx] !== undefined)
                    ? schedule.finalCurrentLoad[sIdx]
                    : 0;
            });
            const liveRemainingLoad = schedule.stops.map((stop, sIdx) => {
                const idx = truckStops.indexOf(stop);
                if (idx !== -1 && truck.remainingLoad && truck.remainingLoad[idx] !== undefined) {
                    return truck.remainingLoad[idx];
                }
                return (schedule.finalRemainingLoad && schedule.finalRemainingLoad[sIdx] !== undefined)
                    ? schedule.finalRemainingLoad[sIdx]
                    : 0;
            });

            return {
                ...schedule.toObject(),
                finalCurrentLoad: liveCurrentLoad,
                finalRemainingLoad: liveRemainingLoad,
                totalCapacity: schedule.totalCapacity || truck.totalCapacity,
            };
        }));

        const acceptedTraders = await MergeableTrader.find({ status: 'accepted' }).populate('traderId', 'name').sort({ createdAt: -1 });

        res.json({ mergedSchedules: refreshed, acceptedTraders });
    } catch (error) {
        console.error("Error fetching merged schedules:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ─── POST /acceptPair/:id — admin approves a merge ───────────────────────────

mergeRouter.post('/acceptPair/:id', adminAuth, async (req, res) => {
    try {
        const mergedSchedule = await executeAcceptPair(req.params.id);
        res.json({ message: "Pair merged successfully", mergedSchedule });
    } catch (error) {
        console.error("Error accepting pair:", error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// ─── DELETE /rejectPair/:id — admin rejects, both trucks go independently ────

mergeRouter.delete('/rejectPair/:id', adminAuth, async (req, res) => {
    try {
        const pair = await MergeablePair.findById(req.params.id)
            .populate('truckOneId')
            .populate('truckTwoId');

        if (!pair) return res.status(404).json({ error: "Pair not found" });

        const truckOne = pair.truckOneId;
        const truckTwo = pair.truckTwoId;

        // Save unmerged trucks as independent schedules so they appear on the merged schedule page
        const makeIndependentSchedule = async (truck, stops) => {
            if (!truck || !stops || !stops.length) return;
            // If truck already has an accepted schedule, preserve it
            const hasAccepted = await MergedSchedule.findOne({
                transportationTruckId: truck._id.toString(),
                status: 'accepted'
            });
            if (hasAccepted) return;

            const currentLoad = truck.currentLoad || [];
            const remainingLoad = truck.remainingLoad || [];
            await MergedSchedule.create({
                transportationTruckId: truck._id.toString(),
                transportationTruckLicensePlate: truck.licensePlate,
                mergedFromTrucks: [],
                finalSource: stops[0],
                finalDestination: stops[stops.length - 1],
                stops,
                finalCurrentLoad: currentLoad.slice(0, stops.length),
                finalRemainingLoad: remainingLoad.slice(0, stops.length),
                totalCapacity: truck.totalCapacity,
                status: 'rejected',
            });
        };

        if (truckOne) await makeIndependentSchedule(truckOne, pair.truckOneStops);
        if (truckTwo) await makeIndependentSchedule(truckTwo, pair.truckTwoStops);

        await MergeablePair.findByIdAndDelete(req.params.id);
        res.json({ message: "Pair rejected. Both trucks will dispatch independently." });

    } catch (error) {
        console.error("Error rejecting pair:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /mergeAllPairs ─────────────────────────────────────────────────────

mergeRouter.post('/mergeAllPairs', adminAuth, async (req, res) => {
    try {
        const allPairs = await MergeablePair.find();

        if (!allPairs.length) return res.json({ message: "No pairs to merge", mergedCount: 0 });

        let mergedCount = 0;
        const errors = [];

        for (const pair of allPairs) {
            try {
                const exists = await MergeablePair.findById(pair._id);
                if (!exists) continue;

                await executeAcceptPair(pair._id);
                mergedCount++;
            } catch (err) {
                errors.push(`${pair._id}: ${err.message}`);
            }
        }

        res.json({ message: `Merged ${mergedCount} pairs`, mergedCount, errors: errors.length ? errors : undefined });

    } catch (error) {
        console.error("Error merging all pairs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

mergeRouter.buildMergedData = buildMergedData;
mergeRouter.generateMergeablePairs = generateMergeablePairs;
mergeRouter.executeAcceptPair = executeAcceptPair;
mergeRouter.evaluateRouteCompatibility = evaluateRouteCompatibility;
mergeRouter.evaluateSegmentCapacity = evaluateSegmentCapacity;

module.exports = mergeRouter;
