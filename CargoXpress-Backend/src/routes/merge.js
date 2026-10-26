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
 * Reconciles carrier vs absorbed truck and calculates unified route and consolidated loads.
 */
function buildMergedData(pair, truckOne, truckTwo, existingCarrierSchedule = null) {
    let finalTruck = truckOne;
    let freeTruck = truckTwo;

    if (truckTwo.totalCapacity > truckOne.totalCapacity) {
        finalTruck = truckTwo;
        freeTruck = truckOne;
    } else if (truckTwo.totalCapacity === truckOne.totalCapacity) {
        // If truckTwo is already the carrier in an active schedule, preserve it as carrier
        if (existingCarrierSchedule && existingCarrierSchedule.transportationTruckId === truckTwo._id.toString()) {
            finalTruck = truckTwo;
            freeTruck = truckOne;
        }
    }

    const totalCapacity = finalTruck.totalCapacity;

    // Determine current stops and load for finalTruck (use active schedule if already a carrier)
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

    // Union of stops, preserving sequence order
    let allStops = [...new Set([...(carrierStops || []), ...(absorbedStops || [])])];
    allStops.sort((a, b) => {
        const ia = Math.min(
            carrierStops.indexOf(a) >= 0 ? carrierStops.indexOf(a) : Infinity,
            absorbedStops.indexOf(a) >= 0 ? absorbedStops.indexOf(a) : Infinity
        );
        const ib = Math.min(
            carrierStops.indexOf(b) >= 0 ? carrierStops.indexOf(b) : Infinity,
            absorbedStops.indexOf(b) >= 0 ? absorbedStops.indexOf(b) : Infinity
        );
        return ia - ib;
    });

    const finalCurrentLoad = [];
    const finalRemainingLoad = [];

    for (const stop of allStops) {
        const i1 = carrierStops.indexOf(stop);
        const i2 = absorbedStops.indexOf(stop);
        const l1 = i1 !== -1 ? (carrierCurrentLoad[i1] || 0) : 0;
        const l2 = i2 !== -1 ? (absorbedCurrentLoad[i2] || 0) : 0;
        const total = l1 + l2;
        finalCurrentLoad.push(total);
        finalRemainingLoad.push(Math.max(totalCapacity - total, 0));
    }

    return {
        finalTruck,
        freeTruck,
        totalCapacity,
        allStops,
        finalCurrentLoad,
        finalRemainingLoad,
        finalSource: allStops[0],
        finalDestination: allStops[allStops.length - 1],
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

            // Directional sub-sequence check: all stops of smaller must appear in bigger in the same order
            let lastIdx = -1;
            let isOrderedSubsequence = true;
            for (const stop of smallerStops) {
                const idx = biggerStops.indexOf(stop);
                if (idx === -1 || idx <= lastIdx) {
                    isOrderedSubsequence = false;
                    break;
                }
                lastIdx = idx;
            }
            if (!isOrderedSubsequence) continue;

            // Capacity feasibility check at each shared stop
            let canMerge = true;
            for (const stop of smallerStops) {
                const ibig = biggerStops.indexOf(stop);
                const ismall = smallerStops.indexOf(stop);
                const remCap = bigger.remainingLoad[ibig] !== undefined
                    ? bigger.remainingLoad[ibig]
                    : (bigger.totalCapacity - (bigger.currentLoad[ibig] || 0));
                const reqLoad = smaller.currentLoad[ismall] || 0;

                if (remCap < reqLoad) {
                    canMerge = false;
                    break;
                }
            }

            if (canMerge) {
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
    }

    if (newPairsToSave.length) {
        await MergeablePair.insertMany(newPairsToSave);
    }

    return await MergeablePair.find().sort({ createdAt: -1 });
}

/**
 * Approves a mergeable pair, updating active schedules and releasing absorbed trucks.
 */
async function executeAcceptPair(pairId) {
    const pair = await MergeablePair.findById(pairId)
        .populate('truckOneId')
        .populate('truckTwoId');

    if (!pair) throw new Error("Pair not found");

    const truckOne = pair.truckOneId;
    const truckTwo = pair.truckTwoId;
    if (!truckOne || !truckTwo) throw new Error("Invalid truck data");

    const existingSchedOne = await MergedSchedule.findOne({
        transportationTruckId: truckOne._id.toString(),
        status: 'accepted'
    });
    const existingSchedTwo = await MergedSchedule.findOne({
        transportationTruckId: truckTwo._id.toString(),
        status: 'accepted'
    });

    const activeCarrierSchedule = existingSchedOne || existingSchedTwo || null;

    const { finalTruck, freeTruck, totalCapacity, allStops,
        finalCurrentLoad, finalRemainingLoad, finalSource, finalDestination } =
        buildMergedData(pair, truckOne, truckTwo, activeCarrierSchedule);

    if (!finalSource || !finalDestination) {
        throw new Error("Invalid route data");
    }

    let mergedSchedule;
    if (activeCarrierSchedule && activeCarrierSchedule.transportationTruckId === finalTruck._id.toString()) {
        // Consolidate into existing carrier schedule
        const alreadyListed = activeCarrierSchedule.mergedFromTrucks.some(
            t => t.id === freeTruck._id.toString()
        );
        if (!alreadyListed) {
            activeCarrierSchedule.mergedFromTrucks.push({
                licensePlate: freeTruck.licensePlate,
                id: freeTruck._id.toString(),
            });
        }
        activeCarrierSchedule.stops = allStops;
        activeCarrierSchedule.finalSource = finalSource;
        activeCarrierSchedule.finalDestination = finalDestination;
        activeCarrierSchedule.finalCurrentLoad = finalCurrentLoad;
        activeCarrierSchedule.finalRemainingLoad = finalRemainingLoad;
        activeCarrierSchedule.totalCapacity = totalCapacity;
        activeCarrierSchedule.status = 'accepted';
        mergedSchedule = await activeCarrierSchedule.save();
    } else {
        mergedSchedule = await MergedSchedule.create({
            transportationTruckId: finalTruck._id.toString(),
            transportationTruckLicensePlate: finalTruck.licensePlate,
            mergedFromTrucks: [
                { licensePlate: finalTruck.licensePlate, id: finalTruck._id.toString() },
                { licensePlate: freeTruck.licensePlate, id: freeTruck._id.toString() },
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

    // Synchronize carrier Truck and Route documents
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

    // Reserve the absorbed truck into FreeTruck
    if (!await FreeTruck.exists({ truckId: freeTruck._id.toString() })) {
        await FreeTruck.create({
            licensePlate: freeTruck.licensePlate,
            companyId: freeTruck.companyId,
            totalCapacity: freeTruck.totalCapacity,
            truckId: freeTruck._id.toString(),
        });
    }

    // Clean up accepted pair and invalidate any conflicting pending pairs
    await MergeablePair.findByIdAndDelete(pairId);
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
        res.status(500).json({ error: error.message });
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

module.exports = mergeRouter;
