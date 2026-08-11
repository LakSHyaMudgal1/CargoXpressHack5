const mongoose = require("mongoose");
const { Schema } = mongoose;

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

module.exports = mongoose.model("MergeableTrader", mergeableTraderSchema);
