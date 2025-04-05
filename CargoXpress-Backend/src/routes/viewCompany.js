const express = require('express');
const viewCompanyRouter = express.Router();
const { adminAuth } = require('../middlewares/auth');
const TransportCompany = require('../models/transportCompany');
const Trader = require('../models/trader');
const Truck = require('../models/truck');
const Route = require('../models/route');


viewCompanyRouter.get('/viewCompany', adminAuth, async (req,res)=>{

   try { const companyList=await TransportCompany.find({})
   res.send(companyList);
   }
   catch(err){
    res.status(500).json({ error: "Unable to fetch Transport Companies Data" });
   }

})

viewCompanyRouter.get('/viewTrader', async (req,res)=>{

   try { const traderList = await Trader.find({})
   res.send(traderList);
   }
   catch(err){
    res.status(500).json({ error: "Unable to fetch Traders Data" });
   }

})

viewCompanyRouter.get('/viewCompany/:companyId', adminAuth, async (req,res)=>{
    const {companyId} = req.params;

    try { const companyList=await TransportCompany.find({
        _id: companyId,
    })
    res.send(companyList);
 }
    catch(err){
     res.status(500).json({ error: "Unable to fetch this companies Data" });
    }
    })


viewCompanyRouter.get('/viewCompanyDetails/:companyId', adminAuth, async (req, res) => {
      const { companyId } = req.params;
   
      try {
         // Step 1: Get all trucks for the company
         const truckList = await Truck.find({ companyId });
   
         // Step 2: Get all truck IDs
         const truckIds = truckList.map(truck => truck._id);
   
         // Step 3: Fetch all routes that belong to these trucks
         const routes = await Route.find({ truckId: { $in: truckIds } });
   
         // Step 4: Map truckId to its routes
         const routeMap = {};
         routes.forEach(route => {
            const id = route.truckId.toString();
            if (!routeMap[id]) {
               routeMap[id] = [];
            }
            routeMap[id].push(route);
         });
   
       
         const trucksWithRoutes = truckList.map(truck => {
            const id = truck._id.toString();
            return {
               ...truck._doc,
               route: routeMap[id] || []
            };
         });
   
         // Final response
         res.json({trucksWithRoutes });
   
      } catch (err) {
         console.error(err);
         res.status(500).json({ error: "Unable to fetch company's data" });
      }
   });
   
   
 


module.exports=viewCompanyRouter;