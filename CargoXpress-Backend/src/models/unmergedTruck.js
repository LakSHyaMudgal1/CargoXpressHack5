const mongoose = require('mongoose');
const { Schema } = mongoose;

const unmergedTruckSchema = new Schema({
    licensePlate: { 
        type: String,
        required: true,
        unique: true,
    },

    totalCapacity: {
        type: Number,
    },
    currentLoad: {
        type: [Number],
        default: [] 
    },

    remainingLoad: {
        type: [Number],
        default: [] 
    },
    
    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',  // Reference to the 'Truck' model
        required: true
    },
    source:{
        type: String, 
    },
    destination:{
        type: String,
    },
    stops:{
        type:[String],
    }
});

module.exports = mongoose.model('UnmergedTruck', unmergedTruckSchema);
