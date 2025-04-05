const mongoose = require('mongoose');
const { Schema } = mongoose;

const freeTruckSchema = new Schema({
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
    truckId:{
        type:String,
        required:true
    }
});

module.exports= mongoose.model('FreeTruck', freeTruckSchema);
