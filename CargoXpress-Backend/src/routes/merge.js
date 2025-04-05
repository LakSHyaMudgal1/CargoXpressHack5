const express= require('express');
const mergeRouter=express.Router();
const Route = require('../models/route');
const Truck=require('../models/truck')
const {companyAuth, adminAuth} =  require('../middlewares/auth');
const MergeablePair =  require('../models/mergeablePair');
const MergedSchedule= require('../models/mergedSchedule');
const UnmergedTruck = require('../models/unmergedTruck');
const FreeTruck = require('../models/freeTruck')

mergeRouter.get('/mergeableSchedule', adminAuth, async (req, res) => {
    try {
        const allRoutes = await Route.find();
        const allTrucks = await Truck.find();

        if (allRoutes.length === 0 || allTrucks.length === 0) {
            return res.json({ message: "No trucks available" });
        }

        const truckRoutesMap = new Map();
        allRoutes.forEach(route => {
            truckRoutesMap.set(route.truckId.toString(), route.stops);
        });

        let usedTrucks = new Set();
        let mergeablePairs = [];
        let mergedTruckIds = new Set();

        for (let i = 0; i < allTrucks.length; i++) {
            if (usedTrucks.has(allTrucks[i]._id.toString())) continue;

            for (let j = 0; j < allTrucks.length; j++) {
                if (i === j || usedTrucks.has(allTrucks[j]._id.toString())) continue;

                const truckA = allTrucks[i];
                const truckB = allTrucks[j];

                const stopsA = truckRoutesMap.get(truckA._id.toString()) || [];
                const stopsB = truckRoutesMap.get(truckB._id.toString()) || [];

                let biggerTruck, smallerTruck, biggerStops, smallerStops;
                if (truckA.totalCapacity >= truckB.totalCapacity) {
                    biggerTruck = truckA;
                    smallerTruck = truckB;
                    biggerStops = stopsA;
                    smallerStops = stopsB;
                } else {
                    biggerTruck = truckB;
                    smallerTruck = truckA;
                    biggerStops = stopsB;
                    smallerStops = stopsA;
                }

                if (!smallerStops.every(stop => biggerStops.includes(stop))) continue;

                let canMerge = true;
                for (let stop of smallerStops) {
                    const indexBig = biggerStops.indexOf(stop);
                    const indexSmall = smallerStops.indexOf(stop);

                    if (indexBig === -1 || indexSmall === -1) continue;

                    if (biggerTruck.remainingLoad[indexBig] < smallerTruck.currentLoad[indexSmall]) {
                        canMerge = false;
                        break;
                    }
                }

                if (canMerge) {
                    mergeablePairs.push({
                        truckOneId: biggerTruck._id.toString(),
                        truckOneLicensePlate: biggerTruck.licensePlate,
                        truckOneStops: biggerStops,
                        truckTwoId: smallerTruck._id.toString(),
                        truckTwoLicensePlate: smallerTruck.licensePlate,
                        truckTwoStops: smallerStops
                    });

                    usedTrucks.add(biggerTruck._id.toString());
                    usedTrucks.add(smallerTruck._id.toString());
                    mergedTruckIds.add(biggerTruck._id.toString());
                    mergedTruckIds.add(smallerTruck._id.toString());
                    break;
                }
            }
        }

        if (mergeablePairs.length === 0) {
            return res.json({ message: "No mergeable truck pairs found" });
        }

        // Fetch existing pairs from the database
        const existingPairs = await MergeablePair.find();

        // Convert existing data to a Set for quick lookup
        const existingSet = new Set(existingPairs.map(pair => 
            `${pair.truckOneId}-${pair.truckTwoId}`
        ));

        // Filter out only the new pairs that are not in the database
        const newPairs = mergeablePairs.filter(pair => 
            !existingSet.has(`${pair.truckOneId}-${pair.truckTwoId}`)
        );

        if (newPairs.length > 0) {
            await MergeablePair.insertMany(newPairs);
        }

        // Fetch all merged pairs from the database
        const allMergedPairs = await MergeablePair.find();
        allMergedPairs.forEach(pair => {
            mergedTruckIds.add(pair.truckOneId.toString());
            mergedTruckIds.add(pair.truckTwoId.toString());
        });

        // Filter only the unmerged trucks
        const unmergedTrucks = allTrucks.filter(truck => !mergedTruckIds.has(truck._id.toString()));

        if (unmergedTrucks.length > 0) {
            const unmergedTrucksData = await Promise.all(
                unmergedTrucks.map(async (truck) => {
                    const route = await Route.findOne({ truckId: truck._id });
                    return {
                        truckId: truck._id,
                        licensePlate: truck.licensePlate,
                        totalCapacity: truck.totalCapacity,
                        currentLoad: truck.currentLoad,
                        source: route ? route.source : null,  // Add source
                        destination: route ? route.destination : null, // Add destination
                        stops: route ? route.stops : []  // Include stops
                    };
                })
            );
        
            await UnmergedTruck.deleteMany({});
            await UnmergedTruck.insertMany(unmergedTrucksData);
        }
        

        res.json({ mergeablePairs });

    } catch (error) {
        console.error("Error fetching mergeable trucks:", error);
        res.status(500).send(error.message);
    }
});

mergeRouter.get('/mergedSchedule', adminAuth, async (req, res) => {
    try {
        const mergeablePairs = await MergeablePair.find().populate('truckOneId').populate('truckTwoId');

        if (mergeablePairs.length === 0) {
            return res.json({ message: "No mergeable schedules found" });
        }

        let mergedSchedules = [];
        let freeTrucks = [];

        for (let pair of mergeablePairs) {
            const truckOne = pair.truckOneId;
            const truckTwo = pair.truckTwoId;

            if (!truckOne || !truckTwo) {
                continue;
            }

            let finalTruck = truckOne;
            let freeTruck = truckTwo;
            if (truckTwo.totalCapacity > truckOne.totalCapacity) {
                finalTruck = truckTwo;
                freeTruck = truckOne;
            }

            let totalCapacity = finalTruck.totalCapacity;
            let finalCurrentLoad = [];
            let finalRemainingLoad = [];

            let allStops = [...new Set([...(pair.truckOneStops || []), ...(pair.truckTwoStops || [])])];

            allStops.sort((a, b) => {
                let indexOne = pair.truckOneStops.indexOf(a);
                let indexTwo = pair.truckTwoStops.indexOf(a);
                let indexOneB = pair.truckOneStops.indexOf(b);
                let indexTwoB = pair.truckTwoStops.indexOf(b);

                return Math.min(indexOne !== -1 ? indexOne : Infinity, indexTwo !== -1 ? indexTwo : Infinity) -
                    Math.min(indexOneB !== -1 ? indexOneB : Infinity, indexTwoB !== -1 ? indexTwoB : Infinity);
            });

            for (let stop of allStops) {
                let indexOne = pair.truckOneStops.indexOf(stop);
                let indexTwo = pair.truckTwoStops.indexOf(stop);

                let loadOne = indexOne !== -1 ? (truckOne.currentLoad[indexOne] || 0) : 0;
                let loadTwo = indexTwo !== -1 ? (truckTwo.currentLoad[indexTwo] || 0) : 0;

                let totalCurrentLoadAtStop = loadOne + loadTwo;
                let remainingLoadAtStop = Math.max(totalCapacity - totalCurrentLoadAtStop, 0);

                finalCurrentLoad.push(totalCurrentLoadAtStop);
                finalRemainingLoad.push(remainingLoadAtStop);
            }

            let finalSource = allStops[0];
            let finalDestination = allStops[allStops.length - 1];

            mergedSchedules.push({
                transportationTruckId: finalTruck._id.toString(),
                transportationTruckLicensePlate: finalTruck.licensePlate,
                finalSource,
                finalDestination,
                stops: allStops,
                finalCurrentLoad,
                finalRemainingLoad
            });

            // Store free trucks to insert later
            if (!await FreeTruck.exists({ truckId: freeTruck._id })) {
                freeTrucks.push({
                    licensePlate: freeTruck.licensePlate,
                    companyId: freeTruck.companyId,
                    totalCapacity: freeTruck.totalCapacity,
                    truckId: freeTruck._id.toString()
                });
            }
        }

        if (mergedSchedules.length === 0) {
            return res.json({ message: "No valid merged schedules found" });
        }

        // Insert free trucks in bulk
        if (freeTrucks.length > 0) {
            await FreeTruck.insertMany(freeTrucks);
        }

        // Insert merged schedules in bulk, ensuring uniqueness
        await Promise.all(
            mergedSchedules.map(async (schedule) => {
                const exists = await MergedSchedule.exists({
                    transportationTruckId: schedule.transportationTruckId,
                    stops: schedule.stops,
                    finalCurrentLoad: schedule.finalCurrentLoad,
                    finalRemainingLoad: schedule.finalRemainingLoad
                });

                if (!exists) {
                    await MergedSchedule.create(schedule);
                }
            })
        );

        res.json({ mergedSchedules });

    } catch (error) {
        console.error("Error generating merged schedule:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




module.exports=mergeRouter;