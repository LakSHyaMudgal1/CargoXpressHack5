const mongoose = require('mongoose')
const { Schema } = mongoose;

const mergeablePairSchema=new Schema ({
    truckOneId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required:true,
    },
    truckOneLicensePlate:{
        type: String,
        required:true,
    },
    truckOneStops:{
        type:[String]
    },
    truckTwoId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required:true,
    },
    truckTwoLicensePlate:{
        type: String,
        required:true
    },
    truckTwoStops:{
        type:[String]
    }
})

module.exports= mongoose.model('MergeablePair', mergeablePairSchema);