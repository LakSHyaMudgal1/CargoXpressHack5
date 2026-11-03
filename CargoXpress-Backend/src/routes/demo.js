const express = require('express');
const demoRouter = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Truck = require('../models/truck');
const Route = require('../models/route');
const MergeablePair = require('../models/mergeablePair');
const MergedSchedule = require('../models/mergedSchedule');
const FreeTruck = require('../models/freeTruck');
const Driver = require('../models/driver');
const DriverAssignment = require('../models/driverAssignment');
const TransportCompany = require('../models/transportCompany');
const TripStopExecution = require('../models/tripStopExecution');
const MergeDecisionLog = require('../models/mergeDecisionLog');

const mergeRouter = require('./merge');
const {
    generateMergeablePairs,
    executeAcceptPair,
    buildMergedData,
} = mergeRouter;

/**
 * Clean up all demo records strictly matching the DEMO prefix
 */
async function cleanupDemoRecords() {
    const demoTrucks = await Truck.find({ licensePlate: /^DEMO-/ });
    const demoTruckIds = demoTrucks.map(t => t._id);

    await Promise.all([
        Truck.deleteMany({ licensePlate: /^DEMO-/ }),
        Route.deleteMany({ truckId: { $in: demoTruckIds } }),
        FreeTruck.deleteMany({ licensePlate: /^DEMO-/ }),
        MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^DEMO-/ }),
        MergeablePair.deleteMany({
            $or: [
                { truckOneLicensePlate: /^DEMO-/ },
                { truckTwoLicensePlate: /^DEMO-/ }
            ]
        }),
        Driver.deleteMany({ emailId: /^demo-.*@cargoxpress\.com$/ }),
        TransportCompany.deleteMany({ emailId: /^demo-.*@cargoxpress\.com$/ }),
        DriverAssignment.deleteMany({ truckId: { $in: demoTruckIds } }),
        TripStopExecution.deleteMany({ truckLicensePlate: /^DEMO-/ }),
        MergeDecisionLog.deleteMany({ carrierTruckLicensePlate: /^DEMO-/ })
    ]);
}

// ─── GET /demo/status ────────────────────────────────────────────────────────
demoRouter.get('/status', async (req, res) => {
    try {
        const demoTrucks = await Truck.find({ licensePlate: /^DEMO-/ });
        const demoPairs = await MergeablePair.find({
            $or: [{ truckOneLicensePlate: /^DEMO-/ }, { truckTwoLicensePlate: /^DEMO-/ }]
        });
        const demoSchedules = await MergedSchedule.find({ transportationTruckLicensePlate: /^DEMO-/ });
        const demoFreeTrucks = await FreeTruck.find({ licensePlate: /^DEMO-/ });
        const demoExecution = await TripStopExecution.findOne({ truckLicensePlate: /^DEMO-/ });

        let currentStep = 0;
        let stepDescription = "Demo not initialized. Click 'Initialize Guided Scenario'.";

        if (demoTrucks.length > 0) {
            currentStep = 1;
            stepDescription = "Truck A and Truck B registered with compatible corridors.";

            if (demoPairs.length > 0) {
                currentStep = 2;
                stepDescription = "Algorithmic optimizer detected candidate merge pair.";
            }

            const activeSched = demoSchedules.find(s => s.status === 'accepted');
            if (activeSched) {
                const absorbedCount = activeSched.mergedFromTrucks?.filter(t => t.role === 'absorbed')?.length || 0;
                if (absorbedCount === 1) {
                    currentStep = 4;
                    stepDescription = "First merge approved. Truck A absorbed Truck B; Truck B in FreeTruck pool.";
                    if (demoTrucks.some(t => t.licensePlate === 'DEMO-TRUCK-C')) {
                        currentStep = 5;
                        stepDescription = "Truck C staged. Multi-stage merge opportunity available.";
                    }
                } else if (absorbedCount >= 2) {
                    currentStep = 6;
                    stepDescription = "Multi-stage merge complete. Truck A carrying Truck A + B + C.";
                }

                if (demoExecution) {
                    const completedStops = demoExecution.stops.filter(s => s.status === 'completed').length;
                    if (completedStops > 0) {
                        currentStep = 7;
                        stepDescription = `Driver progressing stops: ${completedStops} of ${demoExecution.stops.length} completed.`;
                    }
                    if (completedStops >= demoExecution.stops.length) {
                        currentStep = 8;
                        stepDescription = "All delivery milestones completed with verified proof of delivery.";
                    }
                }
            }
        }

        res.json({
            isInitialized: demoTrucks.length > 0,
            currentStep,
            stepDescription,
            metrics: {
                trucksCount: demoTrucks.length,
                pendingPairsCount: demoPairs.length,
                mergedSchedulesCount: demoSchedules.length,
                freeTrucksCount: demoFreeTrucks.length,
                stopsCompleted: demoExecution ? demoExecution.stops.filter(s => s.status === 'completed').length : 0,
                totalStops: demoExecution ? demoExecution.stops.length : 0,
            },
            demoTrucks,
            demoPairs,
            demoSchedules,
            demoFreeTrucks,
        });
    } catch (err) {
        console.error("Error in /demo/status:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/setup ────────────────────────────────────────────────────────
demoRouter.post('/setup', async (req, res) => {
    try {
        await cleanupDemoRecords();

        const pw = await bcrypt.hash("DemoPassword123!", 10);

        // 1. Create Demo Transport Company
        const company = await TransportCompany.create({
            name: "DEMO Express Logistics",
            emailId: "demo-company@cargoxpress.com",
            password: pw,
            address: "Mumbai Central Freight Terminal, India",
            registrationNumber: "DEMO-REG-001",
        });

        // 2. Create Demo Driver
        const driver = await Driver.create({
            name: "DEMO Driver Rajesh",
            emailId: "demo-driver@cargoxpress.com",
            password: pw,
            phone: "+919999000001",
            licenseNumber: "DEMO-LIC-9999",
            companyId: company._id,
            status: "on_duty",
        });

        // 3. Create Truck A (Primary Carrier Corridor)
        // Mumbai → Surat → Vadodara → Ahmedabad → Rajkot (12,000 kg cap)
        const truckA = await Truck.create({
            companyId: company._id,
            licensePlate: "DEMO-TRUCK-A",
            totalCapacity: 12000,
            currentLoad: [2500, 2000, 1800, 1500, 1200],
            remainingLoad: [9500, 10000, 10200, 10500, 10800],
        });

        await Route.create({
            companyId: company._id,
            truckId: truckA._id,
            source: "Mumbai",
            destination: "Rajkot",
            stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"],
        });

        // Assign driver to Truck A
        await DriverAssignment.create({
            driverId: driver._id,
            truckId: truckA._id,
            companyId: company._id,
            status: "active",
        });

        // 4. Create Truck B (Secondary Compatible Candidate)
        // Mumbai → Surat → Vadodara → Ahmedabad (5,000 kg cap - subset of Truck A)
        const truckB = await Truck.create({
            companyId: company._id,
            licensePlate: "DEMO-TRUCK-B",
            totalCapacity: 5000,
            currentLoad: [1500, 1200, 1000, 800],
            remainingLoad: [3500, 3800, 4000, 4200],
        });

        await Route.create({
            companyId: company._id,
            truckId: truckB._id,
            source: "Mumbai",
            destination: "Ahmedabad",
            stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"],
        });

        // 5. Run optimizer to discover candidate pair
        const pairs = await generateMergeablePairs();
        const demoPair = pairs.find(
            p => (p.truckOneLicensePlate === 'DEMO-TRUCK-A' && p.truckTwoLicensePlate === 'DEMO-TRUCK-B') ||
                 (p.truckOneLicensePlate === 'DEMO-TRUCK-B' && p.truckTwoLicensePlate === 'DEMO-TRUCK-A')
        );

        res.json({
            step: 1,
            message: "Demonstration scenario successfully initialized. Truck A and Truck B registered and paired.",
            truckA: {
                licensePlate: truckA.licensePlate,
                capacity: truckA.totalCapacity,
                stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"],
                loads: truckA.currentLoad,
            },
            truckB: {
                licensePlate: truckB.licensePlate,
                capacity: truckB.totalCapacity,
                stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"],
                loads: truckB.currentLoad,
            },
            pairId: demoPair ? demoPair._id : null,
            candidatePair: demoPair,
        });
    } catch (err) {
        console.error("Error in /demo/setup:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/first-merge ──────────────────────────────────────────────────
demoRouter.post('/first-merge', async (req, res) => {
    try {
        const demoPairs = await MergeablePair.find({
            $or: [
                { truckOneLicensePlate: 'DEMO-TRUCK-A', truckTwoLicensePlate: 'DEMO-TRUCK-B' },
                { truckOneLicensePlate: 'DEMO-TRUCK-B', truckTwoLicensePlate: 'DEMO-TRUCK-A' },
            ]
        });

        if (!demoPairs.length) {
            return res.status(404).json({ error: "Candidate pair DEMO-TRUCK-A + DEMO-TRUCK-B not found or already merged." });
        }

        const pair = demoPairs[0];
        const mergedSchedule = await executeAcceptPair(pair._id);

        res.json({
            step: 2,
            message: "First merge approved. DEMO-TRUCK-A is now primary carrier. DEMO-TRUCK-B released to FreeTruck pool.",
            mergedSchedule,
            freedTruck: "DEMO-TRUCK-B",
        });
    } catch (err) {
        console.error("Error in /demo/first-merge:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/stage-truck-c ────────────────────────────────────────────────
demoRouter.post('/stage-truck-c', async (req, res) => {
    try {
        const company = await TransportCompany.findOne({ emailId: "demo-company@cargoxpress.com" });
        if (!company) {
            return res.status(404).json({ error: "Demo company not found. Run /demo/setup first." });
        }

        // If Truck C already exists, remove it first to allow clean restaging
        const existingC = await Truck.findOne({ licensePlate: "DEMO-TRUCK-C" });
        if (existingC) {
            await Route.deleteMany({ truckId: existingC._id });
            await Truck.deleteOne({ _id: existingC._id });
        }

        // Create Truck C (Surat → Vadodara → Ahmedabad, 4,000 kg cap)
        const truckC = await Truck.create({
            companyId: company._id,
            licensePlate: "DEMO-TRUCK-C",
            totalCapacity: 4000,
            currentLoad: [1200, 900, 600],
            remainingLoad: [2800, 3100, 3400],
        });

        await Route.create({
            companyId: company._id,
            truckId: truckC._id,
            source: "Surat",
            destination: "Ahmedabad",
            stops: ["Surat", "Vadodara", "Ahmedabad"],
        });

        // Run optimizer - it will discover that Carrier Truck A has headroom to absorb Truck C!
        const pairs = await generateMergeablePairs();
        const multiStagePair = pairs.find(
            p => (p.truckOneLicensePlate === 'DEMO-TRUCK-A' && p.truckTwoLicensePlate === 'DEMO-TRUCK-C') ||
                 (p.truckOneLicensePlate === 'DEMO-TRUCK-C' && p.truckTwoLicensePlate === 'DEMO-TRUCK-A')
        );

        res.json({
            step: 3,
            message: "DEMO-TRUCK-C registered. Algorithmic optimizer discovered subsequent merge opportunity with active carrier DEMO-TRUCK-A.",
            truckC: {
                licensePlate: truckC.licensePlate,
                capacity: truckC.totalCapacity,
                stops: ["Surat", "Vadodara", "Ahmedabad"],
                loads: truckC.currentLoad,
            },
            multiStagePair,
        });
    } catch (err) {
        console.error("Error in /demo/stage-truck-c:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/second-merge ─────────────────────────────────────────────────
demoRouter.post('/second-merge', async (req, res) => {
    try {
        const demoPairs = await MergeablePair.find({
            $or: [
                { truckOneLicensePlate: 'DEMO-TRUCK-A', truckTwoLicensePlate: 'DEMO-TRUCK-C' },
                { truckOneLicensePlate: 'DEMO-TRUCK-C', truckTwoLicensePlate: 'DEMO-TRUCK-A' },
            ]
        });

        if (!demoPairs.length) {
            return res.status(404).json({ error: "Candidate pair DEMO-TRUCK-A + DEMO-TRUCK-C not found or already merged." });
        }

        const pair = demoPairs[0];
        const mergedSchedule = await executeAcceptPair(pair._id);

        res.json({
            step: 4,
            message: "Subsequent merge approved! DEMO-TRUCK-A has consolidated both DEMO-TRUCK-B and DEMO-TRUCK-C shipments.",
            mergedSchedule,
            manifestCount: mergedSchedule.mergedFromTrucks?.length || 0,
            manifest: mergedSchedule.mergedFromTrucks,
        });
    } catch (err) {
        console.error("Error in /demo/second-merge:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/driver-advance ───────────────────────────────────────────────
demoRouter.post('/driver-advance', async (req, res) => {
    try {
        const truckA = await Truck.findOne({ licensePlate: "DEMO-TRUCK-A" });
        if (!truckA) {
            return res.status(404).json({ error: "DEMO-TRUCK-A not found." });
        }

        const activeSched = await MergedSchedule.findOne({
            transportationTruckLicensePlate: "DEMO-TRUCK-A",
            status: "accepted"
        });

        const tripId = activeSched ? activeSched._id.toString() : truckA._id.toString();
        const stops = activeSched ? activeSched.stops : ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"];

        const driver = await Driver.findOne({ emailId: "demo-driver@cargoxpress.com" });
        const company = await TransportCompany.findOne({ emailId: "demo-company@cargoxpress.com" });

        // Retrieve or initialize execution manifest
        let execution = await TripStopExecution.findOne({ tripId });
        if (!execution) {
            execution = await TripStopExecution.getOrCreateExecution({
                tripId,
                tripType: activeSched ? 'MergedSchedule' : 'Route',
                truckId: truckA._id.toString(),
                truckLicensePlate: "DEMO-TRUCK-A",
                driverId: driver ? driver._id.toString() : null,
                driverName: driver ? driver.name : "DEMO Driver Rajesh",
                companyId: company ? company._id.toString() : null,
            });
        }

        // Find the next incomplete stop
        let targetIndex = execution.stops.findIndex(s => s.status !== 'completed');
        if (targetIndex === -1) {
            return res.json({
                step: 5,
                message: "All stops along the corridor have already been completed.",
                execution,
                isAllCompleted: true,
            });
        }

        const stop = execution.stops[targetIndex];
        const stopName = stop.stopName;

        // Perform authoritative FSM transition to 'completed' with proof of delivery
        stop.status = 'completed';
        stop.completedAt = new Date();
        stop.arrivedAt = stop.arrivedAt || new Date(Date.now() - 30 * 60 * 1000);
        stop.proofOfDelivery = {
            type: 'otp',
            otpCode: '849201',
            submittedAt: new Date(),
        };
        stop.recipient = {
            name: "Terminal Receiver",
            phone: "+919876543210",
            notes: "Verified consignment condition intact. Proof of delivery logged."
        };

        // If there is a next stop, set it to en_route
        if (targetIndex + 1 < execution.stops.length) {
            execution.stops[targetIndex + 1].status = 'en_route';
            execution.currentStopIndex = targetIndex + 1;
        } else {
            execution.currentStopIndex = targetIndex;
            execution.status = 'completed';
        }

        await execution.save();

        res.json({
            step: 5,
            message: `Stop #${targetIndex + 1} (${stopName}) successfully completed with verified proof of delivery.`,
            completedStopIndex: targetIndex,
            completedStopName: stopName,
            nextStopIndex: execution.currentStopIndex,
            totalStops: execution.stops.length,
            isAllCompleted: execution.status === 'completed',
            execution,
        });
    } catch (err) {
        console.error("Error in /demo/driver-advance:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /demo/reset ────────────────────────────────────────────────────────
demoRouter.post('/reset', async (req, res) => {
    try {
        await cleanupDemoRecords();
        res.json({
            message: "Demonstration records cleanly wiped. Shared production data and real fleet records are completely untouched.",
            isReset: true,
        });
    } catch (err) {
        console.error("Error in /demo/reset:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = demoRouter;
