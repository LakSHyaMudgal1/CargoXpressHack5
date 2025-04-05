const jwt=require('jsonwebtoken');
const TransportCompany= require('../models/transportCompany')
const Admin= require('../models/admin');
const Trader= require('../models/trader');

const companyAuth= async (req, res, next)=>{
    try{
    const {token}=req.cookies;
    if(!token){
        return res.status(401).send("Kindly Login")
    }
    const decodedData=await jwt.verify(token, process.env.JWT_SECRET);
    const {_id, role}=decodedData;

    req.user = {
        id: _id, 
        role: role
    };

    const company= await TransportCompany.findById(_id);
    if(!company){
        throw new Error("Company not found");
    }
    req.company=company;
    next();
}
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
}

const adminAuth= async (req, res, next)=>{
    try{
    const {token}=req.cookies;
    if(!token){
        return res.status(401).send("Kindly Login")
    }
    const decodedData=await jwt.verify(token, process.env.JWT_SECRET);
    const {_id, role}=decodedData;

    req.user = {
        id: _id, 
        role: role
    };

    const admin= await Admin.findById(_id);
    if(!admin){
        throw new Error("Admin not found");
    }
    req.admin=admin;
    next();
}
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
}

const traderAuth= async (req, res, next)=>{
    try{
    const {token}=req.cookies;
    if(!token){
        return res.status(401).send("Kindly Login")
    }
    const decodedData=await jwt.verify(token, process.env.JWT_SECRET);
    const {_id, role}=decodedData;

    req.user = {
        id: _id, 
        role: role
    };

    const trader= await Trader.findById(_id);
    if(!trader){
        throw new Error("Trader not found");
    }
    req.trader=trader;
    next();
}
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
}

module.exports={companyAuth, adminAuth, traderAuth};