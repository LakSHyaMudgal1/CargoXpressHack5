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
const DriverLocation = require('../models/driverLocation');
const TripStopExecution = require('../models/tripStopExecution');
const TraderRequest = require('../models/traderRequest');
const DeliveryEvidence = require('../models/deliveryEvidence');
const evidenceStorage = require('../services/evidenceStorage');
const otpService = require('../services/otpService');
const { executeAcceptPair, buildMergedData } = require('./merge');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const Trader = require('../models/trader');

const { driverAuth, companyAuth, adminAuth, traderAuth, traderOrAdminAuth, extractToken } = require('../middlewares/auth');

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

        // Validate driver / truck ownership explicitly before unassigning
        if (driverId) {
            const driver = await Driver.findById(driverId);
            if (driver && driver.companyId.toString() !== req.company._id.toString()) {
                return res.status(403).json({ message: "Cannot unassign a driver belonging to another company" });
            }
        }
        if (truckId) {
            const truck = await Truck.findById(truckId);
            if (truck && truck.companyId.toString() !== req.company._id.toString()) {
                return res.status(403).json({ message: "Cannot unassign a truck belonging to another company" });
            }
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

// ─── DRIVER GPS LOCATION TRACKING ENDPOINTS ───────────────────────────────────

/**
 * POST /driver/location
 * Authenticated GPS ingest endpoint for drivers on active trips.
 * Supports single location reports and offline queued batch arrays.
 */
driverRouter.post('/driver/location', driverAuth, async (req, res) => {
    try {
        // 1. Verify driver has an active truck assignment
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({
                message: "Access denied. You have no active vehicle assignment authorized for tracking."
            });
        }

        const assignedTruck = activeAssignment.truckId;
        const assignedTruckIdStr = assignedTruck._id.toString();

        // 2. Verify active delivery or route for this assigned truck
        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: assignedTruckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: assignedTruckIdStr });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(403).json({
                message: "Access denied. Your assigned vehicle has no active trip or route scheduled for tracking."
            });
        }

        // 3. If client sends tripId or truckId in body, verify it matches the authenticated driver's assignment
        const providedTripId = req.body.tripId || (Array.isArray(req.body.locations) && req.body.locations[0]?.tripId);
        if (providedTripId && providedTripId.toString() !== activeTrip._id.toString()) {
            return res.status(403).json({
                message: "Access denied. Submitted trip ID does not match your assigned active trip."
            });
        }

        const providedTruckId = req.body.truckId || (Array.isArray(req.body.locations) && req.body.locations[0]?.truckId);
        if (providedTruckId && providedTruckId.toString() !== assignedTruckIdStr) {
            return res.status(403).json({
                message: "Access denied. Submitted truck ID does not match your authorized vehicle."
            });
        }

        // 4. Normalize single or batch location payloads
        const rawPoints = Array.isArray(req.body.locations)
            ? req.body.locations
            : [req.body];

        if (!rawPoints.length || (rawPoints.length === 1 && !rawPoints[0].latitude && rawPoints[0].latitude !== 0)) {
            return res.status(400).json({ message: "No valid location data provided in request body." });
        }

        const nowMs = Date.now();
        const maxFutureMs = nowMs + (5 * 60 * 1000); // Max 5 mins in future for device clock skew
        const maxPastMs = nowMs - (24 * 60 * 60 * 1000); // Max 24 hours in past

        const newLocationsToInsert = [];

        for (let i = 0; i < rawPoints.length; i++) {
            const pt = rawPoints[i];
            const lat = Number(pt.latitude);
            const lng = Number(pt.longitude);

            // Coordinate range validation
            if (isNaN(lat) || lat < -90 || lat > 90) {
                return res.status(400).json({
                    message: `Invalid latitude value "${pt.latitude}" at index ${i}. Must be a number between -90 and 90.`
                });
            }

            if (isNaN(lng) || lng < -180 || lng > 180) {
                return res.status(400).json({
                    message: `Invalid longitude value "${pt.longitude}" at index ${i}. Must be a number between -180 and 180.`
                });
            }

            // Timestamp validation
            const rawTs = pt.timestamp || pt.deviceTimestamp || pt.time;
            if (!rawTs) {
                return res.status(400).json({
                    message: `Device timestamp is required for location point at index ${i}.`
                });
            }

            const deviceDate = new Date(rawTs);
            const deviceMs = deviceDate.getTime();

            if (isNaN(deviceMs)) {
                return res.status(400).json({
                    message: `Invalid timestamp format "${rawTs}" at index ${i}.`
                });
            }

            if (deviceMs > maxFutureMs) {
                return res.status(400).json({
                    message: `Timestamp is implausible (in the future) at index ${i}.`
                });
            }

            if (deviceMs < maxPastMs) {
                return res.status(400).json({
                    message: `Timestamp is stale (exceeds 24 hours retention threshold) at index ${i}.`
                });
            }

            // Accuracy validation
            const accuracy = (pt.accuracy !== undefined && pt.accuracy !== null && !isNaN(Number(pt.accuracy)))
                ? Math.max(0, Number(pt.accuracy))
                : null;

            // Speed validation
            const speed = (pt.speed !== undefined && pt.speed !== null && !isNaN(Number(pt.speed)))
                ? Math.max(0, Number(pt.speed))
                : null;

            // Heading validation
            const heading = (pt.heading !== undefined && pt.heading !== null && !isNaN(Number(pt.heading)))
                ? Number(pt.heading)
                : null;

            // Altitude validation
            const altitude = (pt.altitude !== undefined && pt.altitude !== null && !isNaN(Number(pt.altitude)))
                ? Number(pt.altitude)
                : null;

            // Deduplication: Avoid duplicate insertion of identical device timestamp for this driver
            const duplicate = await DriverLocation.exists({
                driverId: req.driver._id,
                deviceTimestamp: deviceDate
            });

            if (!duplicate) {
                newLocationsToInsert.push({
                    driverId: req.driver._id,
                    driverName: req.driver.name,
                    truckId: assignedTruck._id,
                    truckLicensePlate: assignedTruck.licensePlate,
                    tripId: activeTrip._id,
                    tripType,
                    latitude: lat,
                    longitude: lng,
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    accuracy,
                    speed,
                    heading,
                    altitude,
                    deviceTimestamp: deviceDate,
                    serverTimestamp: new Date()
                });
            }
        }

        if (newLocationsToInsert.length > 0) {
            await DriverLocation.insertMany(newLocationsToInsert);
        }

        const latestSaved = newLocationsToInsert[newLocationsToInsert.length - 1];

        res.status(200).json({
            message: "Location updates processed successfully",
            recordedCount: newLocationsToInsert.length,
            totalSubmitted: rawPoints.length,
            trip: {
                id: activeTrip._id,
                type: tripType,
                truckLicensePlate: assignedTruck.licensePlate
            },
            latest: latestSaved ? {
                latitude: latestSaved.latitude,
                longitude: latestSaved.longitude,
                accuracy: latestSaved.accuracy,
                deviceTimestamp: latestSaved.deviceTimestamp
            } : null
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to record location update: " + err.message });
    }
});

/**
 * GET /driver/location/latest
 * Retrieves the current driver's last recorded GPS coordinates for their active haul.
 */
driverRouter.get('/driver/location/latest', driverAuth, async (req, res) => {
    try {
        const latest = await DriverLocation.findOne({ driverId: req.driver._id })
            .sort({ deviceTimestamp: -1 });

        if (!latest) {
            return res.json({
                location: null,
                message: "No location records available for your profile."
            });
        }

        res.json({
            location: {
                latitude: latest.latitude,
                longitude: latest.longitude,
                accuracy: latest.accuracy,
                speed: latest.speed,
                heading: latest.heading,
                altitude: latest.altitude,
                deviceTimestamp: latest.deviceTimestamp,
                serverTimestamp: latest.serverTimestamp,
                truckLicensePlate: latest.truckLicensePlate,
                tripId: latest.tripId
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch latest location: " + err.message });
    }
});

/**
 * GET /admin/driver-locations
 * Central dispatch overview: Retrieves the latest GPS coordinate for all actively tracking drivers.
 */
driverRouter.get('/admin/driver-locations', adminAuth, async (req, res) => {
    try {
        const activeAssignments = await DriverAssignment.find({ status: 'active' })
            .populate('driverId')
            .populate('truckId');

        const fleetLocations = [];
        const now = Date.now();

        for (const assignment of activeAssignments) {
            if (!assignment.driverId || !assignment.truckId) continue;

            const latest = await DriverLocation.findOne({ driverId: assignment.driverId._id })
                .sort({ deviceTimestamp: -1 });

            let freshnessMinutes = null;
            let freshnessStatus = 'no_signal';

            if (latest && latest.deviceTimestamp) {
                const diffMs = Math.max(0, now - new Date(latest.deviceTimestamp).getTime());
                freshnessMinutes = Math.round(diffMs / (60 * 1000));
                if (freshnessMinutes <= 10) {
                    freshnessStatus = 'live';
                } else if (freshnessMinutes <= 60) {
                    freshnessStatus = 'recent';
                } else {
                    freshnessStatus = 'stale';
                }
            }

            fleetLocations.push({
                assignmentId: assignment._id,
                driver: {
                    id: assignment.driverId._id,
                    name: assignment.driverId.name,
                    phone: assignment.driverId.phone
                },
                truck: {
                    id: assignment.truckId._id,
                    licensePlate: assignment.truckId.licensePlate
                },
                latestLocation: latest ? {
                    latitude: latest.latitude,
                    longitude: latest.longitude,
                    accuracy: latest.accuracy,
                    speed: latest.speed,
                    heading: latest.heading,
                    deviceTimestamp: latest.deviceTimestamp,
                    serverTimestamp: latest.serverTimestamp,
                    tripId: latest.tripId,
                    tripType: latest.tripType,
                    freshnessMinutes,
                    freshnessStatus
                } : null
            });
        }

        res.json({ drivers: fleetLocations });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch fleet locations: " + err.message });
    }
});

/**
 * GET /admin/driver-locations/:driverId/history
 * Central dispatch breadcrumbs: Retrieves recent GPS trail for an authorized driver's trip.
 */
driverRouter.get('/admin/driver-locations/:driverId/history', adminAuth, async (req, res) => {
    try {
        const { driverId } = req.params;
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100', 10)));

        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID format" });
        }

        const history = await DriverLocation.find({ driverId })
            .sort({ deviceTimestamp: -1 })
            .limit(limit);

        res.json({
            driverId,
            count: history.length,
            history: history.map(h => ({
                id: h._id,
                latitude: h.latitude,
                longitude: h.longitude,
                accuracy: h.accuracy,
                speed: h.speed,
                heading: h.heading,
                altitude: h.altitude,
                deviceTimestamp: h.deviceTimestamp,
                serverTimestamp: h.serverTimestamp,
                tripId: h.tripId
            }))
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch driver location history: " + err.message });
    }
});

// ─── STOP STATUS & OPERATIONAL EXECUTION ENDPOINTS ──────────────────────────

/**
 * GET /driver/active-trip/stops
 * Retrieves ordered stops, cargo manifests, current operational status,
 * and valid actions for the authenticated driver's active trip.
 */
driverRouter.get('/driver/active-trip/stops', driverAuth, async (req, res) => {
    try {
        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({
                message: "Access denied. You have no active vehicle assignment."
            });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.json({
                stops: [],
                message: "No active trip or route scheduled for your vehicle."
            });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        // Compute current stop index
        let currentStopIndex = 0;
        for (let i = 0; i < execution.stops.length; i++) {
            if (['pending', 'en_route', 'arrived', 'in_progress'].includes(execution.stops[i].status)) {
                currentStopIndex = i;
                break;
            }
            if (i === execution.stops.length - 1) {
                currentStopIndex = i;
            }
        }

        const formattedStops = execution.stops.map((stop, index) => {
            const isCompleted = stop.status === 'completed';
            const isFailed = stop.status === 'failed';
            const isActive = !isCompleted && !isFailed && index === currentStopIndex;
            const isUpcoming = index > currentStopIndex;

            // Allowed next transitions based on FSM
            let allowedNextActions = [];
            if (stop.status === 'pending') {
                const prevStop = index > 0 ? execution.stops[index - 1] : null;
                const prevDone = !prevStop || prevStop.status === 'completed' || prevStop.status === 'failed';
                if (prevDone) {
                    allowedNextActions = ['en_route', 'arrived', 'failed'];
                }
            } else if (stop.status === 'en_route') {
                allowedNextActions = ['arrived', 'failed'];
            } else if (stop.status === 'arrived') {
                allowedNextActions = ['in_progress', 'failed'];
            } else if (stop.status === 'in_progress') {
                allowedNextActions = ['completed', 'failed'];
            }

            return {
                stopIndex: stop.stopIndex,
                stopName: stop.stopName,
                stopType: stop.stopType,
                status: stop.status,
                isCompleted,
                isFailed,
                isActive,
                isUpcoming,
                allowedNextActions,
                shipmentsCount: stop.shipments.length,
                cargoWeightKg: stop.shipments.reduce((acc, s) => acc + (s.weightKg || 0), 0),
                shipments: stop.shipments.map(s => ({
                    shipmentId: s.shipmentId,
                    shipmentType: s.shipmentType,
                    reference: s.reference,
                    cargoDescription: s.cargoDescription,
                    weightKg: s.weightKg,
                    deliveredWeightKg: s.deliveredWeightKg,
                    outstandingWeightKg: s.outstandingWeightKg,
                    operation: s.operation,
                    status: s.status,
                    failureReason: s.failureReason,
                    deliveryAttempts: s.deliveryAttempts || [],
                    completedAt: s.completedAt
                })),
                recipient: stop.recipient,
                proofOfDelivery: stop.proofOfDelivery ? {
                    type: stop.proofOfDelivery.type,
                    verificationStatus: stop.proofOfDelivery.verificationStatus,
                    submittedAt: stop.proofOfDelivery.submittedAt
                } : null,
                failureReason: stop.failureReason,
                notes: stop.notes,
                arrivedAt: stop.arrivedAt,
                completedAt: stop.completedAt,
                failedAt: stop.failedAt,
                lastUpdatedAt: stop.lastUpdatedAt
            };
        });

        res.json({
            tripId: activeTrip._id,
            tripType,
            truck: {
                id: truck._id,
                licensePlate: truck.licensePlate,
                totalCapacity: activeTrip.totalCapacity || truck.totalCapacity
            },
            currentStopIndex,
            currentLoadOnBoard: execution.currentLoadOnBoard,
            totalDeliveredWeight: execution.totalDeliveredWeight,
            lifecycleStatus: execution.lifecycleStatus,
            stops: formattedStops
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch trip stops: " + err.message });
    }
});

/**
 * GET /driver/active-trip/stops/:stopIndex
 * Retrieves detailed stop instructions, shipments, and allowed transitions.
 */
driverRouter.get('/driver/active-trip/stops/:stopIndex', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        let allowedNextActions = [];
        if (stop.status === 'pending') {
            const prevStop = stopIndex > 0 ? execution.stops[stopIndex - 1] : null;
            const prevDone = !prevStop || prevStop.status === 'completed' || prevStop.status === 'failed';
            if (prevDone) {
                allowedNextActions = ['en_route', 'arrived', 'failed'];
            }
        } else if (stop.status === 'en_route') {
            allowedNextActions = ['arrived', 'failed'];
        } else if (stop.status === 'arrived') {
            allowedNextActions = ['in_progress', 'failed'];
        } else if (stop.status === 'in_progress') {
            allowedNextActions = ['completed', 'failed'];
        }

        let instructions = [];
        if (stop.stopType === 'pickup') {
            instructions = [
                "Inspect cargo packaging and check seal numbers against the consignment list.",
                "Ensure cargo is weighed and verified before loading.",
                "Secure freight with ratchet straps and close container doors securely."
            ];
        } else if (stop.stopType === 'delivery') {
            instructions = [
                "Verify recipient identity and collect recipient contact information.",
                "Obtain Proof of Delivery (recipient signature, OTP code, or handover photo).",
                "Have recipient inspect cargo condition before signing."
            ];
        } else if (stop.stopType === 'pickup_delivery') {
            instructions = [
                "Complete unloading and sign-off of delivery cargo first.",
                "Verify container space is clear before loading new pickup cargo.",
                "Verify consignment documents for newly loaded shipments."
            ];
        } else {
            instructions = [
                "Transit waypoint stop for inspection, toll, or mandatory rest check.",
                "Verify vehicle condition and tire pressure."
            ];
        }

        res.json({
            tripId: activeTrip._id,
            tripType,
            stopIndex: stop.stopIndex,
            stopName: stop.stopName,
            stopType: stop.stopType,
            status: stop.status,
            failureReason: stop.failureReason,
            notes: stop.notes,
            instructions,
            allowedNextActions,
            currentLoadOnBoard: execution.currentLoadOnBoard,
            shipments: stop.shipments,
            recipient: stop.recipient,
            proofOfDelivery: stop.proofOfDelivery,
            arrivedAt: stop.arrivedAt,
            completedAt: stop.completedAt,
            failedAt: stop.failedAt,
            lastUpdatedAt: stop.lastUpdatedAt,
            transitionHistory: stop.transitionHistory
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stop details: " + err.message });
    }
});

/**
 * POST /driver/active-trip/stops/:stopIndex/status
 * Updates operational status of a stop with FSM validation, atomic cargo updates,
 * proof of delivery ingest, and immutable audit logs.
 */
driverRouter.post('/driver/active-trip/stops/:stopIndex/status', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const { status, failureReason, notes, recipient, proofOfDelivery, shipmentUpdates, requestId } = req.body;
        const reqId = requestId || req.headers['x-request-id'] || null;

        const validStatuses = ['pending', 'en_route', 'arrived', 'in_progress', 'completed', 'failed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`
            });
        }

        if (status === 'failed' && (!failureReason || typeof failureReason !== 'string' || !failureReason.trim())) {
            return res.status(400).json({
                message: "A failureReason is required when marking a stop as failed."
            });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        // Deduplication via requestId
        if (reqId) {
            const alreadyProcessed = stop.transitionHistory.find(h => h.requestId === reqId);
            if (alreadyProcessed) {
                return res.status(200).json({
                    message: `Request ${reqId} was already processed idempotently.`,
                    stop,
                    currentLoadOnBoard: execution.currentLoadOnBoard,
                    totalDeliveredWeight: execution.totalDeliveredWeight,
                    lifecycleStatus: execution.lifecycleStatus
                });
            }
        }

        // Verify and validate shipments specified in shipmentUpdates
        if (Array.isArray(shipmentUpdates) && shipmentUpdates.length > 0) {
            for (const u of shipmentUpdates) {
                const found = stop.shipments.find(s => s.shipmentId === u.shipmentId);
                if (!found) {
                    return res.status(400).json({
                        message: `Shipment "${u.shipmentId}" is not associated with stop #${stopIndex + 1} ("${stop.stopName}").`
                    });
                }
                if (found.operation === 'delivery') {
                    const currentOutstanding = (found.outstandingWeightKg !== null && found.outstandingWeightKg !== undefined)
                        ? found.outstandingWeightKg
                        : (found.weightKg - (found.deliveredWeightKg || 0));

                    if (u.deliveredWeightKg !== undefined && u.deliveredWeightKg !== null) {
                        const dw = Number(u.deliveredWeightKg);
                        if (isNaN(dw) || dw < 0) {
                            return res.status(400).json({
                                message: `Delivered quantity cannot be negative for shipment "${u.shipmentId}".`
                            });
                        }
                        if (dw > currentOutstanding) {
                            return res.status(400).json({
                                message: `Delivered quantity (${dw} kg) cannot exceed the outstanding quantity (${currentOutstanding} kg) for shipment "${u.shipmentId}".`
                            });
                        }
                    }
                }
            }
        }

        // Idempotent check
        if (stop.status === status) {
            return res.status(200).json({
                message: `Stop status is already set to ${status}.`,
                stop,
                currentLoadOnBoard: execution.currentLoadOnBoard
            });
        }

        // Terminal state guards
        if (stop.status === 'completed') {
            return res.status(400).json({
                message: "Stop is already completed and cannot be reverted or modified."
            });
        }

        if (stop.status === 'failed') {
            return res.status(400).json({
                message: "Stop is marked as failed and cannot be modified."
            });
        }

        // FSM transition validation
        if (!TripStopExecution.isValidTransition(stop.status, status)) {
            return res.status(400).json({
                message: `Invalid state transition from "${stop.status}" to "${status}". Operational steps must be followed in sequence.`
            });
        }

        // Operational prerequisite check: Must arrive and start progress before completing
        if (status === 'completed' && stop.status !== 'in_progress' && stop.status !== 'arrived') {
            return res.status(400).json({
                message: "Operational steps must be followed: stop must be in 'arrived' or 'in_progress' state before completion."
            });
        }

        // Proof of delivery verification prior to completion
        if (status === 'completed' && proofOfDelivery && typeof proofOfDelivery === 'object') {
            if (proofOfDelivery.type === 'otp') {
                if (stop.otpVerification && stop.otpVerification.hashedOtp) {
                    if (!stop.otpVerification.isVerified) {
                        if (!proofOfDelivery.otpCode) {
                            return res.status(400).json({
                                message: "Recipient OTP code is required for OTP proof of delivery."
                            });
                        }
                        const verifyRes = otpService.verifyOtp(proofOfDelivery.otpCode, stop.otpVerification);
                        if (!verifyRes.success) {
                            await execution.save();
                            return res.status(400).json({
                                message: verifyRes.message || "Invalid OTP code."
                            });
                        }
                    }
                } else if (!proofOfDelivery.otpCode) {
                    return res.status(400).json({
                        message: "Recipient OTP code is required for OTP proof of delivery."
                    });
                }
            } else if (proofOfDelivery.type === 'photo' && proofOfDelivery.evidenceId) {
                const evidenceDoc = await DeliveryEvidence.findOne({ evidenceId: proofOfDelivery.evidenceId });
                if (!evidenceDoc) {
                    return res.status(400).json({
                        message: `Delivery evidence "${proofOfDelivery.evidenceId}" not found. Please upload evidence first.`
                    });
                }
            }
        }

        // Sequential integrity: Cannot execute stop if previous stop is unresolved
        if (stopIndex > 0) {
            for (let p = 0; p < stopIndex; p++) {
                const prev = execution.stops[p];
                if (prev.status !== 'completed' && prev.status !== 'failed') {
                    return res.status(400).json({
                        message: `Preceding stop #${p + 1} ("${prev.stopName}") is currently "${prev.status}". It must be completed or resolved before proceeding.`
                    });
                }
            }
        }

        const now = new Date();
        const oldStatus = stop.status;
        const affectedShipments = [];

        // Apply status-specific logic
        if (status === 'arrived') {
            stop.arrivedAt = now;
        } else if (status === 'failed') {
            stop.failedAt = now;
            stop.failureReason = failureReason.trim();
            // Mark all shipments at this stop as failed, recording failed attempt but preserving outstandingWeightKg
            stop.shipments.forEach(s => {
                if (s.outstandingWeightKg === null || s.outstandingWeightKg === undefined) {
                    s.outstandingWeightKg = s.weightKg - (s.deliveredWeightKg || 0);
                }
                s.deliveryAttempts = s.deliveryAttempts || [];
                const prevSStatus = s.status;
                s.status = 'failed';
                s.failureReason = failureReason.trim();

                if (s.operation === 'delivery') {
                    s.deliveryAttempts.push({
                        attemptNumber: s.deliveryAttempts.length + 1,
                        attemptType: 'failed',
                        deliveredWeightKg: 0,
                        outstandingWeightKg: s.outstandingWeightKg,
                        failureReason: failureReason.trim(),
                        driverId: req.driver._id,
                        driverName: req.driver.name,
                        requestId: reqId,
                        timestamp: now
                    });
                }

                affectedShipments.push({
                    shipmentId: s.shipmentId,
                    operation: s.operation,
                    fromStatus: prevSStatus,
                    toStatus: 'failed',
                    deliveredWeightKg: 0,
                    outstandingWeightKg: s.outstandingWeightKg,
                    failureReason: failureReason.trim()
                });
            });
        } else if (status === 'completed') {
            stop.completedAt = now;

            // 1. Process Pickups at this stop: update ONLY shipments picked up here
            const pickups = stop.shipments.filter(s => s.operation === 'pickup');
            for (const p of pickups) {
                const prevPStatus = p.status;
                p.status = 'loaded';
                p.completedAt = now;
                execution.currentLoadOnBoard += (p.weightKg || 0);
                affectedShipments.push({
                    shipmentId: p.shipmentId,
                    operation: 'pickup',
                    fromStatus: prevPStatus,
                    toStatus: 'loaded',
                    deliveredWeightKg: null,
                    outstandingWeightKg: null
                });
            }

            // 2. Process Deliveries at this stop: update ONLY shipments delivered here
            const deliveries = stop.shipments.filter(s => s.operation === 'delivery');
            if (deliveries.length > 0) {
                if (recipient && typeof recipient === 'object') {
                    stop.recipient = {
                        name: recipient.name || null,
                        phone: recipient.phone || null,
                        notes: recipient.notes || null
                    };
                }

                if (proofOfDelivery && typeof proofOfDelivery === 'object') {
                    stop.proofOfDelivery = {
                        type: proofOfDelivery.type || 'acknowledgement',
                        verificationStatus: 'driver_reported', // Driver-reported until independent audit
                        evidenceId: proofOfDelivery.evidenceId || null,
                        otpCode: proofOfDelivery.otpCode || null,
                        signatureData: proofOfDelivery.signatureData || null,
                        photoReference: proofOfDelivery.photoReference || proofOfDelivery.evidenceId || null,
                        submittedAt: now
                    };
                }

                for (const d of deliveries) {
                    if (d.outstandingWeightKg === null || d.outstandingWeightKg === undefined) {
                        d.outstandingWeightKg = d.weightKg - (d.deliveredWeightKg || 0);
                    }
                    d.deliveryAttempts = d.deliveryAttempts || [];

                    const prevDStatus = d.status;
                    const update = Array.isArray(shipmentUpdates)
                        ? shipmentUpdates.find(u => u.shipmentId === d.shipmentId)
                        : null;

                    if (update && (update.status === 'partial' || update.status === 'partially_delivered')) {
                        const deliveredKg = Number(update.deliveredWeightKg) || 0;
                        d.deliveredWeightKg = (d.deliveredWeightKg || 0) + deliveredKg;
                        d.outstandingWeightKg = Math.max(0, d.outstandingWeightKg - deliveredKg);
                        d.status = d.outstandingWeightKg === 0 ? 'delivered' : 'partial';
                        d.failureReason = update.failureReason || 'Partial consignment delivered';
                        d.completedAt = now;
                        execution.currentLoadOnBoard = Math.max(0, execution.currentLoadOnBoard - deliveredKg);
                        execution.totalDeliveredWeight += deliveredKg;

                        d.deliveryAttempts.push({
                            attemptNumber: d.deliveryAttempts.length + 1,
                            attemptType: d.outstandingWeightKg === 0 ? 'full' : 'partial',
                            deliveredWeightKg: deliveredKg,
                            outstandingWeightKg: d.outstandingWeightKg,
                            recipient: stop.recipient,
                            proofOfDelivery: stop.proofOfDelivery,
                            failureReason: d.failureReason,
                            driverId: req.driver._id,
                            driverName: req.driver.name,
                            requestId: reqId,
                            timestamp: now
                        });

                        affectedShipments.push({
                            shipmentId: d.shipmentId,
                            operation: 'delivery',
                            fromStatus: prevDStatus,
                            toStatus: d.status,
                            deliveredWeightKg: deliveredKg,
                            outstandingWeightKg: d.outstandingWeightKg,
                            failureReason: d.failureReason
                        });
                    } else if (update && (update.status === 'failed' || update.status === 'delivery_failed')) {
                        d.status = 'failed';
                        d.failureReason = update.failureReason || 'Recipient refused delivery';
                        d.completedAt = now;
                        // outstandingWeightKg remains intact

                        d.deliveryAttempts.push({
                            attemptNumber: d.deliveryAttempts.length + 1,
                            attemptType: 'failed',
                            deliveredWeightKg: 0,
                            outstandingWeightKg: d.outstandingWeightKg,
                            recipient: stop.recipient,
                            proofOfDelivery: stop.proofOfDelivery,
                            failureReason: d.failureReason,
                            driverId: req.driver._id,
                            driverName: req.driver.name,
                            requestId: reqId,
                            timestamp: now
                        });

                        affectedShipments.push({
                            shipmentId: d.shipmentId,
                            operation: 'delivery',
                            fromStatus: prevDStatus,
                            toStatus: 'failed',
                            deliveredWeightKg: 0,
                            outstandingWeightKg: d.outstandingWeightKg,
                            failureReason: d.failureReason
                        });
                    } else {
                        // Full delivery
                        const deliveredKg = d.outstandingWeightKg;
                        d.deliveredWeightKg = (d.deliveredWeightKg || 0) + deliveredKg;
                        d.outstandingWeightKg = 0;
                        d.status = 'delivered';
                        d.completedAt = now;
                        execution.currentLoadOnBoard = Math.max(0, execution.currentLoadOnBoard - deliveredKg);
                        execution.totalDeliveredWeight += deliveredKg;

                        d.deliveryAttempts.push({
                            attemptNumber: d.deliveryAttempts.length + 1,
                            attemptType: 'full',
                            deliveredWeightKg: deliveredKg,
                            outstandingWeightKg: 0,
                            recipient: stop.recipient,
                            proofOfDelivery: stop.proofOfDelivery,
                            driverId: req.driver._id,
                            driverName: req.driver.name,
                            requestId: reqId,
                            timestamp: now
                        });

                        affectedShipments.push({
                            shipmentId: d.shipmentId,
                            operation: 'delivery',
                            fromStatus: prevDStatus,
                            toStatus: 'delivered',
                            deliveredWeightKg: deliveredKg,
                            outstandingWeightKg: 0
                        });
                    }
                }
            }
        }

        // Append transition audit log
        stop.transitionHistory.push({
            fromStatus: oldStatus,
            toStatus: status,
            driverId: req.driver._id,
            driverName: req.driver.name,
            actorRole: 'driver',
            timestamp: now,
            reason: failureReason || notes || null,
            notes: notes ? notes.trim() : null,
            requestId: reqId,
            affectedShipments
        });

        stop.status = status;
        stop.lastUpdatedAt = now;
        if (notes && typeof notes === 'string') {
            stop.notes = notes.trim();
        }

        // Update overall trip lifecycle
        const allDone = execution.stops.every(s => s.status === 'completed' || s.status === 'failed');
        if (allDone) {
            execution.lifecycleStatus = 'completed';
        } else if (execution.lifecycleStatus === 'scheduled' && status !== 'pending') {
            execution.lifecycleStatus = 'in_transit';
        }

        await execution.save();

        res.json({
            message: `Stop #${stopIndex + 1} (${stop.stopName}) status updated to "${status}".`,
            stop: {
                stopIndex: stop.stopIndex,
                stopName: stop.stopName,
                stopType: stop.stopType,
                status: stop.status,
                failureReason: stop.failureReason,
                recipient: stop.recipient,
                proofOfDelivery: stop.proofOfDelivery ? {
                    type: stop.proofOfDelivery.type,
                    verificationStatus: stop.proofOfDelivery.verificationStatus,
                    submittedAt: stop.proofOfDelivery.submittedAt
                } : null,
                shipments: stop.shipments,
                completedAt: stop.completedAt,
                arrivedAt: stop.arrivedAt,
                failedAt: stop.failedAt,
                transitionHistory: stop.transitionHistory
            },
            currentLoadOnBoard: execution.currentLoadOnBoard,
            totalDeliveredWeight: execution.totalDeliveredWeight,
            lifecycleStatus: execution.lifecycleStatus
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to update stop status: " + err.message });
    }
});

/**
 * Multi-role authentication middleware for evidence inspection.
 * Allows Admin, Driver (trip participant), TransportCompany (vehicle owner), or Trader (shipment owner).
 */
const anyAuthorizedEvidenceAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ message: "Kindly Login" });
        }
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        const { _id, role } = decodedData;
        req.user = { id: _id, role };

        if (role === 'driver') {
            const driver = await Driver.findById(_id);
            if (driver && driver.status !== 'disabled') req.driver = driver;
        } else if (role === 'company' || role === 'transport_company' || role === 'transportCompany') {
            const company = await TransportCompany.findById(_id);
            if (company) req.company = company;
        } else if (role === 'admin') {
            const admin = await Admin.findById(_id);
            if (admin) req.admin = admin;
        } else if (role === 'trader') {
            const trader = await Trader.findById(_id);
            if (trader) req.trader = trader;
        }

        if (!req.driver && !req.company && !req.admin && !req.trader) {
            return res.status(401).json({ message: "User not found or authorization role invalid." });
        }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};

/**
 * POST /driver/active-trip/stops/:stopIndex/delivery-attempt
 * Records an individual consignment delivery attempt (full, partial, or failed).
 * Strictly preserves outstanding quantity, records attempt history, and enforces quantity bounds.
 */
driverRouter.post('/driver/active-trip/stops/:stopIndex/delivery-attempt', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const {
            shipmentId,
            attemptType,
            deliveredWeightKg,
            failureReason,
            recipient,
            proofOfDelivery,
            notes,
            requestId
        } = req.body;

        const reqId = requestId || req.headers['x-request-id'] || null;

        if (!shipmentId) {
            return res.status(400).json({ message: "shipmentId is required." });
        }

        const validTypes = ['full', 'partial', 'failed'];
        if (!attemptType || !validTypes.includes(attemptType)) {
            return res.status(400).json({
                message: `Invalid attemptType "${attemptType}". Allowed: ${validTypes.join(', ')}`
            });
        }

        if ((attemptType === 'failed' || attemptType === 'partial') && (!failureReason || !failureReason.trim())) {
            return res.status(400).json({
                message: "A failureReason or explanation note is required for failed or partial deliveries."
            });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        // Sequential integrity: Cannot execute stop if previous stop is unresolved
        if (stopIndex > 0) {
            for (let p = 0; p < stopIndex; p++) {
                const prev = execution.stops[p];
                if (prev.status !== 'completed' && prev.status !== 'failed') {
                    return res.status(400).json({
                        message: `Preceding stop #${p + 1} ("${prev.stopName}") is currently "${prev.status}". It must be completed or resolved before proceeding.`
                    });
                }
            }
        }

        const shipment = stop.shipments.find(s => s.shipmentId === shipmentId);
        if (!shipment) {
            return res.status(404).json({
                message: `Shipment "${shipmentId}" not found at stop #${stopIndex + 1} ("${stop.stopName}").`
            });
        }

        if (shipment.operation !== 'delivery') {
            return res.status(400).json({
                message: `Shipment "${shipmentId}" is a pickup operation, not a delivery operation.`
            });
        }

        // Initialize outstandingWeightKg if needed
        if (shipment.outstandingWeightKg === null || shipment.outstandingWeightKg === undefined) {
            shipment.outstandingWeightKg = shipment.weightKg - (shipment.deliveredWeightKg || 0);
        }
        shipment.deliveryAttempts = shipment.deliveryAttempts || [];

        // Idempotency check via reqId
        if (reqId) {
            const alreadyProcessed = shipment.deliveryAttempts.find(a => a.requestId === reqId);
            if (alreadyProcessed) {
                return res.status(200).json({
                    message: `Delivery attempt request ${reqId} was already processed idempotently.`,
                    shipment,
                    stopStatus: stop.status,
                    currentLoadOnBoard: execution.currentLoadOnBoard,
                    totalDeliveredWeight: execution.totalDeliveredWeight
                });
            }
        }

        // Proof of delivery verification if provided
        let verifiedPod = null;
        if (proofOfDelivery && typeof proofOfDelivery === 'object') {
            if (proofOfDelivery.type === 'otp') {
                if (!stop.otpVerification || !stop.otpVerification.hashedOtp) {
                    return res.status(400).json({
                        message: "No recipient OTP verification was initiated for this stop. Request an OTP first."
                    });
                }
                if (!stop.otpVerification.isVerified) {
                    if (!proofOfDelivery.otpCode) {
                        return res.status(400).json({
                            message: "Recipient OTP code is required for OTP proof of delivery."
                        });
                    }
                    const verifyRes = otpService.verifyOtp(proofOfDelivery.otpCode, stop.otpVerification);
                    if (!verifyRes.success) {
                        await execution.save();
                        return res.status(400).json({
                            message: verifyRes.message || "Invalid OTP code."
                        });
                    }
                }
                verifiedPod = {
                    type: 'otp',
                    verificationStatus: 'verified',
                    otpVerified: true,
                    otpCode: proofOfDelivery.otpCode,
                    submittedAt: new Date()
                };
            } else if (proofOfDelivery.type === 'photo') {
                if (proofOfDelivery.evidenceId) {
                    const evidenceDoc = await DeliveryEvidence.findOne({ evidenceId: proofOfDelivery.evidenceId });
                    if (!evidenceDoc) {
                        return res.status(400).json({
                            message: `Delivery evidence "${proofOfDelivery.evidenceId}" not found. Please upload evidence first.`
                        });
                    }
                }
                verifiedPod = {
                    type: 'photo',
                    verificationStatus: 'driver_reported',
                    evidenceId: proofOfDelivery.evidenceId || null,
                    photoReference: proofOfDelivery.photoReference || proofOfDelivery.evidenceId || null,
                    submittedAt: new Date()
                };
            } else {
                verifiedPod = {
                    type: proofOfDelivery.type || 'acknowledgement',
                    verificationStatus: 'driver_reported',
                    signatureData: proofOfDelivery.signatureData || null,
                    submittedAt: new Date()
                };
            }
        }

        const now = new Date();
        const prevStatus = shipment.status;
        let deliveredThisAttempt = 0;

        if (attemptType === 'failed') {
            // Failed delivery attempt: preserves outstanding quantity without cancelling shipment
            shipment.status = 'failed';
            shipment.failureReason = failureReason.trim();
            shipment.deliveryAttempts.push({
                attemptNumber: shipment.deliveryAttempts.length + 1,
                attemptType: 'failed',
                deliveredWeightKg: 0,
                outstandingWeightKg: shipment.outstandingWeightKg,
                recipient: recipient || stop.recipient || null,
                proofOfDelivery: verifiedPod || null,
                failureReason: failureReason.trim(),
                driverId: req.driver._id,
                driverName: req.driver.name,
                requestId: reqId,
                timestamp: now
            });
        } else if (attemptType === 'partial') {
            const dw = Number(deliveredWeightKg);
            if (isNaN(dw) || dw < 0) {
                return res.status(400).json({ message: "Delivered quantity cannot be negative or invalid." });
            }
            if (dw === 0) {
                return res.status(400).json({
                    message: "Delivered quantity must be greater than zero for partial delivery. Otherwise report a failed delivery."
                });
            }
            if (dw > shipment.outstandingWeightKg) {
                return res.status(400).json({
                    message: `Delivered quantity (${dw} kg) cannot exceed the outstanding quantity (${shipment.outstandingWeightKg} kg).`
                });
            }

            deliveredThisAttempt = dw;
            shipment.deliveredWeightKg = (shipment.deliveredWeightKg || 0) + deliveredThisAttempt;
            shipment.outstandingWeightKg = shipment.outstandingWeightKg - deliveredThisAttempt;
            shipment.status = shipment.outstandingWeightKg === 0 ? 'delivered' : 'partial';
            shipment.failureReason = failureReason.trim();
            if (shipment.outstandingWeightKg === 0) {
                shipment.completedAt = now;
            }

            execution.currentLoadOnBoard = Math.max(0, execution.currentLoadOnBoard - deliveredThisAttempt);
            execution.totalDeliveredWeight += deliveredThisAttempt;

            shipment.deliveryAttempts.push({
                attemptNumber: shipment.deliveryAttempts.length + 1,
                attemptType: shipment.outstandingWeightKg === 0 ? 'full' : 'partial',
                deliveredWeightKg: deliveredThisAttempt,
                outstandingWeightKg: shipment.outstandingWeightKg,
                recipient: recipient || stop.recipient || null,
                proofOfDelivery: verifiedPod || null,
                failureReason: failureReason.trim(),
                driverId: req.driver._id,
                driverName: req.driver.name,
                requestId: reqId,
                timestamp: now
            });
        } else {
            // attemptType === 'full'
            if (deliveredWeightKg !== undefined && deliveredWeightKg !== null) {
                const dw = Number(deliveredWeightKg);
                if (isNaN(dw) || dw < 0) {
                    return res.status(400).json({ message: "Delivered quantity cannot be negative." });
                }
                if (dw > shipment.outstandingWeightKg) {
                    return res.status(400).json({
                        message: `Delivered quantity (${dw} kg) cannot exceed outstanding quantity (${shipment.outstandingWeightKg} kg).`
                    });
                }
                deliveredThisAttempt = dw;
            } else {
                deliveredThisAttempt = shipment.outstandingWeightKg;
            }

            shipment.deliveredWeightKg = (shipment.deliveredWeightKg || 0) + deliveredThisAttempt;
            shipment.outstandingWeightKg = shipment.outstandingWeightKg - deliveredThisAttempt;
            shipment.status = shipment.outstandingWeightKg === 0 ? 'delivered' : 'partial';
            if (shipment.outstandingWeightKg === 0) {
                shipment.completedAt = now;
            }

            execution.currentLoadOnBoard = Math.max(0, execution.currentLoadOnBoard - deliveredThisAttempt);
            execution.totalDeliveredWeight += deliveredThisAttempt;

            shipment.deliveryAttempts.push({
                attemptNumber: shipment.deliveryAttempts.length + 1,
                attemptType: shipment.outstandingWeightKg === 0 ? 'full' : 'partial',
                deliveredWeightKg: deliveredThisAttempt,
                outstandingWeightKg: shipment.outstandingWeightKg,
                recipient: recipient || stop.recipient || null,
                proofOfDelivery: verifiedPod || null,
                driverId: req.driver._id,
                driverName: req.driver.name,
                requestId: reqId,
                timestamp: now
            });
        }

        if (recipient && typeof recipient === 'object') {
            stop.recipient = {
                name: recipient.name || stop.recipient?.name || null,
                phone: recipient.phone || stop.recipient?.phone || null,
                notes: recipient.notes || stop.recipient?.notes || null
            };
        }

        if (verifiedPod) {
            stop.proofOfDelivery = verifiedPod;
        }

        // Append transition audit
        stop.transitionHistory.push({
            fromStatus: stop.status,
            toStatus: stop.status,
            driverId: req.driver._id,
            driverName: req.driver.name,
            actorRole: 'driver',
            timestamp: now,
            reason: failureReason || notes || `Delivery attempt (${attemptType})`,
            notes: notes ? notes.trim() : null,
            requestId: reqId,
            affectedShipments: [{
                shipmentId: shipment.shipmentId,
                operation: 'delivery',
                fromStatus: prevStatus,
                toStatus: shipment.status,
                deliveredWeightKg: deliveredThisAttempt,
                outstandingWeightKg: shipment.outstandingWeightKg,
                failureReason: shipment.failureReason
            }]
        });

        // If all delivery shipments at this stop are delivered and stop is in progress, stop can complete
        const deliveries = stop.shipments.filter(s => s.operation === 'delivery');
        const allDeliveriesDone = deliveries.every(d => d.status === 'delivered' && d.outstandingWeightKg === 0);
        if (allDeliveriesDone && (stop.status === 'in_progress' || stop.status === 'arrived')) {
            stop.status = 'completed';
            stop.completedAt = now;
        }

        stop.lastUpdatedAt = now;
        await execution.save();

        res.json({
            message: `Delivery attempt for shipment "${shipment.reference}" recorded successfully.`,
            shipment: {
                shipmentId: shipment.shipmentId,
                reference: shipment.reference,
                weightKg: shipment.weightKg,
                deliveredWeightKg: shipment.deliveredWeightKg,
                outstandingWeightKg: shipment.outstandingWeightKg,
                status: shipment.status,
                failureReason: shipment.failureReason,
                completedAt: shipment.completedAt,
                attemptsCount: shipment.deliveryAttempts.length,
                latestAttempt: shipment.deliveryAttempts[shipment.deliveryAttempts.length - 1]
            },
            stop: {
                stopIndex: stop.stopIndex,
                stopName: stop.stopName,
                status: stop.status,
                completedAt: stop.completedAt
            },
            currentLoadOnBoard: execution.currentLoadOnBoard,
            totalDeliveredWeight: execution.totalDeliveredWeight
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to record delivery attempt: " + err.message });
    }
});

/**
 * POST /driver/active-trip/stops/:stopIndex/generate-otp
 * Generates a secure, expiring 6-digit OTP for recipient delivery verification.
 * Plaintext OTP is returned once in response for delivery to recipient, never stored in DB.
 */
driverRouter.post('/driver/active-trip/stops/:stopIndex/generate-otp', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        const otpPayload = otpService.generateOtp();
        stop.otpVerification = {
            hashedOtp: otpPayload.hashedOtp,
            salt: otpPayload.salt,
            expiresAt: otpPayload.expiresAt,
            attemptCount: 0,
            maxAttempts: otpPayload.maxAttempts,
            isVerified: false,
            verifiedAt: null
        };

        await execution.save();

        res.json({
            message: "Consignee OTP generated successfully. Provide code to recipient upon arrival.",
            expiresAt: otpPayload.expiresAt,
            maxAttempts: otpPayload.maxAttempts,
            formattedOtp: otpPayload.otp // Returned once for test/SMS distribution
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to generate OTP: " + err.message });
    }
});

/**
 * POST /driver/active-trip/stops/:stopIndex/verify-otp
 * Verifies recipient OTP code against stored hash with rate-limiting and expiration checks.
 */
driverRouter.post('/driver/active-trip/stops/:stopIndex/verify-otp', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const { otpCode } = req.body;
        if (!otpCode || typeof otpCode !== 'string' || !otpCode.trim()) {
            return res.status(400).json({ message: "otpCode is required." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        const verification = otpService.verifyOtp(otpCode, stop.otpVerification);
        await execution.save();

        if (!verification.success) {
            return res.status(400).json({
                message: verification.message,
                reason: verification.reason,
                attemptsRemaining: verification.attemptsRemaining
            });
        }

        res.json({
            message: verification.message,
            isVerified: true,
            verifiedAt: stop.otpVerification.verifiedAt
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to verify OTP: " + err.message });
    }
});

/**
 * POST /driver/active-trip/stops/:stopIndex/evidence
 * Securely uploads a proof of delivery photo or document to local storage and indexes metadata in DB.
 */
driverRouter.post('/driver/active-trip/stops/:stopIndex/evidence', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const { fileName, mimeType, dataBase64, shipmentId, metadata } = req.body;

        if (!dataBase64 || typeof dataBase64 !== 'string') {
            return res.status(400).json({ message: "dataBase64 content is required." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const buffer = Buffer.from(dataBase64, 'base64');
        const stored = await evidenceStorage.saveEvidence({
            buffer,
            mimeType,
            originalFileName: fileName
        });

        const evidence = await DeliveryEvidence.create({
            evidenceId: stored.evidenceId,
            fileName: stored.fileName,
            filePath: stored.filePath,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            tripId: activeTrip._id.toString(),
            truckId: truck._id,
            driverId: req.driver._id,
            stopIndex,
            shipmentId: shipmentId || null,
            companyId: truck.companyId || req.driver.companyId || null,
            verificationStatus: 'driver_reported',
            metadata: metadata || {}
        });

        // Also associate with execution stop proofOfDelivery
        const execution = await TripStopExecution.findOne({ tripId: activeTrip._id.toString() });
        if (execution) {
            const stop = execution.stops.find(s => s.stopIndex === stopIndex);
            if (stop) {
                stop.proofOfDelivery = {
                    type: 'photo',
                    verificationStatus: 'driver_reported',
                    evidenceId: evidence.evidenceId,
                    photoReference: evidence.evidenceId,
                    submittedAt: new Date()
                };
                await execution.save();
            }
        }

        res.status(201).json({
            message: "Delivery evidence uploaded successfully.",
            evidence: {
                evidenceId: evidence.evidenceId,
                fileName: evidence.fileName,
                mimeType: evidence.mimeType,
                sizeBytes: evidence.sizeBytes,
                verificationStatus: evidence.verificationStatus,
                createdAt: evidence.createdAt
            }
        });
    } catch (err) {
        const isValidationErr = err.message.includes('MIME') || err.message.includes('size') || err.message.includes('format') || err.message.includes('empty');
        res.status(isValidationErr ? 400 : 500).json({ message: "Failed to upload delivery evidence: " + err.message });
    }
});

/**
 * GET /driver/evidence/:evidenceId
 * Securely streams an authorized delivery evidence file.
 * Access is restricted to assigned driver, transport company owner, admin, or trader who owns shipment.
 */
driverRouter.get('/driver/evidence/:evidenceId', anyAuthorizedEvidenceAuth, async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const evidence = await DeliveryEvidence.findOne({ evidenceId });
        if (!evidence) {
            return res.status(404).json({ message: "Delivery evidence not found." });
        }

        // Access Authorization
        let isAuthorized = false;
        if (req.admin) {
            isAuthorized = true;
        } else if (req.driver && evidence.driverId.toString() === req.driver._id.toString()) {
            isAuthorized = true;
        } else if (req.company && evidence.companyId && evidence.companyId.toString() === req.company._id.toString()) {
            isAuthorized = true;
        } else if (req.trader && evidence.shipmentId) {
            const traderReq = await TraderRequest.findById(evidence.shipmentId);
            if (traderReq && traderReq.traderId.toString() === req.trader._id.toString()) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                message: "Access denied. You are not authorized to view this delivery evidence."
            });
        }

        const exists = await evidenceStorage.evidenceExists(evidence.filePath);
        if (!exists) {
            return res.status(404).json({ message: "Evidence file missing from storage." });
        }

        res.setHeader('Content-Type', evidence.mimeType);
        res.setHeader('Content-Length', evidence.sizeBytes);
        evidenceStorage.createEvidenceReadStream(evidence.filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ message: "Failed to retrieve delivery evidence: " + err.message });
    }
});

/**
 * GET /driver/active-trip/stops/:stopIndex/shipments
 * Retrieves shipment operations and consignment items associated specifically with this stop.
 */
driverRouter.get('/driver/active-trip/stops/:stopIndex/shipments', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        res.json({
            tripId: activeTrip._id,
            stopIndex: stop.stopIndex,
            stopName: stop.stopName,
            stopType: stop.stopType,
            status: stop.status,
            shipmentsCount: stop.shipments.length,
            cargoWeightKg: stop.shipments.reduce((acc, s) => acc + (s.weightKg || 0), 0),
            shipments: stop.shipments
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stop shipments: " + err.message });
    }
});

/**
 * GET /driver/active-trip/stops/:stopIndex/history
 * Retrieves full transition audit history, timestamp log, and shipment update events for this stop.
 */
driverRouter.get('/driver/active-trip/stops/:stopIndex/history', driverAuth, async (req, res) => {
    try {
        const stopIndex = parseInt(req.params.stopIndex, 10);
        if (isNaN(stopIndex) || stopIndex < 0) {
            return res.status(400).json({ message: "Invalid stop index format." });
        }

        const activeAssignment = await DriverAssignment.getActiveForDriver(req.driver._id);
        if (!activeAssignment || !activeAssignment.truckId) {
            return res.status(403).json({ message: "Access denied. You have no active vehicle assignment." });
        }

        const truck = activeAssignment.truckId;
        const truckIdStr = truck._id.toString();

        let activeTrip = await MergedSchedule.findOne({
            transportationTruckId: truckIdStr,
            status: 'accepted'
        });
        let tripType = 'MergedSchedule';

        if (!activeTrip) {
            activeTrip = await Route.findOne({ truckId: truck._id });
            tripType = 'Route';
        }

        if (!activeTrip) {
            return res.status(404).json({ message: "No active trip found for your vehicle." });
        }

        const execution = await TripStopExecution.getOrCreateExecution({
            tripId: activeTrip._id,
            tripType,
            truckId: truck._id,
            truckLicensePlate: truck.licensePlate,
            companyId: truck.companyId,
            activeTripDoc: activeTrip,
            truckDoc: truck
        });

        const stop = execution.stops.find(s => s.stopIndex === stopIndex);
        if (!stop) {
            return res.status(404).json({ message: `Stop at index ${stopIndex} not found.` });
        }

        res.json({
            tripId: activeTrip._id,
            stopIndex: stop.stopIndex,
            stopName: stop.stopName,
            currentStatus: stop.status,
            arrivedAt: stop.arrivedAt,
            completedAt: stop.completedAt,
            failedAt: stop.failedAt,
            lastUpdatedAt: stop.lastUpdatedAt,
            transitionHistory: stop.transitionHistory
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stop history: " + err.message });
    }
});

/**
 * GET /admin/trip-stops/:tripId
 * Central dispatch inspection: Retrieves full execution lifecycle, proof of delivery,
 * and immutable transition audit logs for any trip.
 */
driverRouter.get('/admin/trip-stops/:tripId', adminAuth, async (req, res) => {
    try {
        const { tripId } = req.params;

        let execution = await TripStopExecution.findOne({ tripId });
        if (!execution) {
            // Attempt to build if active MergedSchedule or Route exists
            const MergedSchedule = mongoose.model('MergedSchedule');
            const Route = mongoose.model('Route');

            let tripDoc = await MergedSchedule.findById(tripId);
            let tripType = 'MergedSchedule';

            if (!tripDoc) {
                tripDoc = await Route.findById(tripId);
                tripType = 'Route';
            }

            if (!tripDoc) {
                return res.status(404).json({ message: "Trip not found." });
            }

            const truckId = tripType === 'MergedSchedule' ? tripDoc.transportationTruckId : tripDoc.truckId;
            const truck = await Truck.findById(truckId);

            execution = await TripStopExecution.getOrCreateExecution({
                tripId,
                tripType,
                truckId: truck ? truck._id : new mongoose.Types.ObjectId(),
                truckLicensePlate: truck ? truck.licensePlate : 'TRUCK',
                companyId: truck ? truck.companyId : null,
                activeTripDoc: tripDoc,
                truckDoc: truck
            });
        }

        res.json({
            tripId: execution.tripId,
            tripType: execution.tripType,
            truckLicensePlate: execution.truckLicensePlate,
            lifecycleStatus: execution.lifecycleStatus,
            currentLoadOnBoard: execution.currentLoadOnBoard,
            totalDeliveredWeight: execution.totalDeliveredWeight,
            stops: execution.stops
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch trip execution details: " + err.message });
    }
});

/**
 * GET /trader/shipment-status/:traderRequestId
 * Trader shipment tracking & central dispatch tracking:
 * - Scoped strictly to the authenticated trader identity (trader cannot view other traders' consignments)
 * - Allows dispatch administrator platform-wide tracking across all consolidated consignments
 * - Rejects unauthorized roles (transport company carriers, drivers, or anonymous callers)
 * - Provides lifecycle status, vehicle plate, stop milestones, and proof of delivery without leaking competitor/consolidated freight
 */
driverRouter.get('/trader/shipment-status/:traderRequestId', traderOrAdminAuth, async (req, res) => {
    try {
        const { traderRequestId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(traderRequestId)) {
            return res.status(400).json({ message: "Invalid trader request ID format." });
        }

        const traderRequest = await TraderRequest.findById(traderRequestId);
        if (!traderRequest) {
            return res.status(404).json({ message: "Trader request not found." });
        }

        // Authorization check:
        // - Admin has platform-wide visibility across all trader consignments
        // - Trader must strictly own this shipment request
        if (req.user.role === 'trader') {
            if (!req.trader || traderRequest.traderId.toString() !== req.trader._id.toString()) {
                return res.status(403).json({ message: "Access denied. You do not own this shipment request." });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Authorized trader or dispatch admin role required." });
        }

        const { calculateRequiredCapacity } = require('../utils/capacityCalculation');
        let reqWeight = 0;
        if (typeof traderRequest.requiredCapacity === 'number') {
            reqWeight = traderRequest.requiredCapacity;
        } else if (traderRequest.load) {
            try {
                reqWeight = calculateRequiredCapacity(traderRequest.load);
            } catch (_) {
                reqWeight = Array.isArray(traderRequest.load) && traderRequest.load.length > 0 ? traderRequest.load[0] : 0;
            }
        }

        // Search for execution document containing this shipment
        const execution = await TripStopExecution.findOne({
            'stops.shipments.shipmentId': traderRequestId
        });

        if (!execution) {
            // Check if merged/assigned in MergeableTrader
            const MergeableTrader = mongoose.model('MergeableTrader');
            const mergeable = await MergeableTrader.findOne({ traderRequestId });

            let status = 'pending_dispatch';
            let statusLabel = 'Pending Truck Assignment & Dispatch';
            let carrierTruckLicensePlate = null;

            const initialMilestones = [
                {
                    event: 'Consignment Created',
                    location: traderRequest.source,
                    timestamp: traderRequest.createdAt,
                    completed: true
                }
            ];

            if (mergeable && mergeable.status === 'accepted') {
                status = 'scheduled';
                statusLabel = 'Assigned to Vehicle — Scheduled';
                carrierTruckLicensePlate = mergeable.truckLicensePlate || null;
                initialMilestones.push({
                    event: 'Assigned to Vehicle',
                    location: traderRequest.source,
                    timestamp: mergeable.createdAt || Date.now(),
                    completed: true
                });
            }

            return res.json({
                traderRequestId,
                source: traderRequest.source,
                destination: traderRequest.destination,
                weightKg: reqWeight,
                status,
                statusLabel,
                carrierTruckLicensePlate,
                pickupStopName: traderRequest.source,
                deliveryStopName: traderRequest.destination,
                pickedUpAt: null,
                deliveredAt: null,
                proofOfDelivery: null,
                milestones: initialMilestones
            });
        }

        // Find pickup and delivery stops
        let pickupStop = null;
        let deliveryStop = null;
        let deliveryShipment = null;

        for (const stop of execution.stops) {
            for (const s of stop.shipments) {
                if (s.shipmentId === traderRequestId) {
                    if (s.operation === 'pickup') pickupStop = stop;
                    if (s.operation === 'delivery') {
                        deliveryStop = stop;
                        deliveryShipment = s;
                    }
                }
            }
        }

        let overallStatus = 'in_transit';
        let statusLabel = 'In Transit';

        if (deliveryShipment && (deliveryShipment.status === 'partial' || deliveryShipment.status === 'partially_delivered' || (typeof deliveryShipment.deliveredWeightKg === 'number' && deliveryShipment.deliveredWeightKg > 0 && deliveryShipment.outstandingWeightKg > 0))) {
            overallStatus = 'partially_delivered';
            statusLabel = `Partially Delivered (${deliveryShipment.deliveredWeightKg} kg delivered, ${deliveryShipment.outstandingWeightKg} kg remaining)`;
        } else if (deliveryStop && deliveryStop.status === 'completed') {
            overallStatus = 'delivered';
            statusLabel = 'Delivered to Destination';
        } else if (deliveryStop && deliveryStop.status === 'failed') {
            overallStatus = 'delivery_failed';
            statusLabel = 'Delivery Attempt Failed';
        } else if (deliveryShipment && deliveryShipment.status === 'failed') {
            overallStatus = 'delivery_failed';
            statusLabel = 'Delivery Attempt Failed';
        } else if (pickupStop && pickupStop.status === 'completed') {
            overallStatus = 'in_transit';
            statusLabel = 'Picked Up & On Highway Route';
        } else if (pickupStop && (pickupStop.status === 'in_progress' || pickupStop.status === 'arrived')) {
            overallStatus = 'pickup_in_progress';
            statusLabel = 'Truck Arrived for Cargo Pickup';
        } else if (pickupStop && pickupStop.status === 'failed') {
            overallStatus = 'pickup_failed';
            statusLabel = 'Pickup Failed at Origin';
        } else {
            overallStatus = 'scheduled';
            statusLabel = 'Assigned to Vehicle — Scheduled';
        }

        // Return clean milestones without exposing other consolidated shipments
        const milestones = [
            {
                event: 'Consignment Created',
                location: traderRequest.source,
                timestamp: traderRequest.createdAt,
                completed: true
            },
            ...execution.stops.map(st => ({
                event: `${st.stopType === 'pickup' ? 'Pickup Stop' : st.stopType === 'delivery' ? (overallStatus === 'partially_delivered' ? 'Delivery Stop (Partial)' : 'Delivery Stop') : 'Waypoint'}: ${st.stopName}`,
                location: st.stopName,
                stopName: st.stopName,
                stopType: st.stopType,
                status: st.status,
                completed: st.status === 'completed' || (st.stopType === 'delivery' && overallStatus === 'partially_delivered'),
                error: st.status === 'failed' ? (st.failureReason || 'Stop operation failed') : null,
                timestamp: st.completedAt || st.arrivedAt || null,
                arrivedAt: st.arrivedAt,
                completedAt: st.completedAt
            }))
        ];

        const deliveredKg = deliveryShipment 
            ? (typeof deliveryShipment.deliveredWeightKg === 'number' ? deliveryShipment.deliveredWeightKg : (overallStatus === 'delivered' ? reqWeight : 0)) 
            : (overallStatus === 'delivered' ? reqWeight : 0);
        const outstandingKg = deliveryShipment 
            ? (typeof deliveryShipment.outstandingWeightKg === 'number' ? deliveryShipment.outstandingWeightKg : (overallStatus === 'delivered' ? 0 : reqWeight)) 
            : (overallStatus === 'delivered' ? 0 : reqWeight);

        res.json({
            traderRequestId,
            source: traderRequest.source,
            destination: traderRequest.destination,
            weightKg: reqWeight,
            deliveredWeightKg: deliveredKg,
            outstandingWeightKg: outstandingKg,
            status: overallStatus,
            statusLabel,
            carrierTruckLicensePlate: execution.truckLicensePlate,
            pickupStopName: pickupStop?.stopName || traderRequest.source,
            deliveryStopName: deliveryStop?.stopName || traderRequest.destination,
            pickedUpAt: pickupStop?.completedAt || null,
            deliveredAt: deliveryStop?.completedAt || null,
            proofOfDelivery: deliveryStop?.proofOfDelivery ? {
                type: deliveryStop.proofOfDelivery.type,
                verificationStatus: deliveryStop.proofOfDelivery.verificationStatus,
                submittedAt: deliveryStop.proofOfDelivery.submittedAt
            } : null,
            milestones
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch trader shipment status: " + err.message });
    }
});

module.exports = driverRouter;

