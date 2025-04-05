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
    }
}, { timestamps: true });

module.exports = mongoose.model('MergedSchedule', mergedScheduleSchema);
