const validator=require('validator');

const validateSignupData=(req)=>{
    const {name, emailId, password}=req.body;

    if(!name){
        throw new Error("Invalid Name");
    }

    else if(!validator.isEmail(emailId)){
        throw new Error("Invalid EmailId");
    }

    else if(!validator.isStrongPassword(password)){
        throw new Error("Enter a Strong password");
    }
}

const validateEditData=(req)=>{
    const editableFields = ["name", "photoUrl", "address", "aadharNumber", "registrationNumber", "emailId"];

    const isEditableField= Object.keys(req.body).every((k)=>editableFields.includes(k));

    if(!isEditableField){
        throw new Error("Edit Not Allowed");
    }

      if (req.body.photoUrl && !validator.isURL(req.body.photoUrl)) {
        throw new Error("Enter a valid PhotoUrl");
      }
}

const { calculateRequiredCapacity } = require('./capacityCalculation');

const validateTruckData=(req)=>{
    const {currentLoad, totalCapacity}=req.body;
    const capacity = Number(totalCapacity);
    if(!currentLoad.every(load => Number(load) < capacity)) {
        throw new Error("Current Load cannot exceed Capacity");
    }
}

const validateTraderRequestData=(req)=>{
    const { source, destination, load } = req.body;
    if (!source || typeof source !== 'string' || !source.trim()) {
        throw new Error("Source location is required");
    }
    if (!destination || typeof destination !== 'string' || !destination.trim()) {
        throw new Error("Destination location is required");
    }
    return calculateRequiredCapacity(load);
}

module.exports={
    validateSignupData,
    validateEditData,
    validateTruckData,
    validateTraderRequestData,
    calculateRequiredCapacity
};