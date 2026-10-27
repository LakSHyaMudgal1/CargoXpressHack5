const express = require('express');
const mongoose = require('mongoose');
const scheduleDeliveryRouter = express.Router();
const { companyAuth, traderAuth, adminAuth } = require('../middlewares/auth');
const Truck = require('../models/truck'); 
const Route = require('../models/route'); 
const TraderRequest = require('../models/traderRequest');
const FreeTruck = require('../models/freeTruck');
const MergedSchedule = require('../models/mergedSchedule');
const MergeablePair = require('../models/mergeablePair');
const MergeableTrader = require('../models/mergeableTrader');
const DriverAssignment = require('../models/driverAssignment');
const TripStopExecution = require('../models/tripStopExecution');
const MergeDecisionLog = require('../models/mergeDecisionLog');
const { validateTruckData } = require('../utils/validation');
const { calculateRequiredCapacity } = require('../utils/capacityCalculation');

scheduleDeliveryRouter.get('/scheduleDelivery/checkplate', companyAuth, async (req, res) => {
    try {
        const { licensePlate } = req.query;
        if (!licensePlate) return res.json({ exists: false });
        const existing = await Truck.findOne({ licensePlate: licensePlate.trim().toUpperCase() });
        res.json({ exists: !!existing });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

scheduleDeliveryRouter.post('/scheduleDelivery/addtruck', companyAuth, async (req, res) => {
    try {
        const { licensePlate, totalCapacity, currentLoad } = req.body;
        validateTruckData(req);
        
        const remainingLoad = (currentLoad || []).map(load => totalCapacity - load);
        const companyId = req.company._id; 

        if (!licensePlate || !totalCapacity) {
            return res.status(400).json({ message: "License plate and total capacity are required." });
        }

        const cleanPlate = licensePlate.trim().toUpperCase();

        const existing = await Truck.findOne({ licensePlate: cleanPlate });
        if (existing) {
            if (existing.companyId.toString() !== companyId.toString()) {
                return res.status(403).json({ message: `Vehicle ${cleanPlate} is registered to another transport company.` });
            }
            return res.status(400).json({ message: `A truck with license plate "${cleanPlate}" already exists.` });
        }

        const newTruck = new Truck({
            licensePlate: cleanPlate,
            companyId,
            totalCapacity,
            currentLoad: currentLoad || [],
            remainingLoad,
        });

        await newTruck.save();

        res.status(201).json({ message: "Truck added successfully", data: newTruck });
    } catch (err) {
        console.error(err.stack);
        if (err.code === 11000) {
            return res.status(400).json({ message: `A truck with license plate "${err.keyValue?.licensePlate}" already exists.` });
        }
        res.status(400).json({ message: err.message });
    }
});

scheduleDeliveryRouter.post('/scheduleDelivery/addroute', companyAuth, async (req, res) => {
    try {
        const { licensePlate, source, destination, stops } = req.body;
        const companyId = req.company._id;

        if (!licensePlate || !source || !destination) {
            return res.status(400).json({ message: "licensePlate, source, and destination are required." });
        }

        const cleanPlate = licensePlate.trim().toUpperCase();
        const truck = await Truck.findOne({ licensePlate: cleanPlate, companyId });
        if (!truck) {
            // Check if vehicle belongs to another company to enforce cross-company isolation explicitly
            const otherTruck = await Truck.findOne({ licensePlate: cleanPlate });
            if (otherTruck) {
                return res.status(403).json({ message: "You are not authorized to create or modify routes for another company's vehicle." });
            }
            return res.status(404).json({ message: "Truck not found." });
        }

        const cleanStops = Array.isArray(stops)
            ? stops.map(s => (typeof s === 'string' ? s.trim() : s)).filter(Boolean)
            : [];

        const newRoute = new Route({
            truckId: truck._id, 
            source: source.trim(),
            destination: destination.trim(),
            stops: cleanStops,
        });

        await newRoute.save();

        res.status(201).json({ message: "Route added successfully", data: newRoute });
    } catch (err) {
        console.error(err.stack);
        res.status(400).json({ message: err.message });
    }
});

scheduleDeliveryRouter.delete('/scheduleDelivery/deletescheduleDelivery/:id', companyAuth, async (req, res) => {
    try {
        const routeId = req.params.id;
        const companyId = req.company._id;

        const route = await Route.findById(routeId).populate('truckId');
        if (!route) {
            return res.status(404).json({ message: "Route not found." });
        }

        if (!route.truckId || !route.truckId.companyId) {
            return res.status(400).json({ message: "Invalid route or truck data." });
        }

        if (route.truckId.companyId.toString() !== companyId.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this route." });
        }

        await Route.findByIdAndDelete(routeId);

        res.json({ message: "Route deleted successfully", routeId });
    } catch (err) {
        console.error(err.stack); 
        res.status(400).json({ message: "Error deleting route: " + err.message });
    }
});

scheduleDeliveryRouter.post('/scheduleDelivery/traderRequest', traderAuth, async (req, res) => {
    try {
        const { load, source, destination, stops } = req.body;
        const traderId = req.trader._id;

        if (!traderId || !source || !destination) {
            return res.status(400).send("Trader ID, source, and destination are required.");
        }

        // Authoritative backend validation and calculation: Never trust frontend calculation
        const requiredCapacity = calculateRequiredCapacity(load);

        const newTraderRequest = new TraderRequest({
            traderId,
            load,
            requiredCapacity,
            source,
            destination,
            stops,
        });

        await newTraderRequest.save();

        res.status(201).send("Trader request added successfully: " + newTraderRequest);
    } catch (err) {
        console.error(err.stack);
        res.status(400).send("Error adding trader request: " + err.message);
    }
});


// ─── ADMIN FLEET OVERVIEW ─────────────────────────────────────────────────────

scheduleDeliveryRouter.get('/admin/fleet-overview', adminAuth, async (req, res) => {
    try {
        // 1. Trucks & FreeTruck pool
        const allTrucks = await Truck.find().lean();
        const freeTrucks = await FreeTruck.find().lean();
        const freeTruckIds = new Set(freeTrucks.map(ft => ft.truckId.toString()));

        // Active trucks are registered trucks not in the absorbed free pool
        const activeTrucks = allTrucks.filter(t => !freeTruckIds.has(t._id.toString()));

        // 2. Pending Merge Offers (Pairs)
        const pendingPairsCount = await MergeablePair.countDocuments();

        // 3. Active Consolidated Schedules
        const mergedSchedules = await MergedSchedule.find({ status: 'accepted' }).sort({ createdAt: -1 }).lean();

        // 4. Pending Trader Requests (requests not yet processed into MergeableTrader)
        const processedTraders = await MergeableTrader.find({}, 'traderRequestId');
        const processedIds = new Set(processedTraders.map(t => t.traderRequestId.toString()));
        const allTraderRequests = await TraderRequest.find().populate('traderId', 'name emailId').sort({ createdAt: -1 }).lean();
        const pendingTraderRequests = allTraderRequests.filter(r => !processedIds.has(r._id.toString()));

        // 5. Completed & delayed/failed deliveries from TripStopExecution
        const allExecutions = await TripStopExecution.find().lean();
        let completedDeliveries = 0;
        let delayedOrFailedDeliveries = 0;
        let inProgressStops = 0;

        for (const exec of allExecutions) {
            for (const stop of (exec.stops || [])) {
                if (stop.stopType === 'delivery') {
                    if (stop.status === 'completed') completedDeliveries++;
                    else if (stop.status === 'failed') delayedOrFailedDeliveries++;
                    else if (['in_progress', 'arrived', 'en_route'].includes(stop.status)) inProgressStops++;
                }
            }
        }

        // 6. Capacity utilization across active consolidated schedules
        let totalAssignedCapacity = 0;
        let totalCurrentLoad = 0;
        const scheduleUtilization = mergedSchedules.map(s => {
            const cap = s.totalCapacity || 1;
            const maxLoad = Array.isArray(s.finalCurrentLoad) && s.finalCurrentLoad.length > 0 
                ? Math.max(...s.finalCurrentLoad) 
                : 0;
            totalAssignedCapacity += cap;
            totalCurrentLoad += maxLoad;
            const pct = Math.min(100, Math.round((maxLoad / cap) * 100));
            return {
                id: s._id,
                carrierPlate: s.transportationTruckLicensePlate,
                source: s.finalSource,
                destination: s.finalDestination,
                totalCapacity: cap,
                peakLoad: maxLoad,
                utilizationPct: pct,
                stopsCount: (s.stops || []).length,
                mergedTrucksCount: (s.mergedFromTrucks || []).length,
                createdAt: s.createdAt
            };
        });

        const overallUtilizationPct = totalAssignedCapacity > 0 
            ? Math.min(100, Math.round((totalCurrentLoad / totalAssignedCapacity) * 100))
            : 0;

        // 7. Recent Merge & Dispatch Activity
        const recentDecisions = await MergeDecisionLog.find()
            .sort({ decidedAt: -1 })
            .limit(10)
            .lean();

        res.json({
            metrics: {
                totalRegisteredTrucks: allTrucks.length,
                activeTrucksCount: activeTrucks.length,
                freeTruckPoolCount: freeTrucks.length,
                pendingMergeOffersCount: pendingPairsCount,
                activeConsolidatedSchedulesCount: mergedSchedules.length,
                pendingTraderRequestsCount: pendingTraderRequests.length,
                completedDeliveries,
                delayedOrFailedDeliveries,
                inProgressStops,
                overallUtilizationPct,
            },
            freeTrucks,
            scheduleUtilization,
            recentDecisions,
            pendingTraderRequests: pendingTraderRequests.slice(0, 10),
        });
    } catch (err) {
        console.error("Failed to fetch admin fleet overview:", err);
        res.status(500).json({ message: "Failed to fetch admin fleet overview: " + err.message });
    }
});

// ─── TRANSPORT COMPANY FLEET MANAGEMENT ───────────────────────────────────────

scheduleDeliveryRouter.get('/company/fleet', companyAuth, async (req, res) => {
    try {
        const companyId = req.company._id;

        // 1. Trucks owned by this company
        const trucks = await Truck.find({ companyId }).lean();
        const truckIds = trucks.map(t => t._id);

        // 2. Routes assigned to these trucks
        const routes = await Route.find({ truckId: { $in: truckIds } }).lean();
        const routeByTruckId = {};
        for (const r of routes) {
            routeByTruckId[r.truckId.toString()] = r;
        }

        // 3. Active driver assignments for this company
        const activeAssignments = await DriverAssignment.find({
            companyId,
            status: 'active'
        }).populate('driverId', 'name phone licenseNumber status photoUrl').lean();

        const assignmentByTruckId = {};
        for (const a of activeAssignments) {
            if (a.truckId) {
                assignmentByTruckId[a.truckId.toString()] = a;
            }
        }

        // 4. FreeTruck status for these trucks (if absorbed)
        const freeTruckDocs = await FreeTruck.find({ companyId }).lean();
        const freeTruckSet = new Set(freeTruckDocs.map(ft => ft.truckId.toString()));

        // 5. Build authorized operational trip information for company's own fleet
        // Note: Internal MergedSchedule records and cross-company merge manifests are strictly excluded.
        let totalCapacity = 0;
        let totalCurrentLoad = 0;
        let availableCount = 0;
        let activeTripCount = 0;

        const enrichedTrucks = trucks.map(t => {
            const tid = t._id.toString();
            const route = routeByTruckId[tid] || null;
            const assignment = assignmentByTruckId[tid] || null;
            const isFree = freeTruckSet.has(tid);

            const peakLoad = Array.isArray(t.currentLoad) && t.currentLoad.length > 0 
                ? Math.max(...t.currentLoad) 
                : 0;
            const capacity = t.totalCapacity || 0;
            const utilPct = capacity > 0 ? Math.min(100, Math.round((peakLoad / capacity) * 100)) : 0;

            totalCapacity += capacity;
            totalCurrentLoad += peakLoad;

            let status = 'available';
            if (isFree) {
                status = 'available_in_pool';
                availableCount++;
            } else if (assignment && route) {
                status = 'active_assignment';
                activeTripCount++;
            } else if (!assignment) {
                status = 'available_unassigned';
                availableCount++;
            } else {
                status = 'assigned_awaiting_route';
            }

            return {
                ...t,
                route,
                assignment,
                isFreeInPool: isFree,
                peakLoad,
                utilizationPct: utilPct,
                operationalStatus: status
            };
        });

        // Authorized operational trips for this company's own fleet
        const authorizedTrips = enrichedTrucks
            .filter(t => t.route && t.assignment)
            .map(t => ({
                truckId: t._id,
                licensePlate: t.licensePlate,
                driver: t.assignment.driverId ? {
                    id: t.assignment.driverId._id,
                    name: t.assignment.driverId.name,
                    phone: t.assignment.driverId.phone
                } : null,
                route: {
                    id: t.route._id,
                    source: t.route.source,
                    destination: t.route.destination,
                    stops: t.route.stops
                },
                operationalStatus: t.operationalStatus,
                currentLoad: t.currentLoad || [],
                peakLoad: t.peakLoad,
                totalCapacity: t.totalCapacity,
                utilizationPct: t.utilizationPct
            }));

        const overallUtilization = totalCapacity > 0 
            ? Math.min(100, Math.round((totalCurrentLoad / totalCapacity) * 100)) 
            : 0;

        res.json({
            trucks: enrichedTrucks,
            stats: {
                totalTrucks: trucks.length,
                availableTrucks: availableCount,
                activeAssignments: activeAssignments.length,
                activeTrips: activeTripCount,
                freeTrucksInPool: freeTruckDocs.length,
                overallUtilizationPct: overallUtilization,
                totalCapacityKg: totalCapacity,
                totalLoadedKg: totalCurrentLoad,
            },
            authorizedTrips
        });
    } catch (err) {
        console.error("Failed to fetch company fleet:", err);
        res.status(500).json({ message: "Failed to fetch company fleet: " + err.message });
    }
});

// ─── COMPANY TRIP DETAILS & VERIFICATION ─────────────────────────────────────

scheduleDeliveryRouter.get('/company/trip-details/:tripId', companyAuth, async (req, res) => {
    try {
        const { tripId } = req.params;
        const companyId = req.company._id;

        if (!mongoose.Types.ObjectId.isValid(tripId)) {
            return res.status(400).json({ message: "Invalid trip ID format" });
        }

        // 1. Look up Route first
        const route = await Route.findById(tripId).populate('truckId');
        if (route && route.truckId) {
            // Verify ownership
            if (route.truckId.companyId.toString() !== companyId.toString()) {
                return res.status(403).json({
                    message: "Access denied. You do not own the vehicle for this trip."
                });
            }

            const truck = route.truckId;
            const activeAssignment = await DriverAssignment.findOne({
                truckId: truck._id,
                status: 'active'
            }).populate('driverId', 'name phone licenseNumber status photoUrl');

            return res.json({
                trip: {
                    id: route._id,
                    truckId: truck._id,
                    licensePlate: truck.licensePlate,
                    source: route.source,
                    destination: route.destination,
                    stops: route.stops,
                    currentLoad: truck.currentLoad || [],
                    remainingLoad: truck.remainingLoad || [],
                    totalCapacity: truck.totalCapacity,
                    driver: activeAssignment?.driverId ? {
                        id: activeAssignment.driverId._id,
                        name: activeAssignment.driverId.name,
                        phone: activeAssignment.driverId.phone
                    } : null,
                    operationalStatus: activeAssignment ? 'active_assignment' : 'assigned_awaiting_driver'
                }
            });
        }

        // 2. If the user passed a MergedSchedule ID, ensure internal merge management data is blocked
        const internalSchedule = await MergedSchedule.findById(tripId);
        if (internalSchedule) {
            // Determine if the company owns any truck involved in this schedule
            const ownsCarrier = await Truck.exists({
                _id: internalSchedule.transportationTruckId,
                companyId
            });
            const ownsAbsorbed = internalSchedule.mergedFromTrucks?.some(
                t => t.companyId && t.companyId.toString() === companyId.toString()
            );

            if (!ownsCarrier && !ownsAbsorbed) {
                return res.status(403).json({
                    message: "Access denied. You are not authorized to view this trip."
                });
            }

            // Company only receives its own operational information; no internal merge manifest or competitor data
            if (ownsCarrier) {
                const carrierTruck = await Truck.findById(internalSchedule.transportationTruckId);
                const activeAssignment = await DriverAssignment.findOne({
                    truckId: carrierTruck._id,
                    status: 'active'
                }).populate('driverId', 'name phone licenseNumber status photoUrl');

                return res.json({
                    trip: {
                        id: internalSchedule._id,
                        truckId: carrierTruck._id,
                        licensePlate: carrierTruck.licensePlate,
                        source: internalSchedule.finalSource,
                        destination: internalSchedule.finalDestination,
                        stops: internalSchedule.stops,
                        currentLoad: carrierTruck.currentLoad || [],
                        remainingLoad: carrierTruck.remainingLoad || [],
                        totalCapacity: carrierTruck.totalCapacity,
                        driver: activeAssignment?.driverId ? {
                            id: activeAssignment.driverId._id,
                            name: activeAssignment.driverId.name,
                            phone: activeAssignment.driverId.phone
                        } : null,
                        operationalStatus: 'active_assignment'
                    }
                });
            } else {
                // Absorbed truck belonging to this company
                const absorbedInfo = internalSchedule.mergedFromTrucks.find(
                    t => t.companyId && t.companyId.toString() === companyId.toString()
                );
                return res.json({
                    trip: {
                        id: internalSchedule._id,
                        truckId: absorbedInfo.id,
                        licensePlate: absorbedInfo.licensePlate,
                        source: absorbedInfo.source,
                        destination: absorbedInfo.destination,
                        stops: absorbedInfo.stops,
                        currentLoad: absorbedInfo.load || [],
                        operationalStatus: 'available_in_pool'
                    }
                });
            }
        }

        return res.status(404).json({ message: "Trip not found." });
    } catch (err) {
        console.error("Failed to fetch trip details:", err);
        res.status(500).json({ message: "Failed to fetch trip details: " + err.message });
    }
});

// ─── TRADER MY SHIPMENT REQUESTS & TRACKING ──────────────────────────────────

scheduleDeliveryRouter.get('/trader/my-requests', traderAuth, async (req, res) => {
    try {
        const traderId = req.trader._id;

        // 1. Get all requests created by this trader (STRICTLY scoped to traderId)
        const requests = await TraderRequest.find({ traderId }).sort({ createdAt: -1 }).lean();

        // 2. Fetch all TripStopExecutions where any stop has this shipment
        const requestIds = requests.map(r => r._id.toString());
        const executions = await TripStopExecution.find({
            'stops.shipments.shipmentId': { $in: requestIds }
        }).lean();

        // Index executions by shipmentId
        const executionByRequestId = {};
        for (const exec of executions) {
            for (const stop of (exec.stops || [])) {
                for (const ship of (stop.shipments || [])) {
                    if (requestIds.includes(ship.shipmentId)) {
                        executionByRequestId[ship.shipmentId] = exec;
                    }
                }
            }
        }

        // 3. Fetch MergeableTrader records to see if assigned/merged
        const mergeableRecords = await MergeableTrader.find({
            traderRequestId: { $in: requestIds }
        }).lean();
        const mergeableByReqId = {};
        for (const m of mergeableRecords) {
            mergeableByReqId[m.traderRequestId.toString()] = m;
        }

        // 4. Enrich each request with delivery milestones and operational status
        let awaitingAssignmentCount = 0;
        let inTransitCount = 0;
        let deliveredCount = 0;
        let failedCount = 0;

        const enrichedRequests = requests.map(reqDoc => {
            const rid = reqDoc._id.toString();
            const exec = executionByRequestId[rid] || null;
            const mergeRecord = mergeableByReqId[rid] || null;

            let reqWeight = 0;
            if (typeof reqDoc.requiredCapacity === 'number') {
                reqWeight = reqDoc.requiredCapacity;
            } else if (reqDoc.load) {
                try {
                    reqWeight = calculateRequiredCapacity(reqDoc.load);
                } catch (_) {
                    reqWeight = Array.isArray(reqDoc.load) && reqDoc.load.length > 0 ? reqDoc.load[0] : 0;
                }
            } else if (typeof reqDoc.load === 'number') {
                reqWeight = reqDoc.load;
            }

            let status = 'awaiting_assignment';
            let statusLabel = 'Awaiting Carrier Assignment';
            let carrierLicensePlate = null;
            let driverName = null;
            let deliveredWeight = 0;
            let outstandingWeight = reqWeight;
            let failureReason = null;
            let latestMilestone = 'Consignment Registered';
            let milestones = [
                {
                    event: 'Request Created',
                    location: reqDoc.source,
                    timestamp: reqDoc.createdAt,
                    completed: true
                }
            ];

            if (mergeRecord) {
                carrierLicensePlate = mergeRecord.truckLicensePlate || null;
                status = 'assigned';
                statusLabel = 'Assigned to Truck ' + (carrierLicensePlate || '');
                milestones.push({
                    event: 'Load Merged & Carrier Assigned',
                    location: reqDoc.source,
                    timestamp: mergeRecord.createdAt || reqDoc.createdAt,
                    completed: true
                });
            }

            if (exec) {
                carrierLicensePlate = exec.carrierTruckLicensePlate || carrierLicensePlate;
                driverName = exec.driverName || null;

                let pickupStop = null;
                let deliveryStop = null;

                for (const stop of (exec.stops || [])) {
                    for (const s of (stop.shipments || [])) {
                        if (s.shipmentId === rid) {
                            if (s.operation === 'pickup') pickupStop = stop;
                            if (s.operation === 'delivery') deliveryStop = stop;
                        }
                    }
                }

                if (pickupStop && pickupStop.status === 'completed') {
                    status = 'in_transit';
                    statusLabel = 'In Transit to Destination';
                    latestMilestone = 'Picked up at ' + (pickupStop.stopName || reqDoc.source);
                    milestones.push({
                        event: 'Picked Up',
                        location: pickupStop.stopName || reqDoc.source,
                        timestamp: pickupStop.actualDeparture || pickupStop.actualArrival || Date.now(),
                        completed: true
                    });
                }

                if (deliveryStop) {
                    const deliveryShipment = (deliveryStop.shipments || []).find(s => s.shipmentId === rid);
                    if (deliveryShipment && (deliveryShipment.status === 'partial' || deliveryShipment.status === 'partially_delivered' || (typeof deliveryShipment.deliveredWeightKg === 'number' && deliveryShipment.deliveredWeightKg > 0 && deliveryShipment.outstandingWeightKg > 0))) {
                        status = 'partially_delivered';
                        statusLabel = `Partially Delivered (${deliveryShipment.deliveredWeightKg} kg delivered, ${deliveryShipment.outstandingWeightKg} kg remaining)`;
                        latestMilestone = 'Partial Cargo Handover Completed';
                        deliveredWeight = deliveryShipment.deliveredWeightKg;
                        outstandingWeight = deliveryShipment.outstandingWeightKg;
                        failureReason = deliveryShipment.failureReason || null;
                        milestones.push({
                            event: 'Partially Delivered',
                            location: deliveryStop.stopName || reqDoc.destination,
                            timestamp: Date.now(),
                            completed: true
                        });
                    } else if (deliveryStop.status === 'completed') {
                        status = 'delivered';
                        statusLabel = 'Delivered Successfully';
                        latestMilestone = 'Delivered at ' + (deliveryStop.stopName || reqDoc.destination);
                        deliveredWeight = reqWeight;
                        outstandingWeight = 0;
                        milestones.push({
                            event: 'Delivered',
                            location: deliveryStop.stopName || reqDoc.destination,
                            timestamp: deliveryStop.actualArrival || Date.now(),
                            completed: true
                        });
                    } else if (deliveryStop.status === 'failed' || deliveryShipment?.status === 'failed') {
                        status = 'delivery_failed';
                        statusLabel = 'Delivery Exception / Failed';
                        latestMilestone = 'Delivery Attempt Failed';
                        failureReason = deliveryShipment?.failureReason || deliveryStop.failureReason || 'Recipient unavailable or issue at destination';
                        milestones.push({
                            event: 'Delivery Failed',
                            location: deliveryStop.stopName || reqDoc.destination,
                            timestamp: deliveryStop.actualArrival || Date.now(),
                            completed: false,
                            error: failureReason
                        });
                    }
                }
            }

            // Update summary counters
            if (status === 'delivered') deliveredCount++;
            else if (status === 'delivery_failed') failedCount++;
            else if (status === 'partially_delivered' || status === 'in_transit' || status === 'assigned') inTransitCount++;
            else awaitingAssignmentCount++;

            return {
                ...reqDoc,
                weightKg: reqWeight,
                status,
                statusLabel,
                carrierLicensePlate,
                driverName,
                deliveredWeight,
                outstandingWeight,
                failureReason,
                latestMilestone,
                milestones
            };
        });

        res.json({
            requests: enrichedRequests,
            stats: {
                totalRequests: requests.length,
                awaitingAssignment: awaitingAssignmentCount,
                inTransit: inTransitCount,
                delivered: deliveredCount,
                failed: failedCount,
            },
            recentActivity: enrichedRequests
                .map(r => ({
                    requestId: r._id,
                    source: r.source,
                    destination: r.destination,
                    weightKg: r.weightKg,
                    status: r.status,
                    statusLabel: r.statusLabel,
                    updatedAt: r.updatedAt || r.createdAt
                }))
                .slice(0, 8)
        });
    } catch (err) {
        console.error("Failed to fetch trader requests:", err);
        res.status(500).json({ message: "Failed to fetch trader requests: " + err.message });
    }
});

module.exports = scheduleDeliveryRouter;