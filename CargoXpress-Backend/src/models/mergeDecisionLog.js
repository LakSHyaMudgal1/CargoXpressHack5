const mongoose = require('mongoose');
const { Schema } = mongoose;

const mergeDecisionLogSchema = new Schema({
    pairId: {
        type: String,
        required: true,
        index: true
    },
    decision: {
        type: String,
        enum: ['accepted', 'rejected'],
        required: true,
        index: true
    },
    decidedByRole: {
        type: String,
        enum: ['admin', 'driver'],
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        default: null
    },
    driverName: {
        type: String,
        default: null
    },
    carrierTruckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true
    },
    carrierLicensePlate: {
        type: String,
        required: true
    },
    absorbedTruckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true
    },
    absorbedLicensePlate: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    decidedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model('MergeDecisionLog', mergeDecisionLogSchema);
