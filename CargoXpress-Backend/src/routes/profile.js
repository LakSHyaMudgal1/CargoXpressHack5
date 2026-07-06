const express= require('express');
const profileRouter=express.Router();
const {validateEditData}= require('../utils/validation')
const {companyAuth, traderAuth} =  require('../middlewares/auth');
const TransportCompany = require('../models/transportCompany');
const Trader = require('../models/trader');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');


// Unified endpoint to rehydrate user state on page refresh
profileRouter.get('/me', async (req, res) => {
    try {
        const { token } = req.cookies;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        const { _id, role } = decodedData;

        let user = null;
        if (role === 'transportCompany') {
            user = await TransportCompany.findById(_id);
        } else if (role === 'trader') {
            user = await Trader.findById(_id);
        } else if (role === 'admin') {
            user = await Admin.findById(_id);
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

profileRouter.get('/companyProfile',companyAuth, async(req, res)=>{
    try{
        const company= await req.company;
        res.send(company);
    }
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
})
profileRouter.get('/traderProfile',traderAuth, async(req, res)=>{
    try{
        const trader= await req.trader;
        res.send(trader);
    }
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
})

profileRouter.put('/profile/companyEdit',companyAuth, async(req, res)=>{
   try { 
    validateEditData(req);
    const loggedInCompany= req.company;

    Object.keys(req.body).forEach((k)=>
        loggedInCompany[k]=req.body[k]
    )

    await loggedInCompany.save();

    res.json({ message: "Company details Updated Successfully", data: loggedInCompany });
}
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
})
profileRouter.put('/profile/traderEdit', traderAuth, async (req, res) => {
    try {
      validateEditData(req);
  
      const loggedInTrader = req.trader;
  
      // Update only the fields present in req.body
      Object.keys(req.body).forEach((key) => {
        loggedInTrader[key] = req.body[key];
      });
  
      await loggedInTrader.save();
  
      res.json({ message: "Trader details updated successfully", data: loggedInTrader });
    } catch (err) {
      res.status(400).send("There is some error: " + err.message);
    }
  });
  

//While calling it in frontend make sure to call logout just after this!
profileRouter.delete('/profile/delete', companyAuth, async(req, res)=>{
    try{
        console.log(req.company);
        const companyId= req.company._id;
        console.log(companyId);

        const deletedCompany = await TransportCompany.findByIdAndDelete(companyId);
        if(!deletedCompany) throw new Error("Company Not Found");

        res.cookie("token", null, {expires: new Date(Date.now())});

        res.send(deletedCompany + "deleted Succesfully and User logged Out");
    }
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
})

module.exports=profileRouter;