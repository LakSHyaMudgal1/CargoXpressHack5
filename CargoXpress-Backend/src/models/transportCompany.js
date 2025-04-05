
const mongoose= require('mongoose');
const validator= require('validator');
const { Schema } = mongoose;
const jwt=require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { removeListener } = require('./admin');

const transportCompanySchema = new Schema({
    name:{ 
        type: String,
        required: true,
    },

    emailId:{
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Not a valid Email Id");
            }
        }
    },

    password:{
        required: true,
        type: String,
        minLength:8,
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Enter a Strong Password");
            }
        }
    },
    photoUrl:{
        type:String,
        default: "https://cdn-icons-png.flaticon.com/256/149/149071.png",
        validate(value){
            if(!validator.isURL(value)){
                throw new Error("Enter a valid URL");
            }
        }
    },
    
    registrationNumber:{
        type: String,
        required:true
    },

    address:{
        type: String,
    },
});


transportCompanySchema.methods.getJWT= async function(){
    const role="transportCompany"
    const token= await jwt.sign({_id:this._id, role: role }, process.env.JWT_SECRET, {expiresIn:'7d'});
    return token;
}

transportCompanySchema.methods.validatePassword= async function(passwordInputByCompany){
    const isPasswordValid= await bcrypt.compare(passwordInputByCompany, this.password);
    return(isPasswordValid);
}

module.exports= mongoose.model('TransportCompany', transportCompanySchema);
