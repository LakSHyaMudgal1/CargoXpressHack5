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

        // Skip requests already accepted or rejected
        const alreadyProcessed = await MergeableTrader.find({}, "traderRequestId");
        const processedIds = new Set(alreadyProcessed.map(t => t.traderRequestId));

        const pending = allTraderRequests.filter(r => !processedIds.has(r._id.toString()));

        if (!pending.length) {
            return res.json({ message: "All trader requests have been processed", traderMergedData: [] });
        }

        // Build truckId → { truck, route }
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

        const usedTruckIds = new Set();
        const traderMergedData = [];

        for (const request of pending) {
            // Find a truck whose route fully covers trader's source → destination
            const matchIdx = availableTrucks.findIndex(e => {
                if (usedTruckIds.has(e.truck._id.toString())) return false;
                return e.route.stops.includes(request.source) &&
                       e.route.stops.includes(request.destination);
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
                    truckTotalCapacity: matched.truck.totalCapacity,
                    truckCurrentLoad:  matched.truck.currentLoad,
                    truckRemainingLoad: matched.truck.remainingLoad,
                    truckStops:        matched.route.stops,
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
            const truckStops = route ? route.stops : [];

            const newCurrentLoad  = [...truck.currentLoad];
            const newRemainingLoad = [...truck.remainingLoad];

            // For each stop in the trader's request, add the trader's load to the
            // corresponding index in the truck's stops array.
            for (let i = 0; i < stops.length; i++) {
                const stopName  = stops[i];
                const truckIdx  = truckStops.indexOf(stopName);
                const addLoad   = load[i] || 0;

                if (truckIdx !== -1) {
                    newCurrentLoad[truckIdx]   = (newCurrentLoad[truckIdx]  || 0) + addLoad;
                    newRemainingLoad[truckIdx] = Math.max(
                        (newRemainingLoad[truckIdx] || 0) - addLoad, 0
                    );
                }
            }

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
