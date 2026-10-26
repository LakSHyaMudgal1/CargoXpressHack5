const express= require('express');
const authRouter= express.Router();
const {validateSignupData}=require('../utils/validation')
const bcrypt = require('bcrypt');
const TransportCompany= require('../models/transportCompany');
const Trader= require('../models/trader');
const Admin= require('../models/admin');
const Driver= require('../models/driver');

authRouter.post('/signup/:userType', async (req, res)=>{
    try{
    const {userType}=req.params;
      if(userType!="company" && userType!= "trader" && userType!= "admin" && userType!= "driver") throw new Error("Invalid User Type");

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

      else if(userType=="driver") {
        const {name, emailId, phone, licenseNumber, companyId}= req.body;
        validateSignupData(req);
        if(!phone) throw new Error("Phone number is required");
        if(!licenseNumber) throw new Error("License number is required");
        if(!companyId) throw new Error("Company ID is required");

        const companyExists = await TransportCompany.findById(companyId);
        if(!companyExists) throw new Error("Transport company does not exist");

        const driver= new Driver({
            name, emailId, password:Hashpassword, phone, licenseNumber, companyId
        });
        user=driver;
        await driver.save();
      }

      if(user){
        const token= await user.getJWT();
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;
        userObj.token = token;

        res.json({message: `${userType} Added Successfully`, data: userObj, token});
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
            user = await Driver.findOne({ emailId });
        }

        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Check if driver account is disabled
        if (user.status && user.status === 'disabled') {
            return res.status(403).json({ message: "Driver account is disabled. Contact your transport company." });
        }
        
        const isPasswordValid = await user.validatePassword(password);

        if (isPasswordValid) {
            const token = await user.getJWT();

            const isProduction = process.env.NODE_ENV === "production";
            res.cookie("token", token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
            });

            const userObj = user.toObject ? user.toObject() : { ...user };
            delete userObj.password;
            userObj.token = token;

            return res.json(userObj);
        } else {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);  // Debugging log
        res.status(400).json({ message: "There is some error", error: err.message });
    }
});

authRouter.post('/driver/login', async (req, res) => {
    try {
        const { emailId, phone, password } = req.body;
        if ((!emailId && !phone) || !password) {
            return res.status(400).json({ message: "Email or phone and password are required" });
        }

        const query = emailId ? { emailId: emailId.toLowerCase().trim() } : { phone: phone.trim() };
        const driver = await Driver.findOne(query);

        if (!driver) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        if (driver.status === 'disabled') {
            return res.status(403).json({ message: "Driver account is disabled. Contact your transport company." });
        }

        const isPasswordValid = await driver.validatePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const token = await driver.getJWT();
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        const driverObj = driver.toObject();
        delete driverObj.password;

        return res.json({
            message: "Driver login successful",
            token,
            driver: driverObj
        });
    } catch (err) {
        res.status(400).json({ message: "There is some error: " + err.message });
    }
});

authRouter.post('/driver/logout', async (req, res) => {
    res.cookie("token", null, { expires: new Date(Date.now()) });
    res.json({ message: "Driver logged out successfully" });
});

authRouter.post('/logout', async(req, res)=>{
    res.cookie("token", null, {expires: new Date(Date.now())});
    res.send("LoggedOut Successfully");
});


module.exports= authRouter;