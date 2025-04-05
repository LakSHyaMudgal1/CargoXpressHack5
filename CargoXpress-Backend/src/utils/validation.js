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

const validateTruckData=(req)=>{
    const {currentLoad, totalCapacity}=req.body;
    if(!currentLoad.every(load => load < totalCapacity)) {
        throw new Error("Current Load cannot exceed Capacity");
    }
}


module.exports={validateSignupData, validateEditData, validateTruckData};