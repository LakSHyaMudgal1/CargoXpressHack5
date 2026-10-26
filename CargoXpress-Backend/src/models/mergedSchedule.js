const mongoose = require('mongoose');
const { Schema } = mongoose;

const mergedScheduleSchema = new Schema({
    transportationTruckId: {
        type: String,
        required: true
    },
    transportationTruckLicensePlate: {
        type: String,
        required: true
    },
    mergedFromTrucks: [
        {
            licensePlate: { type: String },
            id: { type: String },
            source: { type: String },
            destination: { type: String },
            stops: { type: [String] },
            load: { type: [Number] },
            companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportCompany' },
            role: { type: String, enum: ['carrier', 'absorbed'], default: 'absorbed' }
        }
    ],
    totalCapacity: {
        type: Number
    },
    finalSource: {
        type: String,
        required: true
    },
    finalDestination: {
        type: String,
        required: true
    },
    stops: {
        type: [String],
        required: true
    },
    finalCurrentLoad: {
        type: [Number], 
        required: true
    },
    finalRemainingLoad: {
        type: [Number], 
        required: true
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected'],
        default: 'accepted'
    }
}, { timestamps: true });

module.exports = mongoose.model('MergedSchedule', mergedScheduleSchema);
