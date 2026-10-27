const mongoose = require('mongoose');
const { Schema } = mongoose;
const { calculateRequiredCapacity } = require('../utils/capacityCalculation');

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
    requiredCapacity: {
        type: Number
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
}, {
    timestamps: true
});

// Authoritative hook: Compute and validate required truck capacity before saving
traderRequestSchema.pre('validate', function(next) {
    if (this.load && (Array.isArray(this.load) ? this.load.length > 0 : true)) {
        try {
            this.requiredCapacity = calculateRequiredCapacity(this.load);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

traderRequestSchema.pre('save', function(next) {
    if (this.load && (Array.isArray(this.load) ? this.load.length > 0 : true)) {
        try {
            this.requiredCapacity = calculateRequiredCapacity(this.load);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

traderRequestSchema.methods.getRequiredCapacity = function() {
    if (typeof this.requiredCapacity === 'number') {
        return this.requiredCapacity;
    }
    return calculateRequiredCapacity(this.load);
};

traderRequestSchema.statics.calculateRequiredCapacity = calculateRequiredCapacity;

module.exports = mongoose.model('TraderRequest', traderRequestSchema);

