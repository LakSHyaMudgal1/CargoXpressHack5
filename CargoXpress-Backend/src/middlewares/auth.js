const jwt=require('jsonwebtoken');
const TransportCompany= require('../models/transportCompany');
const Admin= require('../models/admin');
const Trader= require('../models/trader');
const Driver= require('../models/driver');

const extractToken = (req) => {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    return null;
};

const companyAuth= async (req, res, next)=>{
    try{
    const token=extractToken(req);
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
    const token=extractToken(req);
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
    const token=extractToken(req);
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

const driverAuth= async (req, res, next)=>{
    try{
    const token=extractToken(req);
    if(!token){
        return res.status(401).send("Kindly Login");
    }
    const decodedData=await jwt.verify(token, process.env.JWT_SECRET);
    const {_id, role}=decodedData;

    if(role !== 'driver') {
        return res.status(403).send("Access denied. Driver role required.");
    }

    const driver= await Driver.findById(_id);
    if(!driver){
        throw new Error("Driver not found");
    }

    if (driver.status === 'disabled') {
        return res.status(403).send("Driver account is disabled. Contact your transport company.");
    }

    req.user = {
        id: _id,
        role: role,
        companyId: driver.companyId
    };
    req.driver=driver;
    next();
}
    catch(err){
        res.status(400).send("There is some error"+ err);
    }
}

module.exports={companyAuth, adminAuth, traderAuth, driverAuth, extractToken};