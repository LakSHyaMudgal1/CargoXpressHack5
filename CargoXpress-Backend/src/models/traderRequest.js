const mongoose = require('mongoose');
const { Schema } = mongoose;

const traderRequestSchema = new Schema({
    traderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Trader'
    },
    load: {
        type: [Number],
        default: []
    },
    source: {
        type: String
    },
    destination: {
        type: String,
    },
    stops: {
        type: [String]
    }
});

module.exports = mongoose.model('TraderRequest', traderRequestSchema);
