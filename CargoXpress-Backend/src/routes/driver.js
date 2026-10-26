const express = require('express');
const driverRouter = express.Router();
const mongoose = require('mongoose');

const Driver = require('../models/driver');
const DriverAssignment = require('../models/driverAssignment');
const Truck = require('../models/truck');
const Route = require('../models/route');
const MergedSchedule = require('../models/mergedSchedule');
const MergeablePair = require('../models/mergeablePair');
const TransportCompany = require('../models/transportCompany');
const MergeDecisionLog = require('../models/mergeDecisionLog');
const { executeAcceptPair, buildMergedData } = require('./merge');

const { driverAuth, companyAuth, adminAuth } = require('../middlewares/auth');

// ─── DRIVER SELF-SERVICE ENDPOINTS (Requires driverAuth) ─────────────────────

/**
 * GET /driver/me
 * Retrieves current driver profile.
 */
driverRouter.get('/driver/me', driverAuth, async (req, res) => {
    try {
        const driver = req.driver;
        const activeAssignment = await DriverAssignment.getActiveForDriver(driver._id);

        res.json({
            driver: {
                _id: driver._id,
                name: driver.name,
                emailId: driver.emailId,
                phone: driver.phone,
                licenseNumber: driver.licenseNumber,
                status: driver.status,
                companyId: driver.companyId,
                photoUrl: driver.photoUrl,
                assignedTruck: activeAssignment ? {
                    assignmentId: activeAssignment._id,
                    truckId: activeAssignment.truckId._id,
                    licensePlate: activeAssignment.truckId.licensePlate,
                    assignedAt: activeAssignment.assignedAt
                } : null
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch driver profile: " + err.message });
    }
});

/**
 * GET /driver/assignment
 * Retrieves driver's active vehicle assignment.
 */
driverRouter.get('/driver/assignment', driverAuth, async (req, res) => {
    try {
        const assignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!assignment) {
            return res.json({ assignment: null, message: "No active vehicle assignment found." });
        }

        res.json({
            assignment: {
                id: assignment._id,
                status: assignment.status,
                assignedAt: assignment.assignedAt,
                notes: assignment.notes,
                truck: {
                    id: assignment.truckId._id,
                    licensePlate: assignment.truckId.licensePlate,
                    totalCapacity: assignment.truckId.totalCapacity,
                    currentLoad: assignment.truckId.currentLoad,
                    remainingLoad: assignment.truckId.remainingLoad
                }
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch assignment: " + err.message });
    }
});

/**
 * GET /driver/active-trip
 * Resolves the active route/schedule for the driver's currently assigned vehicle.
 */
driverRouter.get('/driver/active-trip', driverAuth, async (req, res) => {
    try {
        const assignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!assignment || !assignment.truckId) {
            return res.json({ trip: null, message: "No active vehicle assigned to this driver." });
        }

        const truck = assignment.truckId;
        const truckIdStr = truck._id.toString();

        // 1. Check for consolidated MergedSchedule where truck is active carrier
        const mergedSchedule = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });

        if (mergedSchedule) {
            return res.json({
                assignmentId: assignment._id,
                truck: {
                    id: truck._id,
                    licensePlate: truck.licensePlate,
                    totalCapacity: mergedSchedule.totalCapacity || truck.totalCapacity
                },
                trip: {
                    id: mergedSchedule._id,
                    type: 'MergedSchedule',
                    origin: mergedSchedule.finalSource,
                    destination: mergedSchedule.finalDestination,
                    stops: mergedSchedule.stops,
                    currentLoad: mergedSchedule.finalCurrentLoad,
                    remainingLoad: mergedSchedule.finalRemainingLoad,
                    manifest: mergedSchedule.mergedFromTrucks.map(m => ({
                        truckId: m.id,
                        licensePlate: m.licensePlate,
                        stops: m.stops,
                        load: m.load,
                        role: m.role
                    }))
                }
            });
        }

        // 2. Check for original scheduled Route
        const route = await Route.findOne({ truckId: truck._id });
        if (route) {
            return res.json({
                assignmentId: assignment._id,
                truck: {
                    id: truck._id,
                    licensePlate: truck.licensePlate,
                    totalCapacity: truck.totalCapacity
                },
                trip: {
                    id: route._id,
                    type: 'Route',
                    origin: route.source,
                    destination: route.destination,
                    stops: route.stops,
                    currentLoad: truck.currentLoad,
                    remainingLoad: truck.remainingLoad,
                    manifest: [{
                        truckId: truck._id.toString(),
                        licensePlate: truck.licensePlate,
                        stops: route.stops,
                        load: truck.currentLoad,
                        role: 'carrier'
                    }]
                }
            });
        }

        return res.json({
            assignmentId: assignment._id,
            truck: {
                id: truck._id,
                licensePlate: truck.licensePlate,
                totalCapacity: truck.totalCapacity
            },
            trip: null,
            message: "Vehicle is assigned, but no active route or delivery is currently scheduled."
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch active trip: " + err.message });
    }
});

/**
 * GET /driver/trips
 * Retrieves current and previous trip assignment history for this driver.
 */
driverRouter.get('/driver/trips', driverAuth, async (req, res) => {
    try {
        const assignments = await DriverAssignment.find({ driverId: req.driver._id })
            .sort({ assignedAt: -1 })
            .populate('truckId');

        res.json({
            assignments: assignments.map(a => ({
                id: a._id,
                status: a.status,
                assignedAt: a.assignedAt,
                endedAt: a.endedAt,
                truck: a.truckId ? {
                    id: a.truckId._id,
                    licensePlate: a.truckId.licensePlate,
                    totalCapacity: a.truckId.totalCapacity
                } : null
            }))
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch trip history: " + err.message });
    }
});

/**
 * GET /driver/trip-details/:tripId
 * Retrieves detailed stops and manifest for a specific trip, with strict driver assignment authorization.
 */
driverRouter.get('/driver/trip-details/:tripId', driverAuth, async (req, res) => {
    try {
        const { tripId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({ message: "Invalid trip ID format" });
        }

        // Verify driver has an active vehicle assignment
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const assignedTruckId = activeAssignment.truckId._id.toString();

        // Search in MergedSchedule first
        let trip = await MergedSchedule.findById(tripId);
        let tripType = 'MergedSchedule';

        if (trip) {
            if (trip.transportationTruckId !== assignedTruckId) {
                return res.status(403).json({ message: "Access denied. You are not assigned to this trip's vehicle." });
            }
            return res.json({
                trip: {
                    id: trip._id,
                    type: tripType,
                    status: trip.status,
                    origin: trip.finalSource,
                    destination: trip.finalDestination,
                    stops: trip.stops,
                    currentLoad: trip.finalCurrentLoad,
                    remainingLoad: trip.finalRemainingLoad,
                    totalCapacity: trip.totalCapacity,
                    manifest: trip.mergedFromTrucks
                }
            });
        }

        // Search in Route
        trip = await Route.findById(tripId);
        tripType = 'Route';

        if (trip) {
            if (trip.truckId.toString() !== assignedTruckId) {
                return res.status(403).json({ message: "Access denied. You are not assigned to this trip's vehicle." });
            }
            const truck = activeAssignment.truckId;
            return res.json({
                trip: {
                    id: trip._id,
                    type: tripType,
                    origin: trip.source,
                    destination: trip.destination,
                    stops: trip.stops,
                    currentLoad: truck.currentLoad,
                    remainingLoad: truck.remainingLoad,
                    totalCapacity: truck.totalCapacity
                }
            });
        }

        return res.status(404).json({ message: "Trip not found" });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch trip details: " + err.message });
    }
});

/**
 * GET /driver/merge-offers
 * Retrieves pending merge proposals that involve the driver's currently assigned vehicle,
 * populated with proposed consolidated stops, additional waypoints, and carrier role info.
 */
driverRouter.get('/driver/merge-offers', driverAuth, async (req, res) => {
    try {
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.json({ offers: [], message: "No active vehicle assigned." });
        }

        const truckId = activeAssignment.truckId._id;
        const truckIdStr = truckId.toString();

        const pairs = await MergeablePair.find({
            $or: [{ truckOneId: truckId }, { truckTwoId: truckId }]
        }).sort({ createdAt: -1 });

        const formattedOffers = [];

        for (const pair of pairs) {
            const isTruckOne = pair.truckOneId.toString() === truckIdStr;
            const myStops = isTruckOne ? pair.truckOneStops : pair.truckTwoStops;
            const partnerStops = isTruckOne ? pair.truckTwoStops : pair.truckOneStops;

            try {
                const truckOne = await Truck.findById(pair.truckOneId);
                const truckTwo = await Truck.findById(pair.truckTwoId);
                if (!truckOne || !truckTwo) continue;

                const existingSchedOne = await MergedSchedule.findOne({
                    transportationTruckId: truckOne._id.toString(),
                    status: 'accepted'
                });
                const existingSchedTwo = await MergedSchedule.findOne({
                    transportationTruckId: truckTwo._id.toString(),
                    status: 'accepted'
                });
                const activeCarrierSchedule = existingSchedOne || existingSchedTwo || null;

                const mergedData = buildMergedData(pair, truckOne, truckTwo, activeCarrierSchedule);
                const finalTruck = mergedData.finalTruck;
                const freeTruck = mergedData.freeTruck;
                const isCarrier = (truckIdStr === finalTruck._id.toString());
                const allStops = mergedData.allStops || [];
                const carrierStops = mergedData.carrierStops || [];
                const additionalStops = allStops.filter(s => !carrierStops.includes(s));

                formattedOffers.push({
                    pairId: pair._id,
                    isCarrier,
                    canAccept: isCarrier,
                    role: isCarrier ? 'carrier' : 'absorbed',
                    roleDescription: isCarrier
                        ? 'Your vehicle is the designated carrier for this consolidated shipment'
                        : 'Your vehicle cargo will be transferred to the carrier truck',
                    myTruck: {
                        id: truckId,
                        licensePlate: isTruckOne ? pair.truckOneLicensePlate : pair.truckTwoLicensePlate,
                        currentStops: myStops,
                        currentLoad: (isTruckOne ? truckOne.currentLoad : truckTwo.currentLoad) || [],
                        totalCapacity: isTruckOne ? truckOne.totalCapacity : truckTwo.totalCapacity
                    },
                    partnerTruck: {
                        id: isTruckOne ? pair.truckTwoId : pair.truckOneId,
                        licensePlate: isTruckOne ? pair.truckTwoLicensePlate : pair.truckOneLicensePlate,
                        stops: partnerStops,
                        load: (isTruckOne ? truckTwo.currentLoad : truckOne.currentLoad) || [],
                        totalCapacity: isTruckOne ? truckTwo.totalCapacity : truckOne.totalCapacity
                    },
                    proposedRoute: {
                        origin: allStops[0] || myStops[0],
                        destination: allStops[allStops.length - 1] || myStops[myStops.length - 1],
                        consolidatedStops: allStops,
                        additionalStops,
                        additionalStopsCount: additionalStops.length,
                        projectedCurrentLoad: mergedData.finalCurrentLoad,
                        projectedRemainingLoad: mergedData.finalRemainingLoad
                    },
                    incomingShipment: {
                        licensePlate: freeTruck.licensePlate,
                        origin: mergedData.absorbedStops[0] || "",
                        destination: mergedData.absorbedStops[mergedData.absorbedStops.length - 1] || "",
                        stops: mergedData.absorbedStops,
                        loadKg: mergedData.absorbedCurrentLoad
                    },
                    createdAt: pair.createdAt
                });
            } catch (err) {
                // If capacity or compatibility evaluation fails, display fallback card with details
                formattedOffers.push({
                    pairId: pair._id,
                    isCarrier: false,
                    canAccept: false,
                    feasible: false,
                    feasibilityError: err.message,
                    myTruck: {
                        id: truckId,
                        licensePlate: isTruckOne ? pair.truckOneLicensePlate : pair.truckTwoLicensePlate,
                        currentStops: myStops
                    },
                    partnerTruck: {
                        id: isTruckOne ? pair.truckTwoId : pair.truckOneId,
                        licensePlate: isTruckOne ? pair.truckTwoLicensePlate : pair.truckOneLicensePlate,
                        stops: partnerStops
                    },
                    createdAt: pair.createdAt
                });
            }
        }

        res.json({ offers: formattedOffers });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch merge offers: " + err.message });
    }
});

/**
 * POST /driver/merge-offers/:pairId/accept
 * Driver accepts taking on additional cargo from a compatible truck.
 * Requires driverAuth and verifies driver is actively assigned to the designated carrier vehicle.
 */
driverRouter.post('/driver/merge-offers/:pairId/accept', driverAuth, async (req, res) => {
    try {
        const { pairId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(pairId)) {
            return res.status(400).json({ message: "Invalid merge offer ID format" });
        }

        // 1. Verify driver has an active vehicle assignment
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const driverTruckId = activeAssignment.truckId._id.toString();

        // 2. Fetch pair proposal
        const pair = await MergeablePair.findById(pairId);
        if (!pair) {
            return res.status(409).json({
                message: "This merge offer has already been processed, expired, or is no longer available."
            });
        }

        // 3. Verify driver's vehicle is part of this pair
        if (pair.truckOneId.toString() !== driverTruckId && pair.truckTwoId.toString() !== driverTruckId) {
            return res.status(403).json({ message: "Access denied. You are not assigned to either vehicle in this proposed merge." });
        }

        // 4. Determine designated carrier vehicle
        const truckOne = await Truck.findById(pair.truckOneId);
        const truckTwo = await Truck.findById(pair.truckTwoId);
        if (!truckOne || !truckTwo) {
            return res.status(404).json({ message: "One or both vehicles in this pair no longer exist." });
        }

        const existingSchedOne = await MergedSchedule.findOne({
            transportationTruckId: truckOne._id.toString(),
            status: 'accepted'
        });
        const existingSchedTwo = await MergedSchedule.findOne({
            transportationTruckId: truckTwo._id.toString(),
            status: 'accepted'
        });
        const activeCarrierSchedule = existingSchedOne || existingSchedTwo || null;

        let finalTruck = truckOne;
        let freeTruck = truckTwo;
        if (truckTwo.totalCapacity > truckOne.totalCapacity) {
            finalTruck = truckTwo;
            freeTruck = truckOne;
        } else if (truckTwo.totalCapacity === truckOne.totalCapacity) {
            if (activeCarrierSchedule && activeCarrierSchedule.transportationTruckId === truckTwo._id.toString()) {
                finalTruck = truckTwo;
                freeTruck = truckOne;
            }
        }

        // 5. Decision Policy Enforcement: Only the carrier vehicle driver can accept the extra load
        if (driverTruckId !== finalTruck._id.toString()) {
            return res.status(403).json({
                message: `Only the carrier vehicle driver (${finalTruck.licensePlate}) is authorized to accept taking on this consolidated cargo.`
            });
        }

        // 6. Invoke canonical merge execution engine
        const mergedSchedule = await executeAcceptPair(pairId);

        // 7. Cleanly update absorbed truck driver assignment (freeTruck) to prevent dual conflicting active states
        await DriverAssignment.updateMany(
            { truckId: freeTruck._id, status: 'active' },
            {
                status: 'completed',
                endedAt: new Date(),
                notes: `Cargo absorbed into carrier truck ${finalTruck.licensePlate} (Driver: ${req.driver.name})`
            }
        );

        // 8. Log the decision for operational auditing
        await MergeDecisionLog.create({
            pairId: pairId.toString(),
            decision: 'accepted',
            decidedByRole: 'driver',
            driverId: req.driver._id,
            driverName: req.driver.name,
            carrierTruckId: finalTruck._id,
            carrierLicensePlate: finalTruck.licensePlate,
            absorbedTruckId: freeTruck._id,
            absorbedLicensePlate: freeTruck.licensePlate,
            notes: `Accepted by carrier driver ${req.driver.name}`
        });

        res.json({
            message: "Merge offer accepted successfully. Your schedule has been updated with the consolidated cargo.",
            mergedSchedule: {
                id: mergedSchedule._id,
                origin: mergedSchedule.finalSource,
                destination: mergedSchedule.finalDestination,
                stops: mergedSchedule.stops,
                currentLoad: mergedSchedule.finalCurrentLoad,
                remainingLoad: mergedSchedule.finalRemainingLoad,
                totalCapacity: mergedSchedule.totalCapacity,
                manifest: mergedSchedule.mergedFromTrucks
            }
        });
    } catch (err) {
        let statusCode = err.statusCode;
        if (!statusCode) {
            if (err.message.includes("already been processed")) {
                statusCode = 409;
            } else if (err.message.includes("capacity") || err.message.includes("compatible") || err.message.includes("itinerary") || err.message.includes("sequence")) {
                statusCode = 400;
            } else {
                statusCode = 500;
            }
        }
        res.status(statusCode).json({ message: "Failed to accept merge offer: " + err.message });
    }
});

/**
 * POST /driver/merge-offers/:pairId/reject
 * Driver rejects a proposed merge offer with an explicit reason.
 * Either involved driver can decline. The offer is atomically removed and independent dispatch is recorded.
 */
driverRouter.post('/driver/merge-offers/:pairId/reject', driverAuth, async (req, res) => {
    try {
        const { pairId } = req.params;
        const { reason, notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(pairId)) {
            return res.status(400).json({ message: "Invalid merge offer ID format" });
        }

        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({ message: "A rejection reason is required." });
        }

        // 1. Verify driver has active assignment
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const driverTruckId = activeAssignment.truckId._id.toString();

        // 2. Fetch pair proposal
        const pair = await MergeablePair.findById(pairId);
        if (!pair) {
            return res.status(409).json({
                message: "This merge offer has already been processed, expired, or is no longer available."
            });
        }

        // 3. Verify driver's vehicle is part of this pair
        if (pair.truckOneId.toString() !== driverTruckId && pair.truckTwoId.toString() !== driverTruckId) {
            return res.status(403).json({ message: "Access denied. You are not assigned to either vehicle in this proposed merge." });
        }

        // 4. Atomically delete pair to prevent duplicate submissions or concurrent race conditions
        const deletedPair = await MergeablePair.findByIdAndDelete(pairId);
        if (!deletedPair) {
            return res.status(409).json({
                message: "This merge offer has already been processed or is no longer available."
            });
        }

        // 5. Create independent schedules for both trucks if they don't already have accepted schedules
        const truckOne = await Truck.findById(deletedPair.truckOneId);
        const truckTwo = await Truck.findById(deletedPair.truckTwoId);

        const makeIndependentSchedule = async (truck, stops) => {
            if (!truck || !stops || !stops.length) return;
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

        if (truckOne) await makeIndependentSchedule(truckOne, deletedPair.truckOneStops);
        if (truckTwo) await makeIndependentSchedule(truckTwo, deletedPair.truckTwoStops);

        // 6. Record the rejection in MergeDecisionLog for admin oversight
        await MergeDecisionLog.create({
            pairId: pairId.toString(),
            decision: 'rejected',
            decidedByRole: 'driver',
            driverId: req.driver._id,
            driverName: req.driver.name,
            carrierTruckId: deletedPair.truckOneId,
            carrierLicensePlate: deletedPair.truckOneLicensePlate,
            absorbedTruckId: deletedPair.truckTwoId,
            absorbedLicensePlate: deletedPair.truckTwoLicensePlate,
            reason: reason.trim(),
            notes: notes ? notes.trim() : null
        });

        res.json({
            message: "Merge offer rejected. Both trucks will dispatch independently.",
            reason: reason.trim()
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to reject merge offer: " + err.message });
    }
});

/**
 * GET /admin/merge-decisions
 * Admin operational oversight: Lists historical merge decisions submitted by drivers and admins.
 */
driverRouter.get('/admin/merge-decisions', adminAuth, async (req, res) => {
    try {
        const decisions = await MergeDecisionLog.find()
            .sort({ decidedAt: -1 })
            .limit(50);
        res.json({ decisions });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch merge decision logs: " + err.message });
    }
});

// ─── FLEET MANAGEMENT ENDPOINTS (Requires companyAuth or adminAuth) ───────────

/**
 * POST /driver/assign
 * Assigns or reassigns a driver to a vehicle. Terminates any prior active assignment.
 */
driverRouter.post('/driver/assign', companyAuth, async (req, res) => {
    try {
        const { driverId, truckId, notes } = req.body;

        if (!driverId || !truckId) {
            return res.status(400).json({ message: "driverId and truckId are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(driverId) || !mongoose.Types.ObjectId.isValid(truckId)) {
            return res.status(400).json({ message: "Invalid driverId or truckId format" });
        }

        // Verify driver belongs to requesting company
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        if (driver.companyId.toString() !== req.company._id.toString()) {
            return res.status(403).json({ message: "Cannot assign a driver belonging to another company" });
        }

        if (driver.status === 'disabled') {
            return res.status(400).json({ message: "Cannot assign a disabled driver" });
        }

        // Verify truck belongs to requesting company
        const truck = await Truck.findById(truckId);
        if (!truck) {
            return res.status(404).json({ message: "Truck not found" });
        }

        if (truck.companyId.toString() !== req.company._id.toString()) {
            return res.status(403).json({ message: "Cannot assign a truck belonging to another company" });
        }

        const assignment = await DriverAssignment.assignDriver({
            driverId: driver._id,
            truckId: truck._id,
            companyId: req.company._id,
            notes
        });

        res.json({
            message: "Driver assigned successfully",
            assignment: {
                id: assignment._id,
                driverId: assignment.driverId,
                truckId: assignment.truckId,
                status: assignment.status,
                assignedAt: assignment.assignedAt
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Assignment failed: " + err.message });
    }
});

/**
 * POST /driver/unassign
 * Unassigns a driver or truck from active duty.
 */
driverRouter.post('/driver/unassign', companyAuth, async (req, res) => {
    try {
        const { driverId, truckId, reason } = req.body;

        if (!driverId && !truckId) {
            return res.status(400).json({ message: "Either driverId or truckId is required" });
        }

        if (driverId && !mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ message: "Invalid driverId format" });
        }
        if (truckId && !mongoose.Types.ObjectId.isValid(truckId)) {
            return res.status(400).json({ message: "Invalid truckId format" });
        }

        await DriverAssignment.unassignDriver({
            driverId,
            truckId,
            companyId: req.company._id,
            reason: reason || 'unassigned'
        });

        res.json({ message: "Driver unassigned successfully" });
    } catch (err) {
        res.status(500).json({ message: "Unassignment failed: " + err.message });
    }
});

/**
 * GET /company/drivers
 * Retrieves all drivers belonging to the authenticated transport company with active assignments.
 */
driverRouter.get('/company/drivers', companyAuth, async (req, res) => {
    try {
        const drivers = await Driver.find({ companyId: req.company._id }).sort({ name: 1 });

        const driverIds = drivers.map(d => d._id);
        const activeAssignments = await DriverAssignment.find({
            driverId: { $in: driverIds },
            status: 'active'
        }).populate('truckId');

        const assignmentMap = new Map();
        activeAssignments.forEach(a => {
            assignmentMap.set(a.driverId.toString(), a);
        });

        const result = drivers.map(driver => {
            const assignment = assignmentMap.get(driver._id.toString());
            return {
                id: driver._id,
                name: driver.name,
                emailId: driver.emailId,
                phone: driver.phone,
                licenseNumber: driver.licenseNumber,
                status: driver.status,
                photoUrl: driver.photoUrl,
                activeAssignment: assignment ? {
                    assignmentId: assignment._id,
                    truckId: assignment.truckId ? assignment.truckId._id : null,
                    licensePlate: assignment.truckId ? assignment.truckId.licensePlate : null,
                    assignedAt: assignment.assignedAt
                } : null
            };
        });

        res.json({ drivers: result });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch company drivers: " + err.message });
    }
});

/**
 * PATCH /company/drivers/:driverId/status
 * Updates driver status (e.g. active, disabled). If disabled, automatically terminates active assignments.
 */
driverRouter.patch('/company/drivers/:driverId/status', companyAuth, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID format" });
        }

        if (!['active', 'disabled', 'on_duty', 'off_duty'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const driver = await Driver.findOne({ _id: driverId, companyId: req.company._id });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found in your company" });
        }

        driver.status = status;
        await driver.save();

        // If driver is disabled, immediately revoke any active vehicle assignments
        if (status === 'disabled') {
            await DriverAssignment.unassignDriver({
                driverId: driver._id,
                companyId: req.company._id,
                reason: 'driver_disabled'
            });
        }

        res.json({
            message: `Driver status updated to ${status}`,
            driver: {
                id: driver._id,
                name: driver.name,
                status: driver.status
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Status update failed: " + err.message });
    }
});

module.exports = driverRouter;
