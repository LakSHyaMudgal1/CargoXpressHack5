const express = require('express');
const mergeRouter = express.Router();
const Route = require('../models/route');
const Truck = require('../models/truck');
const { adminAuth } = require('../middlewares/auth');
const MergeablePair = require('../models/mergeablePair');
const MergedSchedule = require('../models/mergedSchedule');
const FreeTruck = require('../models/freeTruck');

// ─── helpers ────────────────────────────────────────────────────────────────

function buildMergedData(pair, truckOne, truckTwo) {
    let finalTruck = truckOne;
    let freeTruck = truckTwo;
    if (truckTwo.totalCapacity > truckOne.totalCapacity) {
        finalTruck = truckTwo;
        freeTruck = truckOne;
    }

    const totalCapacity = finalTruck.totalCapacity;

    // Union of stops, sorted by earliest appearance in either route
    let allStops = [...new Set([...(pair.truckOneStops || []), ...(pair.truckTwoStops || [])])];
    allStops.sort((a, b) => {
        const ia = Math.min(
            pair.truckOneStops.indexOf(a) >= 0 ? pair.truckOneStops.indexOf(a) : Infinity,
            pair.truckTwoStops.indexOf(a) >= 0 ? pair.truckTwoStops.indexOf(a) : Infinity
        );
        const ib = Math.min(
            pair.truckOneStops.indexOf(b) >= 0 ? pair.truckOneStops.indexOf(b) : Infinity,
            pair.truckTwoStops.indexOf(b) >= 0 ? pair.truckTwoStops.indexOf(b) : Infinity
        );
        return ia - ib;
    });

    const finalCurrentLoad = [];
    const finalRemainingLoad = [];

    for (const stop of allStops) {
        const i1 = pair.truckOneStops.indexOf(stop);
        const i2 = pair.truckTwoStops.indexOf(stop);
        const l1 = i1 !== -1 ? (truckOne.currentLoad[i1] || 0) : 0;
        const l2 = i2 !== -1 ? (truckTwo.currentLoad[i2] || 0) : 0;
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

// ─── GET /mergeableSchedule — find overlapping pairs, save & return with _id ─

mergeRouter.get('/mergeableSchedule', adminAuth, async (req, res) => {
    try {
        const allRoutes = await Route.find();
        const allTrucks = await Truck.find();

        if (!allRoutes.length || !allTrucks.length) {
            return res.json({ mergeablePairs: [] });
        }

        const truckRoutesMap = new Map();
        allRoutes.forEach(r => truckRoutesMap.set(r.truckId.toString(), r.stops));

        // Trucks that are already in a merged/rejected schedule — skip them
        const processedSchedules = await MergedSchedule.find();
        const processedTruckIds = new Set();
        processedSchedules.forEach(s => {
            processedTruckIds.add(s.transportationTruckId);
            if (s.mergedFromTrucks) {
                s.mergedFromTrucks.forEach(t => processedTruckIds.add(t.id));
            }
        });

        const usedTrucks = new Set();
        const newPairsToSave = [];

        // Find all already-saved pending pairs so we don't duplicate
        const existingPairs = await MergeablePair.find();
        const existingSet = new Set(existingPairs.map(p => `${p.truckOneId}-${p.truckTwoId}`));

        for (let i = 0; i < allTrucks.length; i++) {
            if (usedTrucks.has(allTrucks[i]._id.toString())) continue;
            // Skip trucks already processed (accepted or rejected)
            if (processedTruckIds.has(allTrucks[i]._id.toString())) continue;

            for (let j = 0; j < allTrucks.length; j++) {
                if (i === j || usedTrucks.has(allTrucks[j]._id.toString())) continue;
                // Skip trucks already processed
                if (processedTruckIds.has(allTrucks[j]._id.toString())) continue;

                const truckA = allTrucks[i];
                const truckB = allTrucks[j];
                const stopsA = truckRoutesMap.get(truckA._id.toString()) || [];
                const stopsB = truckRoutesMap.get(truckB._id.toString()) || [];

                // Determine bigger / smaller
                let bigger = truckA, smaller = truckB, biggerStops = stopsA, smallerStops = stopsB;
                if (truckB.totalCapacity > truckA.totalCapacity) {
                    bigger = truckB; smaller = truckA; biggerStops = stopsB; smallerStops = stopsA;
                }

                if (!smallerStops.length) continue;

                // All stops of smaller must appear in bigger
                if (!smallerStops.every(s => biggerStops.includes(s))) continue;

                // Capacity check at each shared stop
                let canMerge = true;
                for (const stop of smallerStops) {
                    const ibig = biggerStops.indexOf(stop);
                    const ismall = smallerStops.indexOf(stop);
                    if (bigger.remainingLoad[ibig] < smaller.currentLoad[ismall]) {
                        canMerge = false;
                        break;
                    }
                }

                if (canMerge) {
                    const key = `${bigger._id}-${smaller._id}`;
                    if (!existingSet.has(key)) {
                        newPairsToSave.push({
                            truckOneId: bigger._id,
                            truckOneLicensePlate: bigger.licensePlate,
                            truckOneStops: biggerStops,
                            truckTwoId: smaller._id,
                            truckTwoLicensePlate: smaller.licensePlate,
                            truckTwoStops: smallerStops,
                        });
                        existingSet.add(key);
                    }
                    usedTrucks.add(bigger._id.toString());
                    usedTrucks.add(smaller._id.toString());
                    break;
                }
            }
        }

        if (newPairsToSave.length) {
            await MergeablePair.insertMany(newPairsToSave);
        }

        // Return ALL saved pairs (with _id) so frontend can use _id for accept/reject
        const allPairs = await MergeablePair.find().sort({ createdAt: -1 });
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
            const liveCurrentLoad = schedule.stops.map(stop => {
                const idx = truckStops.indexOf(stop);
                return idx !== -1 ? (truck.currentLoad[idx] || 0) : 0;
            });
            const liveRemainingLoad = schedule.stops.map(stop => {
                const idx = truckStops.indexOf(stop);
                return idx !== -1 ? (truck.remainingLoad[idx] || 0) : 0;
            });

            return {
                ...schedule.toObject(),
                finalCurrentLoad: liveCurrentLoad,
                finalRemainingLoad: liveRemainingLoad,
                totalCapacity: truck.totalCapacity,
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
        const pair = await MergeablePair.findById(req.params.id)
            .populate('truckOneId')
            .populate('truckTwoId');

        if (!pair) return res.status(404).json({ error: "Pair not found" });

        const truckOne = pair.truckOneId;
        const truckTwo = pair.truckTwoId;
        if (!truckOne || !truckTwo) return res.status(400).json({ error: "Invalid truck data" });

        const { finalTruck, freeTruck, totalCapacity, allStops,
            finalCurrentLoad, finalRemainingLoad, finalSource, finalDestination } =
            buildMergedData(pair, truckOne, truckTwo);

        if (!finalSource || !finalDestination) {
            return res.status(400).json({ error: "Invalid route data" });
        }

        const mergedSchedule = await MergedSchedule.create({
            transportationTruckId: finalTruck._id.toString(),
            transportationTruckLicensePlate: finalTruck.licensePlate,
            mergedFromTrucks: [
                { licensePlate: truckOne.licensePlate, id: truckOne._id.toString() },
                { licensePlate: truckTwo.licensePlate, id: truckTwo._id.toString() },
            ],
            finalSource,
            finalDestination,
            stops: allStops,
            finalCurrentLoad,
            finalRemainingLoad,
            totalCapacity,
            status: 'accepted',
        });

        // Reserve the smaller truck
        if (!await FreeTruck.exists({ truckId: freeTruck._id })) {
            await FreeTruck.create({
                licensePlate: freeTruck.licensePlate,
                companyId: freeTruck.companyId,
                totalCapacity: freeTruck.totalCapacity,
                truckId: freeTruck._id.toString(),
            });
        }

        await MergeablePair.findByIdAndDelete(req.params.id);
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

        // Save both as independent schedules so they appear on the merged schedule page
        const makeIndependentSchedule = async (truck, stops) => {
            if (!stops || !stops.length) return;
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
        const allPairs = await MergeablePair.find()
            .populate('truckOneId').populate('truckTwoId');

        if (!allPairs.length) return res.json({ message: "No pairs to merge", mergedCount: 0 });

        let mergedCount = 0;
        const errors = [];

        for (const pair of allPairs) {
            try {
                const truckOne = pair.truckOneId;
                const truckTwo = pair.truckTwoId;
                if (!truckOne || !truckTwo) { errors.push(`Bad truck data for ${pair._id}`); continue; }

                const { finalTruck, freeTruck, totalCapacity, allStops,
                    finalCurrentLoad, finalRemainingLoad, finalSource, finalDestination } =
                    buildMergedData(pair, truckOne, truckTwo);

                if (!finalSource || !finalDestination) { errors.push(`Bad route for ${pair._id}`); continue; }

                await MergedSchedule.create({
                    transportationTruckId: finalTruck._id.toString(),
                    transportationTruckLicensePlate: finalTruck.licensePlate,
                    mergedFromTrucks: [
                        { licensePlate: truckOne.licensePlate, id: truckOne._id.toString() },
                        { licensePlate: truckTwo.licensePlate, id: truckTwo._id.toString() },
                    ],
                    finalSource, finalDestination, stops: allStops,
                    finalCurrentLoad, finalRemainingLoad, totalCapacity,
                    status: 'accepted',
                });

                if (!await FreeTruck.exists({ truckId: freeTruck._id })) {
                    await FreeTruck.create({
                        licensePlate: freeTruck.licensePlate,
                        companyId: freeTruck.companyId,
                        totalCapacity: freeTruck.totalCapacity,
                        truckId: freeTruck._id.toString(),
                    });
                }

                await MergeablePair.findByIdAndDelete(pair._id);
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

module.exports = mergeRouter;
