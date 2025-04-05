const express= require('express');
const authRouter= express.Router();
const {validateSignupData}=require('../utils/validation')
const bcrypt = require('bcrypt');
const TransportCompany= require('../models/transportCompany');
const Trader= require('../models/trader');
const Admin= require('../models/admin');

authRouter.post('/signup/:userType', async (req, res)=>{
    try{
    const {userType}=req.params;
      if(userType!="company" && userType!= "trader" && userType!= "admin") throw new Error("Invalid User Type");

      let user=null;
        const {password}= req.body;
        const Hashpassword= await bcrypt.hash(password, 10)
    
        if(userType=="company"){
            const {name, emailId, registrationNumber}= req.body;
            validateSignupData(req);
            const company= new TransportCompany({
                name, emailId, password:Hashpassword, registrationNumber
            });
            user=company;
            await company.save();
        }
        
      else if(userType=="trader") {
        const {name, emailId, aadharNumber}= req.body;
        validateSignupData(req);
    
        const trader= new Trader({
            name, emailId, password:Hashpassword, aadharNumber
        });
        user=trader;
        await trader.save();
      }

      else if(userType=="admin") {
        const {name, emailId, aadharNumber}= req.body;
        validateSignupData(req);
    
        const admin= new Admin({
            name, emailId, password:Hashpassword, aadharNumber
        });
        user=admin;
        await admin.save();
      }

      if(user){
        const token= await user.getJWT();
        res.cookie("token", token);
        res.json({message: `${userType} Added Successfully`, data:user})
      }
    
     } 
  
     catch(err){
      res.status(400).send("There is an error" + err);
     }
  })

  authRouter.post('/login', async (req, res) => {
    try {
        const { emailId, password } = req.body;

        let user = await TransportCompany.findOne({ emailId });

        if (!user) {
            user = await Trader.findOne({ emailId });
        }

        if (!user) {
            user = await Admin.findOne({ emailId });
        }

        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
        
        const isPasswordValid = await user.validatePassword(password);

        if (isPasswordValid) {
            const token = await user.getJWT();

            res.cookie("token", token, {
                httpOnly: true,
                secure: true,  
                sameSite: "none",  
            });

            return res.json(user);
        } else {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);  // Debugging log
        res.status(400).json({ message: "There is some error", error: err.message });
    }
});


authRouter.post('/logout', async(req, res)=>{
    res.cookie("token", null, {expires: new Date(Date.now())});
    res.send("LoggedOut Successfully");
})


module.exports= authRouter;