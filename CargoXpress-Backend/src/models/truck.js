const mongoose = require('mongoose');
const { Schema } = mongoose;

const truckSchema = new Schema({
    licensePlate:{ 
        type: String,
        required: true,
        unique:true,
    },

    companyId:{
        type: mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'Company'
    },

    totalCapacity:{
        type: Number,
    },
    currentLoad:{
        type: [Number],
        default: [] 
    },

    remainingLoad:{
        type:[Number],
        default: [] 
    }

});

module.exports= mongoose.model('Truck', truckSchema);
