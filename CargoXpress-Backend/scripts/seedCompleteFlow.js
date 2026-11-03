const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const TransportCompany = require("../src/models/transportCompany");
const Trader = require("../src/models/trader");
const Admin = require("../src/models/admin");
const Driver = require("../src/models/driver");
const Truck = require("../src/models/truck");
const Route = require("../src/models/route");
const TraderRequest = require("../src/models/traderRequest");
const MergeablePair = require("../src/models/mergeablePair");
const MergedSchedule = require("../src/models/mergedSchedule");
const FreeTruck = require("../src/models/freeTruck");
const UnmergedTruck = require("../src/models/unmergedTruck");
const MergeableTrader = require("../src/models/mergeableTrader");
const DriverAssignment = require("../src/models/driverAssignment");
const TripStopExecution = require("../src/models/tripStopExecution");
const DriverLocation = require("../src/models/driverLocation");
const DeliveryEvidence = require("../src/models/deliveryEvidence");
const MergeDecisionLog = require("../src/models/mergeDecisionLog");
const { generateMergeablePairs } = require("../src/routes/merge");

const URI = process.env.MONGODB_STRING || process.env.MONGODB_URI;

if (!URI) {
  console.error("❌ MONGODB_STRING is missing in .env");
  process.exit(1);
}

async function seed() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(URI);
  console.log("✅ Connected successfully to:", mongoose.connection.name);

  console.log("\n🗑️  Step 1: Purging all existing operational data (routes, trucks, merges, trips)...");
  await Promise.all([
    Truck.deleteMany({}),
    Route.deleteMany({}),
    FreeTruck.deleteMany({}),
    MergedSchedule.deleteMany({}),
    MergeablePair.deleteMany({}),
    DriverAssignment.deleteMany({}),
    TripStopExecution.deleteMany({}),
    MergeDecisionLog.deleteMany({}),
    TraderRequest.deleteMany({}),
    MergeableTrader.deleteMany({}),
    UnmergedTruck.deleteMany({}),
    DriverLocation.deleteMany({}),
    DeliveryEvidence.deleteMany({}),
  ]);
  console.log("✅ All trucks, routes, merges, free trucks, and trips cleanly deleted.");

  console.log("\n👥 Step 2: Ensuring standard demo users exist with standard passwords...");
  const adminPw = await bcrypt.hash("Admin@123", 10);
  const companyPw = await bcrypt.hash("Company@123", 10);
  const traderPw = await bcrypt.hash("Trader@123", 10);
  const driverPw = await bcrypt.hash("driver123", 10);

  // Admins
  const admins = [
    { emailId: "admin@cargoxpress.com", name: "System Administrator", aadharNumber: "112233445566" },
    { emailId: "lakshya@cargoxpress.com", name: "Lakshya Admin", aadharNumber: "123456789012" },
    { emailId: "dinky@cargoxpress.com", name: "Dinky Admin", aadharNumber: "987654321098" },
  ];
  for (const a of admins) {
    await Admin.findOneAndUpdate(
      { emailId: a.emailId },
      { ...a, password: adminPw },
      { upsert: true, new: true }
    );
  }
  console.log("  ✅ Admins ready (admin@cargoxpress.com / Admin@123)");

  // Transport Companies
  const c1 = await TransportCompany.findOneAndUpdate(
    { emailId: "fasttrack@logistics.com" },
    {
      name: "FastTrack Logistics",
      emailId: "fasttrack@logistics.com",
      password: companyPw,
      address: "Bandra Kurla Complex, Mumbai, Maharashtra",
      registrationNumber: "MH-REG-1001",
      photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
    },
    { upsert: true, new: true }
  );

  const c2 = await TransportCompany.findOneAndUpdate(
    { emailId: "northstar@transport.com" },
    {
      name: "NorthStar Transport",
      emailId: "northstar@transport.com",
      password: companyPw,
      address: "Okhla Industrial Area, New Delhi",
      registrationNumber: "DL-REG-2002",
      photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
    },
    { upsert: true, new: true }
  );

  const c3 = await TransportCompany.findOneAndUpdate(
    { emailId: "southex@freight.com" },
    {
      name: "SouthEx Freight",
      emailId: "southex@freight.com",
      password: companyPw,
      address: "Guindy Industrial Estate, Chennai, Tamil Nadu",
      registrationNumber: "TN-REG-3003",
      photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
    },
    { upsert: true, new: true }
  );
  console.log("  ✅ Companies ready (fasttrack@logistics.com, northstar@transport.com, southex@freight.com / Company@123)");

  // Traders
  const t1 = await Trader.findOneAndUpdate(
    { emailId: "amit@trade.com" },
    {
      name: "Amit Patel",
      emailId: "amit@trade.com",
      password: traderPw,
      aadharNumber: "777788889999",
      address: "Surat Diamond Market, Gujarat"
    },
    { upsert: true, new: true }
  );

  const t2 = await Trader.findOneAndUpdate(
    { emailId: "priya@commerce.com" },
    {
      name: "Priya Singh",
      emailId: "priya@commerce.com",
      password: traderPw,
      aadharNumber: "101010101010",
      address: "Connaught Place, New Delhi"
    },
    { upsert: true, new: true }
  );

  const t3 = await Trader.findOneAndUpdate(
    { emailId: "vikram@exports.com" },
    {
      name: "Vikram Nair",
      emailId: "vikram@exports.com",
      password: traderPw,
      aadharNumber: "121212121212",
      address: "T Nagar, Chennai, Tamil Nadu"
    },
    { upsert: true, new: true }
  );
  console.log("  ✅ Traders ready (amit@trade.com, priya@commerce.com, vikram@exports.com / Trader@123)");

  // Driver
  const driver = await Driver.findOneAndUpdate(
    { emailId: "driver@cargoxpress.com" },
    {
      name: "Rajesh Kumar",
      emailId: "driver@cargoxpress.com",
      password: driverPw,
      phone: "+919876543210",
      licenseNumber: "DL-IND-2024-9988",
      companyId: c1._id,
      status: "active",
      photoUrl: "https://cdn-icons-png.flaticon.com/256/149/149071.png"
    },
    { upsert: true, new: true }
  );
  console.log("  ✅ Driver ready (driver@cargoxpress.com / driver123)");

  console.log("\n🚚 Step 3: Seeding realistic trucks and corridors...");

  // --- Corridor 1: Western Corridor (Lead carrier + candidate ready to merge in /mergeable) ---
  const truck1 = await Truck.create({
    companyId: c1._id,
    licensePlate: "MH-01-AA-1111",
    totalCapacity: 12000,
    currentLoad:   [2500, 2000, 1800, 1500, 1000],
    remainingLoad: [9500, 10000, 10200, 10500, 11000]
  });
  const route1 = await Route.create({
    companyId: c1._id,
    truckId: truck1._id,
    source: "Mumbai",
    destination: "Rajkot",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"]
  });

  const truck2 = await Truck.create({
    companyId: c1._id,
    licensePlate: "GJ-05-BB-2222",
    totalCapacity: 5000,
    currentLoad:   [1800, 1500, 1200, 800],
    remainingLoad: [3200, 3500, 3800, 4200]
  });
  await Route.create({
    companyId: c1._id,
    truckId: truck2._id,
    source: "Mumbai",
    destination: "Ahmedabad",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"]
  });

  const truck3 = await Truck.create({
    companyId: c1._id,
    licensePlate: "GJ-01-CC-3333",
    totalCapacity: 4500,
    currentLoad:   [1200, 1000, 600],
    remainingLoad: [3300, 3500, 3900]
  });
  await Route.create({
    companyId: c1._id,
    truckId: truck3._id,
    source: "Surat",
    destination: "Ahmedabad",
    stops: ["Surat", "Vadodara", "Ahmedabad"]
  });

  console.log("  ✅ Western Corridor seeded: MH-01-AA-1111 (Lead), GJ-05-BB-2222 (Candidate), GJ-01-CC-3333");

  // --- Corridor 2: Northern Corridor (Delhi - Bhopal - Hyderabad) ---
  const truck4 = await Truck.create({
    companyId: c2._id,
    licensePlate: "DL-01-DD-4444",
    totalCapacity: 10000,
    currentLoad:   [2200, 1900, 1600, 1300, 1000, 700],
    remainingLoad: [7800, 8100, 8400, 8700, 9000, 9300]
  });
  await Route.create({
    companyId: c2._id,
    truckId: truck4._id,
    source: "Delhi",
    destination: "Hyderabad",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal", "Nagpur", "Hyderabad"]
  });

  const truck5 = await Truck.create({
    companyId: c2._id,
    licensePlate: "MP-04-EE-5555",
    totalCapacity: 5000,
    currentLoad:   [1400, 1100, 800, 500],
    remainingLoad: [3600, 3900, 4200, 4500]
  });
  await Route.create({
    companyId: c2._id,
    truckId: truck5._id,
    source: "Delhi",
    destination: "Bhopal",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal"]
  });

  console.log("  ✅ Northern Corridor seeded: DL-01-DD-4444 (Lead), MP-04-EE-5555 (Candidate)");

  // --- Corridor 3: Southern Corridor (Already Merged & Recycled Showcase) ---
  const truck6 = await Truck.create({
    companyId: c3._id,
    licensePlate: "TN-09-FF-6666",
    totalCapacity: 14000,
    currentLoad:   [4000, 3200, 2700, 1200, 800],
    remainingLoad: [10000, 10800, 11300, 12800, 13200]
  });
  await Route.create({
    companyId: c3._id,
    truckId: truck6._id,
    source: "Chennai",
    destination: "Mangaluru",
    stops: ["Chennai", "Vellore", "Bengaluru", "Mysuru", "Mangaluru"]
  });

  const truck7 = await Truck.create({
    companyId: c3._id,
    licensePlate: "KA-04-GG-7777",
    totalCapacity: 6000,
    currentLoad:   [0, 0, 0],
    remainingLoad: [6000, 6000, 6000]
  });
  await Route.create({
    companyId: c3._id,
    truckId: truck7._id,
    source: "Chennai",
    destination: "Bengaluru",
    stops: ["Chennai", "Vellore", "Bengaluru"]
  });

  // Create MergedSchedule for TN-09-FF-6666 absorbing KA-04-GG-7777
  await MergedSchedule.create({
    transportationTruckId: truck6._id.toString(),
    transportationTruckLicensePlate: "TN-09-FF-6666",
    mergedFromTrucks: [
      {
        licensePlate: "TN-09-FF-6666",
        id: truck6._id.toString(),
        source: "Chennai",
        destination: "Mangaluru",
        stops: ["Chennai", "Vellore", "Bengaluru", "Mysuru", "Mangaluru"],
        load: [2500, 2000, 1800, 1200, 800],
        companyId: c3._id,
        role: "carrier"
      },
      {
        licensePlate: "KA-04-GG-7777",
        id: truck7._id.toString(),
        source: "Chennai",
        destination: "Bengaluru",
        stops: ["Chennai", "Vellore", "Bengaluru"],
        load: [1500, 1200, 900],
        companyId: c3._id,
        role: "absorbed"
      }
    ],
    totalCapacity: 14000,
    finalSource: "Chennai",
    finalDestination: "Mangaluru",
    stops: ["Chennai", "Vellore", "Bengaluru", "Mysuru", "Mangaluru"],
    finalCurrentLoad: [4000, 3200, 2700, 1200, 800],
    finalRemainingLoad: [10000, 10800, 11300, 12800, 13200],
    status: "accepted"
  });

  // Mark KA-04-GG-7777 as FreeTruck in the standby pool
  await FreeTruck.create({
    licensePlate: "KA-04-GG-7777",
    companyId: c3._id,
    totalCapacity: 6000,
    truckId: truck7._id.toString()
  });

  console.log("  ✅ Southern Corridor seeded: TN-09-FF-6666 (Merged Carrier) & KA-04-GG-7777 (Freed Standby Truck)");

  console.log("\n📦 Step 4: Seeding Trader Requests...");
  // Request 1: Pending consolidation (Mumbai -> Ahmedabad)
  await TraderRequest.create({
    traderId: t1._id,
    source: "Mumbai",
    destination: "Ahmedabad",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"],
    load: [500, 400, 300, 200]
  });

  // Request 2: Pending consolidation (Delhi -> Bhopal)
  await TraderRequest.create({
    traderId: t2._id,
    source: "Delhi",
    destination: "Bhopal",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal"],
    load: [450, 350, 250, 150]
  });

  // Request 3: Already merged trader request (Chennai -> Bengaluru)
  const req3 = await TraderRequest.create({
    traderId: t3._id,
    source: "Chennai",
    destination: "Bengaluru",
    stops: ["Chennai", "Vellore", "Bengaluru"],
    load: [300, 250, 200]
  });
  await MergeableTrader.create({
    traderRequestId: req3._id.toString(),
    traderId: t3._id,
    truckId: truck6._id.toString(),
    licensePlate: "TN-09-FF-6666",
    load: [300, 250, 200],
    requiredCapacity: 300,
    source: "Chennai",
    destination: "Bengaluru",
    stops: ["Chennai", "Vellore", "Bengaluru"],
    status: "accepted"
  });

  console.log("  ✅ Trader requests seeded: 2 pending consolidation, 1 pre-merged into TN-09-FF-6666");

  console.log("\n📍 Step 5: Seeding Driver Assignment & Active Trip Progression...");
  // Assign driver to MH-01-AA-1111
  await DriverAssignment.create({
    driverId: driver._id,
    truckId: truck1._id,
    companyId: c1._id,
    status: "active",
    assignedAt: new Date(Date.now() - 7200000)
  });

  // Seed TripStopExecution for MH-01-AA-1111
  const stops = ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"];
  const stopData = [
    {
      stopIndex: 0,
      stopName: "Mumbai",
      stopType: "pickup",
      status: "completed",
      recipient: { name: "Mehta Industrial Logistics", phone: "+919820011223", notes: "Gate 4, BKC Hub" },
      arrivedAt: new Date(Date.now() - 7200000),
      departedAt: new Date(Date.now() - 5400000),
      completedAt: new Date(Date.now() - 5400000),
      otpVerification: {
        isVerified: true,
        verifiedAt: new Date(Date.now() - 5400000),
        attemptCount: 1,
        maxAttempts: 3
      },
      deliveryAttempts: [
        {
          attemptNumber: 1,
          attemptType: "full",
          deliveredWeightKg: 2500,
          outstandingWeightKg: 0,
          recipient: { name: "Rajesh Mehta", phone: "+919820011223" },
          proofOfDelivery: {
            type: "otp",
            verificationStatus: "verified",
            otpVerified: true,
            submittedAt: new Date(Date.now() - 5400000)
          },
          driverId: driver._id,
          driverName: driver.name,
          timestamp: new Date(Date.now() - 5400000)
        }
      ]
    },
    {
      stopIndex: 1,
      stopName: "Surat",
      stopType: "pickup_delivery",
      status: "en_route", // ACTIVE CURRENT STOP
      recipient: { name: "Diamond City Freight Terminal", phone: "+919825044556", notes: "Ring Road Warehouse 12" },
      arrivedAt: null,
      departedAt: null,
      completedAt: null
    },
    {
      stopIndex: 2,
      stopName: "Vadodara",
      stopType: "waypoint",
      status: "pending",
      recipient: { name: "Baroda Chemical Transits", phone: "+919826077889" }
    },
    {
      stopIndex: 3,
      stopName: "Ahmedabad",
      stopType: "delivery",
      status: "pending",
      recipient: { name: "Sabarmati Freight Depot", phone: "+919879011234" }
    },
    {
      stopIndex: 4,
      stopName: "Rajkot",
      stopType: "delivery",
      status: "pending",
      recipient: { name: "Saurashtra Industrial Park", phone: "+919824055678" }
    }
  ];

  await TripStopExecution.create({
    tripId: route1._id.toString(),
    tripType: "Route",
    truckId: truck1._id,
    truckLicensePlate: "MH-01-AA-1111",
    companyId: c1._id,
    currentStopIndex: 1, // En route to Surat
    stops: stopData,
    shipments: [
      {
        shipmentId: truck1._id.toString(),
        shipmentType: "carrier_truck",
        reference: "MH-01-AA-1111",
        cargoDescription: "Industrial Machinery Parts & Spares",
        weightKg: 2500,
        operation: "delivery",
        status: "in_transit"
      }
    ],
    stateSummary: {
      totalStops: 5,
      completedStops: 1,
      pendingStops: 4,
      failedStops: 0,
      completionPercentage: 20
    }
  });

  console.log("  ✅ Active driver trip seeded: MH-01-AA-1111 (Stop 0 Mumbai: Completed with OTP, Stop 1 Surat: En Route)");

  console.log("\n⚡ Step 6: Generating mergeable pairs via optimizer...");
  const pairs = await generateMergeablePairs();
  console.log(`  ✅ Computed ${pairs.length} mergeable candidate pair(s) ready in /mergeable`);

  console.log("\n========================================================");
  console.log("🎉 CARGOXPRESS COMPLETE OPERATIONAL DATASET READY");
  console.log("========================================================");
  console.log("\n🔑 DEMO ACCOUNTS:");
  console.log("  Admin:     admin@cargoxpress.com     / Admin@123");
  console.log("             lakshya@cargoxpress.com   / Admin@123");
  console.log("  Company:   fasttrack@logistics.com   / Company@123");
  console.log("             northstar@transport.com   / Company@123");
  console.log("             southex@freight.com       / Company@123");
  console.log("  Trader:    amit@trade.com            / Trader@123");
  console.log("             priya@commerce.com        / Trader@123");
  console.log("             vikram@exports.com        / Trader@123");
  console.log("  Driver:    driver@cargoxpress.com    / driver123");
  console.log("\n🌟 COMPLETE DEMO FLOW STAGES:");
  console.log("  1. TRUCK OPTIMIZER (/mergeable):");
  console.log("     - MH-01-AA-1111 (Mumbai->Rajkot) + GJ-05-BB-2222 (Mumbai->Ahmedabad)");
  console.log("     - DL-01-DD-4444 (Delhi->Hyderabad) + MP-04-EE-5555 (Delhi->Bhopal)");
  console.log("  2. CONSOLIDATED DISPATCH & STANDBY RECYCLING (/mergedSchedule):");
  console.log("     - TN-09-FF-6666 (Carrying consolidated Chennai->Mangaluru manifest)");
  console.log("     - KA-04-GG-7777 (Released into Free Trucks standby fleet)");
  console.log("  3. SHIPPER CONSIGNMENTS (/mergedTrader):");
  console.log("     - Amit Patel (Mumbai->Ahmedabad) awaiting dispatch");
  console.log("     - Priya Singh (Delhi->Bhopal) awaiting dispatch");
  console.log("  4. DRIVER COCKPIT & STOP EXECUTION (/driver/active-trip):");
  console.log("     - Assigned to MH-01-AA-1111");
  console.log("     - Stop 0 (Mumbai): Completed with OTP proof");
  console.log("     - Stop 1 (Surat): Active En Route ready for arrival & delivery");
  console.log("========================================================\n");

  await mongoose.connection.close();
  console.log("🔒 MongoDB connection closed.");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
