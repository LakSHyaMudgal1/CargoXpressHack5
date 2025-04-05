const mongoose = require('mongoose')
const { Schema } = mongoose;

const routeSchema = new Schema({
    truckId:{
        type: mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'Truck'
    },
    source:{
        type: String, 
    },
    destination:{
        type: String,
    },
    stops:{
        type:[String],
    },
},
{
    timestamps:true
}
);

module.exports= mongoose.model('Route', routeSchema);
