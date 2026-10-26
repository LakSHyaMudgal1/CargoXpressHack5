const mongoose = require('mongoose');
const { Schema } = mongoose;

const deliveryEvidenceSchema = new Schema({
    evidenceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    },
    sizeBytes: {
        type: Number,
        required: true
    },
    tripId: {
        type: String,
        required: true,
        index: true
    },
    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    stopIndex: {
        type: Number,
        required: true
    },
    shipmentId: {
        type: String,
        default: null
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransportCompany',
        default: null
    },
    verificationStatus: {
        type: String,
        enum: ['driver_reported', 'verified', 'rejected'],
        default: 'driver_reported'
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryEvidence', deliveryEvidenceSchema);
