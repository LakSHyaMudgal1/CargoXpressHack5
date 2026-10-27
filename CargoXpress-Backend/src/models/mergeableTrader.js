const mongoose = require("mongoose");
const { Schema } = mongoose;
const { calculateRequiredCapacity } = require('../utils/capacityCalculation');

const mergeableTraderSchema = new Schema({
    traderRequestId: {
        type: String,
    },
    traderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trader"
    },
    truckId: {
        type: String,
    },
    licensePlate: {
        type: String,
    },
    load: {
        type: [Number],
    },
    requiredCapacity: {
        type: Number,
    },
    source: {
        type: String,
    },
    destination: {
        type: String,
    },
    stops: {
        type: [String],
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected'],
        default: 'accepted'
    }
}, { timestamps: true });

mergeableTraderSchema.pre('validate', function(next) {
    if (this.load && (Array.isArray(this.load) ? this.load.length > 0 : true)) {
        try {
            this.requiredCapacity = calculateRequiredCapacity(this.load);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

mergeableTraderSchema.pre('save', function(next) {
    if (this.load && (Array.isArray(this.load) ? this.load.length > 0 : true)) {
        try {
            this.requiredCapacity = calculateRequiredCapacity(this.load);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model("MergeableTrader", mergeableTraderSchema);

