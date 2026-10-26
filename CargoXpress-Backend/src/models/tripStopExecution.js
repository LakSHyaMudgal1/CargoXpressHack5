const mongoose = require('mongoose');
const { Schema } = mongoose;

const shipmentItemSchema = new Schema({
    shipmentId: {
        type: String,
        required: true
    },
    shipmentType: {
        type: String,
        enum: ['carrier_truck', 'absorbed_truck', 'trader_request'],
        default: 'carrier_truck'
    },
    reference: {
        type: String, // e.g. License Plate or Trader Request Reference
        required: true
    },
    cargoDescription: {
        type: String,
        default: 'General Freight'
    },
    weightKg: {
        type: Number,
        default: 0
    },
    deliveredWeightKg: {
        type: Number,
        default: null
    },
    operation: {
        type: String,
        enum: ['pickup', 'delivery'],
        required: true
    },
    status: {
        type: String,
        enum: [
            'pending', 'awaiting_pickup',
            'loaded', 'picked_up', 'in_transit',
            'delivered',
            'partial', 'partially_delivered',
            'failed', 'delivery_failed'
        ],
        default: 'pending'
    },
    failureReason: {
        type: String,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { _id: true });

const stopTransitionAuditSchema = new Schema({
    fromStatus: {
        type: String,
        required: true
    },
    toStatus: {
        type: String,
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    driverName: {
        type: String,
        required: true
    },
    actorRole: {
        type: String,
        enum: ['driver', 'admin', 'dispatcher', 'system'],
        default: 'driver'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    requestId: {
        type: String,
        default: null
    },
    affectedShipments: [{
        shipmentId: { type: String },
        operation: { type: String },
        fromStatus: { type: String },
        toStatus: { type: String },
        deliveredWeightKg: { type: Number, default: null },
        failureReason: { type: String, default: null }
    }],
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, { _id: true });

const proofOfDeliverySchema = new Schema({
    type: {
        type: String,
        enum: ['otp', 'signature', 'photo', 'acknowledgement'],
        default: 'acknowledgement'
    },
    verificationStatus: {
        type: String,
        enum: ['driver_reported', 'verified'],
        default: 'driver_reported' // Marked as driver-reported until independent verification
    },
    otpCode: {
        type: String,
        default: null
    },
    signatureData: {
        type: String,
        default: null
    },
    photoReference: {
        type: String,
        default: null
    },
    submittedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const recipientSchema = new Schema({
    name: {
        type: String,
        trim: true,
        default: null
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: null
    }
}, { _id: false });

const stopExecutionSchema = new Schema({
    stopIndex: {
        type: Number,
        required: true
    },
    stopName: {
        type: String,
        required: true
    },
    stopType: {
        type: String,
        enum: ['pickup', 'delivery', 'pickup_delivery', 'waypoint'],
        default: 'waypoint'
    },
    status: {
        type: String,
        enum: ['pending', 'en_route', 'arrived', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },
    failureReason: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    shipments: [shipmentItemSchema],
    recipient: recipientSchema,
    proofOfDelivery: proofOfDeliverySchema,
    arrivedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    failedAt: {
        type: Date,
        default: null
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    },
    transitionHistory: [stopTransitionAuditSchema]
}, { _id: true });

const tripStopExecutionSchema = new Schema({
    tripId: {
        type: String,
        required: true,
        index: true
    },
    tripType: {
        type: String,
        enum: ['MergedSchedule', 'Route'],
        required: true
    },
    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true,
        index: true
    },
    truckLicensePlate: {
        type: String,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransportCompany',
        default: null
    },
    stops: [stopExecutionSchema],
    currentLoadOnBoard: {
        type: Number,
        default: 0
    },
    totalDeliveredWeight: {
        type: Number,
        default: 0
    },
    lifecycleStatus: {
        type: String,
        enum: ['scheduled', 'in_transit', 'completed', 'cancelled'],
        default: 'scheduled'
    }
}, { timestamps: true });

/**
 * Validates allowed state transitions for a stop.
 * FSM rules:
 * - pending -> en_route, arrived, failed
 * - en_route -> arrived, failed
 * - arrived -> in_progress, failed
 * - in_progress -> completed, failed
 * - completed -> terminal (cannot revert or transition)
 * - failed -> terminal (cannot revert or transition)
 */
tripStopExecutionSchema.statics.isValidTransition = function(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) return true; // Idempotent

    // Terminal states cannot revert
    if (currentStatus === 'completed' || currentStatus === 'failed') {
        return false;
    }

    const transitions = {
        pending: ['en_route', 'arrived', 'failed'],
        en_route: ['arrived', 'failed'],
        arrived: ['in_progress', 'failed'],
        in_progress: ['completed', 'failed']
    };

    return Array.isArray(transitions[currentStatus]) && transitions[currentStatus].includes(targetStatus);
};

/**
 * Gets or initializes the TripStopExecution document for an active trip.
 */
tripStopExecutionSchema.statics.getOrCreateExecution = async function({ tripId, tripType, truckId, truckLicensePlate, companyId, activeTripDoc, truckDoc }) {
    let execution = await this.findOne({ tripId: tripId.toString() });
    if (execution) {
        return execution;
    }

    const MergedSchedule = mongoose.model('MergedSchedule');
    const Route = mongoose.model('Route');
    const MergeableTrader = mongoose.model('MergeableTrader');

    let tripDoc = activeTripDoc;
    if (!tripDoc) {
        if (tripType === 'MergedSchedule') {
            tripDoc = await MergedSchedule.findById(tripId);
        } else {
            tripDoc = await Route.findById(tripId);
        }
    }

    if (!tripDoc) {
        throw new Error(`Trip ${tripId} not found`);
    }

    const stopsList = tripDoc.stops || [];
    const executionStops = [];

    // Collect all shipments related to this trip
    const shipmentManifest = [];

    if (tripType === 'MergedSchedule') {
        const mergedTrucks = tripDoc.mergedFromTrucks || [];
        for (const m of mergedTrucks) {
            const mWeight = Array.isArray(m.load) && m.load.length > 0 ? m.load[0] : (m.load || 0);
            shipmentManifest.push({
                shipmentId: m.id || m.licensePlate,
                shipmentType: m.role === 'carrier' ? 'carrier_truck' : 'absorbed_truck',
                reference: m.licensePlate || 'Consolidated Unit',
                source: m.source,
                destination: m.destination,
                weightKg: Number(mWeight) || 0
            });
        }

        // If carrier itself wasn't in mergedFromTrucks, add carrier's run
        const hasCarrier = mergedTrucks.some(m => m.role === 'carrier');
        if (!hasCarrier && tripDoc.finalSource && tripDoc.finalDestination) {
            const carrierWeight = Array.isArray(tripDoc.finalCurrentLoad) && tripDoc.finalCurrentLoad.length > 0
                ? tripDoc.finalCurrentLoad[0]
                : 0;
            shipmentManifest.push({
                shipmentId: tripDoc.transportationTruckId || truckId.toString(),
                shipmentType: 'carrier_truck',
                reference: tripDoc.transportationTruckLicensePlate || truckLicensePlate,
                source: tripDoc.finalSource,
                destination: tripDoc.finalDestination,
                weightKg: Number(carrierWeight) || 0
            });
        }
    } else {
        // Standard Route
        const weight = (truckDoc && Array.isArray(truckDoc.currentLoad) && truckDoc.currentLoad.length > 0)
            ? truckDoc.currentLoad[0]
            : 0;
        shipmentManifest.push({
            shipmentId: truckId.toString(),
            shipmentType: 'carrier_truck',
            reference: truckLicensePlate,
            source: tripDoc.source,
            destination: tripDoc.destination,
            weightKg: Number(weight) || 0
        });
    }

    // Also include any accepted trader requests merged with this truck
    try {
        const traderRequests = await MergeableTrader.find({
            truckId: truckId.toString(),
            status: 'accepted'
        });

        for (const tr of traderRequests) {
            const trWeight = Array.isArray(tr.load) && tr.load.length > 0 ? tr.load[0] : 0;
            shipmentManifest.push({
                shipmentId: tr.traderRequestId,
                shipmentType: 'trader_request',
                reference: `TR-${tr.traderRequestId.slice(-6).toUpperCase()}`,
                source: tr.source,
                destination: tr.destination,
                weightKg: Number(trWeight) || 0
            });
        }
    } catch (_) {
        // Continue even if trader query is empty
    }

    // Build stop execution items
    for (let i = 0; i < stopsList.length; i++) {
        const stopName = stopsList[i];
        const stopShipments = [];

        for (const item of shipmentManifest) {
            if (item.source === stopName) {
                stopShipments.push({
                    shipmentId: item.shipmentId,
                    shipmentType: item.shipmentType,
                    reference: item.reference,
                    cargoDescription: `${item.shipmentType === 'trader_request' ? 'Trader Cargo' : 'Truck Cargo'} (${item.source} -> ${item.destination})`,
                    weightKg: item.weightKg,
                    operation: 'pickup',
                    status: 'pending'
                });
            }
            if (item.destination === stopName) {
                stopShipments.push({
                    shipmentId: item.shipmentId,
                    shipmentType: item.shipmentType,
                    reference: item.reference,
                    cargoDescription: `${item.shipmentType === 'trader_request' ? 'Trader Cargo' : 'Truck Cargo'} (${item.source} -> ${item.destination})`,
                    weightKg: item.weightKg,
                    operation: 'delivery',
                    status: 'pending'
                });
            }
        }

        const hasPickup = stopShipments.some(s => s.operation === 'pickup');
        const hasDelivery = stopShipments.some(s => s.operation === 'delivery');

        let stopType = 'waypoint';
        if (hasPickup && hasDelivery) {
            stopType = 'pickup_delivery';
        } else if (hasPickup) {
            stopType = 'pickup';
        } else if (hasDelivery) {
            stopType = 'delivery';
        } else if (i === 0) {
            stopType = 'pickup';
        } else if (i === stopsList.length - 1) {
            stopType = 'delivery';
        }

        executionStops.push({
            stopIndex: i,
            stopName,
            stopType,
            status: 'pending',
            shipments: stopShipments,
            notes: null,
            recipient: null,
            proofOfDelivery: null,
            transitionHistory: []
        });
    }

    execution = await this.create({
        tripId: tripId.toString(),
        tripType,
        truckId,
        truckLicensePlate,
        companyId,
        stops: executionStops,
        currentLoadOnBoard: 0,
        totalDeliveredWeight: 0,
        lifecycleStatus: 'scheduled'
    });

    return execution;
};

module.exports = mongoose.model('TripStopExecution', tripStopExecutionSchema);
