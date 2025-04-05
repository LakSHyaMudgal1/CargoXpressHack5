const mongoose = require("mongoose");
const { Schema } = mongoose;

const traderMergedSchema = new Schema({
    traderId: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "Trader"
    },
    truckId: {
        type: String,
        // required: true
    },
    licensePlate: {
        type: String,
        // required: true
    },
    load: {
        type: [Number],
        // required: true
    },
    source: {
        type: String,
        // required: true
    },
    destination: {
        type: String,
        // required: true
    },
    stops: {
        type: [String],
        // required: true
    },
    // freeTruckUsed: {
    //     type: Boolean,
    //     default: false
    // }
});

module.exports = mongoose.model("TraderMerged", traderMergedSchema);
