const express = require("express");
const traderRouter = express.Router();
const UnmergedTruck = require("../models/unmergedTruck");
const FreeTruck = require("../models/freeTruck");
const TraderRequest = require("../models/traderRequest");
const TraderMerged = require("../models/TraderMerged");
const { companyAuth, adminAuth } = require("../middlewares/auth");
const MergeableTrader = require("../models/mergeableTrader")

// Route to handle trader truck merging
traderRouter.get("/mergedTrader", adminAuth, async (req, res) => {
    try {
        const traderRequests = await TraderRequest.find();
        let unmergedTrucks = await UnmergedTruck.find();
        let freeTrucks = await FreeTruck.find();
        let traderMergedData = [];

        for (let request of traderRequests) {
            // Find an available truck that matches the source and destination
            let assignedTruckIndex = unmergedTrucks.findIndex(truck => 
                truck.stops.includes(request.source) && truck.stops.includes(request.destination)
            );

            let assignedTruck = null;

            if (assignedTruckIndex !== -1) {
                // Remove the truck from the array to ensure it's not assigned again
                assignedTruck = unmergedTrucks.splice(assignedTruckIndex, 1)[0];
            } else if (freeTrucks.length > 0) {
                // Assign a free truck if no unmerged truck is available
                assignedTruck = freeTrucks.shift();
            }

            if (assignedTruck) {
                console.log("Assigned truck:", assignedTruck);

                const mergedEntry = {
                    truckId: assignedTruck.truckId,
                    load: request.load,
                    source: request.source,
                    destination: request.destination,
                    stops: request.stops, // Ensure request.stops is correctly structured
                    licensePlate: assignedTruck.licensePlate
                };

                traderMergedData.push(mergedEntry);
            } else {
                console.log(`No available truck found for request: ${request._id}`);
            }
        }

        if (traderMergedData.length > 0) {
            await MergeableTrader.insertMany(traderMergedData);
        }

        res.json({ message: "Traders merged successfully", traderMergedData });
    } catch (error) {
        console.error("Error merging traders with trucks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = traderRouter;
