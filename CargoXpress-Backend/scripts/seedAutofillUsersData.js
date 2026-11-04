const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const TransportCompany = require("../src/models/transportCompany");
const Trader = require("../src/models/trader");
const Admin = require("../src/models/admin");
const Truck = require("../src/models/truck");
const Route = require("../src/models/route");
const TraderRequest = require("../src/models/traderRequest");
const { generateMergeablePairs } = require("../src/routes/merge");

const URI = process.env.MONGODB_STRING || process.env.MONGODB_URI;

if (!URI) {
  console.error("❌ MONGODB_STRING is missing in .env");
  process.exit(1);
}

async function run() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(URI);
  console.log("✅ Connected to:", mongoose.connection.name);

  // 1. Locate the 6 users
  const abhinav = await Admin.findOne({ emailId: /abhinav@cargoxpress\.com/i });
  const dinky = await Trader.findOne({ emailId: /dinky@gmail\.com/i });
  const nilesh = await TransportCompany.findOne({ emailId: /nilesh@gmail\.com/i });
  const rupesh = await Trader.findOne({ emailId: /rupesh@gmail\.com/i });
  const tushar = await TransportCompany.findOne({ emailId: /tushar@gmail\.com/i });
  const lakshya = await TransportCompany.findOne({ emailId: /lakshya@gmail\.com/i });

  if (!abhinav || !dinky || !nilesh || !rupesh || !tushar || !lakshya) {
    console.error("❌ One or more user accounts were not found:", {
      abhinav: Boolean(abhinav),
      dinky: Boolean(dinky),
      nilesh: Boolean(nilesh),
      rupesh: Boolean(rupesh),
      tushar: Boolean(tushar),
      lakshya: Boolean(lakshya)
    });
    process.exit(1);
  }

  console.log("\n👤 Found all 6 target user accounts:");
  console.log(`  1. Abhinav  (Admin)   : ${abhinav.emailId} (${abhinav._id})`);
  console.log(`  2. Dinky    (Trader)  : ${dinky.emailId} (${dinky._id})`);
  console.log(`  3. Nilesh   (Company) : ${nilesh.emailId} (${nilesh._id})`);
  console.log(`  4. Rupesh   (Trader)  : ${rupesh.emailId} (${rupesh._id})`);
  console.log(`  5. Tushar   (Company) : ${tushar.emailId} (${tushar._id})`);
  console.log(`  6. Lakshya  (Company) : ${lakshya.emailId} (${lakshya._id})`);

  // Ensure addresses are populated
  if (!nilesh.address) await TransportCompany.updateOne({ _id: nilesh._id }, { address: "Hinjawadi Phase 1, Pune, Maharashtra" });
  if (!tushar.address) await TransportCompany.updateOne({ _id: tushar._id }, { address: "Transport Nagar, Gurugram, Haryana" });
  if (!lakshya.address) await TransportCompany.updateOne({ _id: lakshya._id }, { address: "Whitefield Industrial Area, Bengaluru, Karnataka" });
  if (!dinky.address) await Trader.updateOne({ _id: dinky._id }, { address: "Kalbadevi Market, Mumbai, Maharashtra" });
  if (!rupesh.address) await Trader.updateOne({ _id: rupesh._id }, { address: "Chandni Chowk Wholesale Hub, Old Delhi" });

  // 2. Clean existing records for these specific users (idempotent seed)
  console.log("\n🧹 Removing any prior fleet / requests for these 6 users...");
  const companyIds = [nilesh._id, tushar._id, lakshya._id];
  const oldTrucks = await Truck.find({ companyId: { $in: companyIds } }, "_id");
  const oldTruckIds = oldTrucks.map(t => t._id);

  await Route.deleteMany({ truckId: { $in: oldTruckIds } });
  await Truck.deleteMany({ companyId: { $in: companyIds } });
  await TraderRequest.deleteMany({ traderId: { $in: [dinky._id, rupesh._id] } });
  console.log("✅ Cleared prior records.");

  // Helper to create truck + route
  async function addTruckWithRoute(companyId, plate, totalCapacity, stops, currentLoad) {
    const remainingLoad = currentLoad.map(l => Math.max(0, totalCapacity - l));
    const truck = await Truck.create({
      companyId,
      licensePlate: plate,
      totalCapacity,
      currentLoad,
      remainingLoad
    });
    await Route.create({
      companyId,
      truckId: truck._id,
      source: stops[0],
      destination: stops[stops.length - 1],
      stops
    });
    return truck;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Nilesh (nilesh@gmail.com) — 10 Trucks + Routes (Western & Central Corridors)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n🚛 Seeding 10 trucks for Nilesh (nilesh@gmail.com)...");
  const nileshFleet = [
    { plate: "MH-12-NL-1001", cap: 9000,  stops: ["Pune", "Mumbai", "Surat", "Ahmedabad"], load: [2400, 2000, 1600, 1100] },
    { plate: "MH-12-NL-1002", cap: 5000,  stops: ["Pune", "Mumbai", "Surat"],             load: [1200, 1000, 750] },
    { plate: "MH-14-NL-1003", cap: 10000, stops: ["Mumbai", "Nashik", "Dhule", "Indore"], load: [2600, 2100, 1700, 1200] },
    { plate: "MH-14-NL-1004", cap: 4500,  stops: ["Mumbai", "Nashik", "Dhule"],           load: [1100, 900, 600] },
    { plate: "MH-12-NL-1005", cap: 11000, stops: ["Pune", "Satara", "Kolhapur", "Belagavi", "Hubballi"], load: [2900, 2500, 2100, 1600, 1000] },
    { plate: "MH-12-NL-1006", cap: 5500,  stops: ["Pune", "Satara", "Kolhapur"],          load: [1400, 1100, 800] },
    { plate: "MH-20-NL-1007", cap: 8500,  stops: ["Aurangabad", "Jalna", "Nanded", "Nizamabad", "Hyderabad"], load: [2200, 1800, 1500, 1100, 800] },
    { plate: "MH-20-NL-1008", cap: 4000,  stops: ["Aurangabad", "Jalna", "Nanded"],       load: [1000, 800, 500] },
    { plate: "MH-12-NL-1009", cap: 12000, stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Udaipur", "Jaipur"], load: [3100, 2700, 2300, 1900, 1400, 900] },
    { plate: "MH-12-NL-1010", cap: 6000,  stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"], load: [1500, 1200, 1000, 700] },
  ];

  for (const t of nileshFleet) {
    await addTruckWithRoute(nilesh._id, t.plate, t.cap, t.stops, t.load);
  }
  console.log(`  ✅ 10 trucks seeded for ${nilesh.emailId}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Tushar (tushar@gmail.com) — 10 Trucks + Routes (Northern & Eastern Corridors)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n🚛 Seeding 10 trucks for Tushar (tushar@gmail.com)...");
  const tusharFleet = [
    { plate: "DL-01-TS-2001", cap: 12000, stops: ["Delhi", "Panipat", "Ambala", "Ludhiana", "Jalandhar", "Amritsar"], load: [2900, 2500, 2100, 1700, 1300, 850] },
    { plate: "DL-01-TS-2002", cap: 5500,  stops: ["Delhi", "Panipat", "Ambala", "Ludhiana"], load: [1400, 1100, 900, 650] },
    { plate: "HR-26-TS-2003", cap: 13500, stops: ["Delhi", "Mathura", "Agra", "Kanpur", "Prayagraj", "Varanasi"], load: [3300, 2900, 2500, 2100, 1600, 1000] },
    { plate: "HR-26-TS-2004", cap: 6500,  stops: ["Delhi", "Mathura", "Agra", "Kanpur"],     load: [1700, 1400, 1100, 800] },
    { plate: "DL-03-TS-2005", cap: 10500, stops: ["Delhi", "Jaipur", "Ajmer", "Bhilwara", "Chittorgarh", "Udaipur"], load: [2600, 2300, 1900, 1500, 1100, 700] },
    { plate: "DL-03-TS-2006", cap: 5000,  stops: ["Delhi", "Jaipur", "Ajmer"],               load: [1200, 950, 650] },
    { plate: "HR-55-TS-2007", cap: 7500,  stops: ["Gurugram", "Rewari", "Alwar", "Bharatpur"], load: [1900, 1550, 1200, 800] },
    { plate: "HR-55-TS-2008", cap: 9000,  stops: ["Delhi", "Moradabad", "Bareilly", "Lucknow"], load: [2300, 1950, 1500, 1000] },
    { plate: "DL-04-TS-2009", cap: 4200,  stops: ["Delhi", "Moradabad", "Bareilly"],         load: [1050, 800, 500] },
    { plate: "HR-26-TS-2010", cap: 8000,  stops: ["Gurugram", "Jaipur", "Kota"],             load: [2000, 1600, 1100] },
  ];

  for (const t of tusharFleet) {
    await addTruckWithRoute(tushar._id, t.plate, t.cap, t.stops, t.load);
  }
  console.log(`  ✅ 10 trucks seeded for ${tushar.emailId}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Lakshya (lakshya@gmail.com) — 10 Trucks + Routes (Southern & Western Corridors)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n🚛 Seeding 10 trucks for Lakshya (lakshya@gmail.com)...");
  const lakshyaFleet = [
    { plate: "TN-01-LX-3001", cap: 12500, stops: ["Chennai", "Bengaluru", "Salem", "Coimbatore", "Kochi"], load: [3200, 2800, 2300, 1800, 1100] },
    { plate: "TN-01-LX-3002", cap: 6000,  stops: ["Chennai", "Bengaluru", "Salem"], load: [1500, 1200, 850] },
    { plate: "KA-01-LX-3003", cap: 10000, stops: ["Bengaluru", "Tumakuru", "Davanagere", "Hubballi", "Belagavi"], load: [2500, 2100, 1750, 1350, 900] },
    { plate: "KA-01-LX-3004", cap: 4800,  stops: ["Bengaluru", "Tumakuru", "Davanagere"], load: [1150, 900, 600] },
    { plate: "TS-09-LX-3005", cap: 9000,  stops: ["Hyderabad", "Kurnool", "Anantapur", "Bengaluru"], load: [2300, 1900, 1450, 1000] },
    { plate: "TS-09-LX-3006", cap: 4200,  stops: ["Hyderabad", "Kurnool", "Anantapur"], load: [1050, 800, 500] },
    { plate: "MH-01-LX-3007", cap: 11500, stops: ["Mumbai", "Thane", "Nashik", "Jalgaon", "Nagpur"], load: [2950, 2550, 2100, 1600, 1000] },
    { plate: "MH-01-LX-3008", cap: 5200,  stops: ["Mumbai", "Thane", "Nashik"], load: [1350, 1050, 700] },
    { plate: "TN-02-LX-3009", cap: 11000, stops: ["Chennai", "Nellore", "Ongole", "Vijayawada", "Visakhapatnam"], load: [2800, 2400, 1950, 1450, 950] },
    { plate: "TN-02-LX-3010", cap: 5000,  stops: ["Chennai", "Nellore", "Ongole", "Vijayawada"], load: [1250, 1000, 800, 500] },
  ];

  for (const t of lakshyaFleet) {
    await addTruckWithRoute(lakshya._id, t.plate, t.cap, t.stops, t.load);
  }
  console.log(`  ✅ 10 trucks seeded for ${lakshya.emailId}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Dinky (dinky@gmail.com) — 10 Trader Requests (Consignments)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n📦 Seeding 10 consignment requests for Dinky (dinky@gmail.com)...");
  const dinkyRequests = [
    { stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"], load: [480, 420, 360, 260] },
    { stops: ["Pune", "Mumbai", "Surat"],                  load: [620, 510, 410] },
    { stops: ["Mumbai", "Nashik", "Dhule", "Indore"],      load: [710, 610, 510, 400] },
    { stops: ["Pune", "Satara", "Kolhapur", "Belagavi", "Hubballi"], load: [860, 760, 660, 560, 460] },
    { stops: ["Delhi", "Panipat", "Ambala", "Ludhiana"],   load: [560, 510, 410, 310] },
    { stops: ["Delhi", "Mathura", "Agra", "Kanpur"],       load: [910, 810, 660, 510] },
    { stops: ["Chennai", "Bengaluru", "Salem", "Coimbatore"], load: [760, 660, 510, 360] },
    { stops: ["Bengaluru", "Tumakuru", "Davanagere", "Hubballi"], load: [610, 510, 410, 310] },
    { stops: ["Hyderabad", "Kurnool", "Anantapur", "Bengaluru"], load: [510, 410, 360, 260] },
    { stops: ["Mumbai", "Thane", "Nashik", "Jalgaon", "Nagpur"], load: [810, 710, 610, 510, 360] },
  ];

  for (const r of dinkyRequests) {
    await TraderRequest.create({
      traderId: dinky._id,
      source: r.stops[0],
      destination: r.stops[r.stops.length - 1],
      stops: r.stops,
      load: r.load
    });
  }
  console.log(`  ✅ 10 requests seeded for ${dinky.emailId}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Rupesh (rupesh@gmail.com) — 10 Trader Requests (Consignments)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n📦 Seeding 10 consignment requests for Rupesh (rupesh@gmail.com)...");
  const rupeshRequests = [
    { stops: ["Delhi", "Panipat", "Ambala", "Ludhiana", "Jalandhar", "Amritsar"], load: [660, 610, 560, 460, 360, 260] },
    { stops: ["Delhi", "Mathura", "Agra", "Kanpur", "Prayagraj", "Varanasi"],     load: [960, 860, 760, 610, 460, 310] },
    { stops: ["Delhi", "Jaipur", "Ajmer", "Bhilwara", "Chittorgarh", "Udaipur"], load: [710, 610, 510, 410, 310, 210] },
    { stops: ["Gurugram", "Rewari", "Alwar", "Bharatpur"],                        load: [510, 460, 360, 260] },
    { stops: ["Delhi", "Moradabad", "Bareilly", "Lucknow"],                       load: [810, 710, 560, 410] },
    { stops: ["Chennai", "Bengaluru", "Salem", "Coimbatore", "Kochi"],            load: [860, 760, 610, 460, 310] },
    { stops: ["Chennai", "Nellore", "Ongole", "Vijayawada", "Visakhapatnam"],     load: [910, 810, 660, 510, 360] },
    { stops: ["Aurangabad", "Jalna", "Nanded", "Nizamabad", "Hyderabad"],         load: [610, 510, 460, 360, 260] },
    { stops: ["Pune", "Satara", "Kolhapur"],                                      load: [410, 360, 260] },
    { stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Udaipur", "Jaipur"],   load: [1010, 910, 810, 660, 510, 310] },
  ];

  for (const r of rupeshRequests) {
    await TraderRequest.create({
      traderId: rupesh._id,
      source: r.stops[0],
      destination: r.stops[r.stops.length - 1],
      stops: r.stops,
      load: r.load
    });
  }
  console.log(`  ✅ 10 requests seeded for ${rupesh.emailId}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Re-evaluate Merge Optimizer for Abhinav (abhinav@cargoxpress.com)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n⚡ Re-evaluating mergeable pairs for Admin (abhinav@cargoxpress.com)...");
  const pairs = await generateMergeablePairs();
  console.log(`  ✅ Computed ${pairs.length} mergeable candidate pairs ready in /mergeableSchedule`);

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Final Verification of Counts
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n========================================================");
  console.log("📊 FINAL ENTRY COUNTS IN EACH USER'S PROFILE:");
  console.log("========================================================");
  const nileshCount = await Truck.countDocuments({ companyId: nilesh._id });
  const tusharCount = await Truck.countDocuments({ companyId: tushar._id });
  const lakshyaCount = await Truck.countDocuments({ companyId: lakshya._id });
  const dinkyCount = await TraderRequest.countDocuments({ traderId: dinky._id });
  const rupeshCount = await TraderRequest.countDocuments({ traderId: rupesh._id });
  const totalTrucks = await Truck.countDocuments();
  const totalRoutes = await Route.countDocuments();

  console.log(`  • Nilesh   (${nilesh.emailId})  : ${nileshCount} registered trucks & corridor routes`);
  console.log(`  • Tushar   (${tushar.emailId})  : ${tusharCount} registered trucks & corridor routes`);
  console.log(`  • Lakshya  (${lakshya.emailId}) : ${lakshyaCount} registered trucks & corridor routes`);
  console.log(`  • Dinky    (${dinky.emailId})   : ${dinkyCount} active consignment delivery requests`);
  console.log(`  • Rupesh   (${rupesh.emailId})  : ${rupeshCount} active consignment delivery requests`);
  console.log(`  • Abhinav  (${abhinav.emailId}) : ${totalTrucks} total fleet trucks, ${pairs.length} mergeable candidate pairs in Route Optimizer`);
  console.log("========================================================\n");

  await mongoose.connection.close();
  console.log("🔒 MongoDB connection closed.");
}

run().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});

