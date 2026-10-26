const express = require("express");
const traderRouter = express.Router();
const Truck = require("../models/truck");
const Route = require("../models/route");
const TraderRequest = require("../models/traderRequest");
const MergeableTrader = require("../models/mergeableTrader");
const { adminAuth } = require("../middlewares/auth");

// ─── GET /mergedTrader ────────────────────────────────────────────────────────
// Returns pending trader requests matched with a truck, excluding already processed ones.
// Populates trader name so admin can see who is requesting.

traderRouter.get("/mergedTrader", adminAuth, async (req, res) => {
    try {
        // Populate traderId so we get trader name
        const allTraderRequests = await TraderRequest.find().populate("traderId", "name emailId");

        if (!allTraderRequests.length) {
            return res.json({ message: "No trader requests found", traderMergedData: [] });
        }

        // 1. Skip requests already accepted or rejected
        const alreadyProcessed = await MergeableTrader.find({}, "traderRequestId");
        const processedIds = new Set(alreadyProcessed.map(t => t.traderRequestId));

        const pending = allTraderRequests.filter(r => !processedIds.has(r._id.toString()));

        if (!pending.length) {
            return res.json({ message: "All trader requests have been processed", traderMergedData: [] });
        }

        const FreeTruck = require("../models/freeTruck");
        const MergedSchedule = require("../models/mergedSchedule");

        // 2. Identify and exclude released / free trucks
        const allFreeTrucks = await FreeTruck.find();
        const freeTruckIds = new Set(allFreeTrucks.map(ft => ft.truckId.toString()));

        // 3. Map active accepted carrier schedules for live routes & loads
        const allAcceptedSchedules = await MergedSchedule.find({ status: 'accepted' });
        const carrierScheduleMap = new Map();
        allAcceptedSchedules.forEach(s => carrierScheduleMap.set(s.transportationTruckId, s));

        // 4. Build available trucks with live routes and loads
        const allRoutes = await Route.find();
        const allTrucks = await Truck.find();

        const truckMap = new Map();
        allTrucks.forEach(t => {
            const tid = t._id.toString();
            if (!freeTruckIds.has(tid)) {
                truckMap.set(tid, { truck: t, route: null, schedule: carrierScheduleMap.get(tid) || null });
            }
        });

        allRoutes.forEach(r => {
            const tid = r.truckId.toString();
            const e = truckMap.get(tid);
            if (e) e.route = r;
        });

        const availableTrucks = Array.from(truckMap.values()).map(e => {
            const truck = e.truck;
            const sched = e.schedule;
            const stops = sched ? sched.stops : (e.route ? e.route.stops : []);
            const currentLoad = sched ? (sched.finalCurrentLoad || []) : (truck.currentLoad || []);
            const totalCapacity = sched ? (sched.totalCapacity || truck.totalCapacity) : truck.totalCapacity;
            const remainingLoad = currentLoad.map(l => Math.max(totalCapacity - l, 0));

            return {
                truck,
                route: e.route,
                stops,
                currentLoad,
                remainingLoad,
                totalCapacity,
            };
        }).filter(e => e.stops && e.stops.length > 0);

        const usedTruckIds = new Set();
        const traderMergedData = [];

        for (const request of pending) {
            // Find a truck whose route covers trader's source -> destination in forward order with capacity
            const matchIdx = availableTrucks.findIndex(e => {
                if (usedTruckIds.has(e.truck._id.toString())) return false;

                const sIdx = e.stops.indexOf(request.source);
                const dIdx = e.stops.indexOf(request.destination);
                if (sIdx === -1 || dIdx === -1 || sIdx >= dIdx) return false;

                // Validate intermediate stops appear in strictly forward order
                let lastStopIdx = sIdx - 1;
                for (let i = 0; i < request.stops.length; i++) {
                    const stopName = request.stops[i];
                    const idx = e.stops.indexOf(stopName);
                    if (idx === -1 || idx <= lastStopIdx || idx > dIdx) return false;
                    lastStopIdx = idx;

                    // Validate segment capacity at each stop
                    const addLoad = request.load[i] || 0;
                    const curLoad = e.currentLoad[idx] || 0;
                    if (curLoad + addLoad > e.totalCapacity) {
                        return false;
                    }
                }

                return true;
            });

            if (matchIdx !== -1) {
                const matched = availableTrucks[matchIdx];
                usedTruckIds.add(matched.truck._id.toString());

                traderMergedData.push({
                    traderRequestId:   request._id.toString(),
                    traderName:        request.traderId?.name  || "Unknown Trader",
                    traderEmail:       request.traderId?.emailId || "",
                    truckId:           matched.truck._id.toString(),
                    licensePlate:      matched.truck.licensePlate,
                    truckTotalCapacity: matched.totalCapacity,
                    truckCurrentLoad:  matched.currentLoad,
                    truckRemainingLoad: matched.remainingLoad,
                    truckStops:        matched.stops,
                    load:              request.load,
                    source:            request.source,
                    destination:       request.destination,
                    stops:             request.stops,
                });
            } else {
                console.log(`No truck for: ${request._id} (${request.source} → ${request.destination})`);
            }
        }

        res.json({ traderMergedData });
    } catch (error) {
        console.error("Error analyzing traders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ─── POST /acceptTrader ───────────────────────────────────────────────────────
// Saves the merge AND updates the truck's currentLoad / remainingLoad in the DB.

traderRouter.post("/acceptTrader", adminAuth, async (req, res) => {
    try {
        const { traderRequestId, truckId, load, source, destination, stops, licensePlate,
                traderName, traderEmail } = req.body;

        if (!traderRequestId || !truckId || !licensePlate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Avoid duplicates
        if (await MergeableTrader.findOne({ traderRequestId })) {
            return res.status(400).json({ error: "Trader request already merged" });
        }

        // ── Update the truck's load ──────────────────────────────────────────
        const truck = await Truck.findById(truckId);
        if (truck) {
            const route = await Route.findOne({ truckId: truck._id });
            const MergedSchedule = require("../models/mergedSchedule");
            const activeCarrierSchedule = await MergedSchedule.findOne({
                transportationTruckId: truck._id.toString(),
                status: 'accepted'
            });

            const truckStops = activeCarrierSchedule ? activeCarrierSchedule.stops : (route ? route.stops : []);
            const baseCurrentLoad = activeCarrierSchedule ? (activeCarrierSchedule.finalCurrentLoad || []) : (truck.currentLoad || []);
            const capacity = activeCarrierSchedule ? (activeCarrierSchedule.totalCapacity || truck.totalCapacity) : truck.totalCapacity;

            const newCurrentLoad = [...baseCurrentLoad];

            // Segment-by-segment capacity validation
            for (let i = 0; i < stops.length; i++) {
                const stopName = stops[i];
                const truckIdx = truckStops.indexOf(stopName);
                const addLoad = load[i] || 0;

                if (truckIdx !== -1) {
                    const proposed = (newCurrentLoad[truckIdx] || 0) + addLoad;
                    if (proposed > capacity) {
                        return res.status(400).json({
                            error: `Capacity exceeded at stop "${stopName}": required ${proposed} kg exceeds truck capacity ${capacity} kg.`
                        });
                    }
                    newCurrentLoad[truckIdx] = proposed;
                }
            }

            const newRemainingLoad = newCurrentLoad.map(l => Math.max(capacity - l, 0));

            await Truck.findByIdAndUpdate(truckId, {
                currentLoad:   newCurrentLoad,
                remainingLoad: newRemainingLoad,
            });
        }

        // ── Save the accepted merge record ────────────────────────────────────
        const mergedEntry = await MergeableTrader.create({
            traderRequestId,
            truckId,
            load,
            source,
            destination,
            stops,
            licensePlate,
            status: "accepted",
        });

        // ── Also update the MergedSchedule snapshot for this truck ────────────
        const MergedSchedule = require("../models/mergedSchedule");
        const updatedTruck = await Truck.findById(truckId);
        if (updatedTruck) {
            const route = await Route.findOne({ truckId: updatedTruck._id });
            const truckStops = route ? route.stops : [];

            // Find any MergedSchedule entries that involve this truck
            const scheduleEntries = await MergedSchedule.find({
                $or: [
                    { transportationTruckId: truckId },
                    { "mergedFromTrucks.id": truckId }
                ]
            });

            for (const entry of scheduleEntries) {
                const newCurrentLoad = entry.stops.map(stop => {
                    const idx = truckStops.indexOf(stop);
                    return idx !== -1 ? (updatedTruck.currentLoad[idx] || 0) : 0;
                });
                const newRemainingLoad = entry.stops.map(stop => {
                    const idx = truckStops.indexOf(stop);
                    return idx !== -1 ? (updatedTruck.remainingLoad[idx] || 0) : 0;
                });
                await MergedSchedule.findByIdAndUpdate(entry._id, {
                    finalCurrentLoad: newCurrentLoad,
                    finalRemainingLoad: newRemainingLoad,
                    totalCapacity: updatedTruck.totalCapacity,
                });
            }
        }

        res.json({ message: "Trader merged successfully", mergedEntry });
    } catch (error) {
        console.error("Error accepting trader:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /rejectTrader ───────────────────────────────────────────────────────
// Records a rejection so the request never surfaces again.

traderRouter.post("/rejectTrader", adminAuth, async (req, res) => {
    try {
        const { traderRequestId } = req.body;
        if (!traderRequestId) {
            return res.status(400).json({ error: "Missing trader request ID" });
        }

        if (await MergeableTrader.findOne({ traderRequestId })) {
            return res.status(400).json({ error: "Already processed" });
        }

        await MergeableTrader.create({
            traderRequestId,
            status: "rejected",
        });

        res.json({ message: "Trader request rejected" });
    } catch (error) {
        console.error("Error rejecting trader:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /mergeAllTraders ────────────────────────────────────────────────────

traderRouter.post("/mergeAllTraders", adminAuth, async (req, res) => {
    try {
        const allTraderRequests = await TraderRequest.find().populate("traderId", "name emailId");
        const allRoutes = await Route.find();
        const allTrucks = await Truck.find();

        const truckMap = new Map();
        allTrucks.forEach(t => truckMap.set(t._id.toString(), { truck: t, route: null }));
        allRoutes.forEach(r => {
            const e = truckMap.get(r.truckId.toString());
            if (e) e.route = r;
        });
        const availableTrucks = Array.from(truckMap.values()).filter(
            e => e.route && e.route.stops.length > 0
        );

        // Track load changes per truck in memory to batch-update
        const truckLoadUpdates = new Map(); // truckId → { currentLoad, remainingLoad, stops }
        for (const { truck, route } of availableTrucks) {
            truckLoadUpdates.set(truck._id.toString(), {
                currentLoad:   [...truck.currentLoad],
                remainingLoad: [...truck.remainingLoad],
                stops:         route.stops,
            });
        }

        const usedTruckIds = new Set();
        let mergedCount = 0;
        const errors = [];

        for (const request of allTraderRequests) {
            try {
                if (await MergeableTrader.findOne({ traderRequestId: request._id.toString() })) continue;

                const matchIdx = availableTrucks.findIndex(e => {
                    if (usedTruckIds.has(e.truck._id.toString())) return false;
                    return e.route.stops.includes(request.source) &&
                           e.route.stops.includes(request.destination);
                });

                if (matchIdx !== -1) {
                    const matched = availableTrucks[matchIdx];
                    const tid = matched.truck._id.toString();
                    usedTruckIds.add(tid);

                    // Update in-memory load
                    const upd = truckLoadUpdates.get(tid);
                    for (let i = 0; i < request.stops.length; i++) {
                        const idx = upd.stops.indexOf(request.stops[i]);
                        if (idx !== -1) {
                            upd.currentLoad[idx]   += (request.load[i] || 0);
                            upd.remainingLoad[idx]  = Math.max(upd.remainingLoad[idx] - (request.load[i] || 0), 0);
                        }
                    }

                    await MergeableTrader.create({
                        traderRequestId: request._id.toString(),
                        truckId:    tid,
                        licensePlate: matched.truck.licensePlate,
                        load:        request.load,
                        source:      request.source,
                        destination: request.destination,
                        stops:       request.stops,
                        status:      "accepted",
                    });
                    mergedCount++;
                } else {
                    errors.push(`No truck for ${request._id} (${request.source} → ${request.destination})`);
                }
            } catch (err) {
                errors.push(`${request._id}: ${err.message}`);
            }
        }

        // Batch-write truck load updates
        for (const [tid, upd] of truckLoadUpdates) {
            await Truck.findByIdAndUpdate(tid, {
                currentLoad:   upd.currentLoad,
                remainingLoad: upd.remainingLoad,
            });
        }

        res.json({
            message: `Merged ${mergedCount} trader requests`,
            mergedCount,
            errors: errors.length ? errors : undefined,
        });
    } catch (error) {
        console.error("Error merging all traders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = traderRouter;
