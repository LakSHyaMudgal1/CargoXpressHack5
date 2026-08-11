const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const TransportCompany = require("./src/models/transportCompany");
const Trader           = require("./src/models/trader");
const Admin            = require("./src/models/admin");
const Truck            = require("./src/models/truck");
const Route            = require("./src/models/route");
const TraderRequest    = require("./src/models/traderRequest");
const MergeablePair    = require("./src/models/mergeablePair");
const MergedSchedule   = require("./src/models/mergedSchedule");
const FreeTruck        = require("./src/models/freeTruck");
const UnmergedTruck    = require("./src/models/unmergedTruck");
const MergeableTrader  = require("./src/models/mergeableTrader");

const URI = process.env.MONGODB_URI || "mongodb+srv://LAD_PROJECT:LAD%40123@ladproject.cfgyg.mongodb.net/CargoXpress";

async function run() {
  await mongoose.connect(URI);
  console.log("✅ Connected to MongoDB\n");

  // ── 1. Clear everything except admins ───────────────────────────────────
  console.log("🗑️  Clearing operational data...");
  await Promise.all([
    Truck.deleteMany({}),
    Route.deleteMany({}),
    TraderRequest.deleteMany({}),
    MergeablePair.deleteMany({}),
    MergedSchedule.deleteMany({}),
    FreeTruck.deleteMany({}),
    UnmergedTruck.deleteMany({}),
    MergeableTrader.deleteMany({}),
    Trader.deleteMany({}),
    TransportCompany.deleteMany({}),
  ]);
  console.log("✅ Cleared\n");

  const pw       = await bcrypt.hash("Test@1234",  10);
  const adminPw  = await bcrypt.hash("Admin@1234", 10);

  // ── 2. Admins ─────────────────────────────────────────────────────────
  console.log("👤 Seeding admins...");
  for (const email of ["lakshya@cargoxpress.com","abhinav@cargoxpress.com","dinky@cargoxpress.com"]) {
    await Admin.findOneAndUpdate({ emailId: email },
      { emailId: email, password: adminPw }, { upsert: true });
  }
  console.log("✅ 3 admins ready\n");

  // ── 3. Companies ──────────────────────────────────────────────────────
  console.log("🏢 Seeding companies...");
  const c1 = await TransportCompany.create({
    name: "FastTrack Logistics",        emailId: "fasttrack@logistics.com",
    password: pw, address: "Mumbai, Maharashtra", registrationNumber: "MH-REG-001",
    photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
  });
  const c2 = await TransportCompany.create({
    name: "NorthStar Transport",        emailId: "northstar@transport.com",
    password: pw, address: "Delhi, India",        registrationNumber: "DL-REG-002",
    photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
  });
  const c3 = await TransportCompany.create({
    name: "SouthEx Freight",            emailId: "southex@freight.com",
    password: pw, address: "Chennai, Tamil Nadu", registrationNumber: "TN-REG-003",
    photoUrl: "https://cdn-icons-png.flaticon.com/256/3097/3097144.png"
  });
  console.log("✅ 3 companies\n");

  // ── 4. Traders ────────────────────────────────────────────────────────
  console.log("👥 Seeding traders...");
  const t1 = await Trader.create({
    name: "Ramesh Kumar",   emailId: "ramesh@trading.com",
    password: pw, aadharNumber: "111122223333", address: "Mumbai"
  });
  const t2 = await Trader.create({
    name: "Sunita Sharma",  emailId: "sunita@goods.com",
    password: pw, aadharNumber: "444455556666", address: "Pune"
  });
  const t3 = await Trader.create({
    name: "Amit Patel",     emailId: "amit@trade.com",
    password: pw, aadharNumber: "777788889999", address: "Nagpur"
  });
  const t4 = await Trader.create({
    name: "Priya Singh",    emailId: "priya@commerce.com",
    password: pw, aadharNumber: "101010101010", address: "Bhopal"
  });
  const t5 = await Trader.create({
    name: "Vikram Nair",    emailId: "vikram@exports.com",
    password: pw, aadharNumber: "121212121212", address: "Surat"
  });
  console.log("✅ 5 traders\n");

  // ── 5. Trucks + Routes ────────────────────────────────────────────────
  // Naming convention in comments:
  //   PAIR A  – Truck 1 & Truck 2  → same corridor, Truck2 stops are subset of Truck1
  //   PAIR B  – Truck 3 & Truck 4  → another corridor
  //   SOLO    – Truck 5            → no overlap (will go independently if not merged with a trader)

  console.log("🚚 Seeding trucks + routes...");

  // ── Pair A ──────────────────────────────────────────────────────────
  // Truck 1  Mumbai → Surat → Vadodara → Ahmedabad → Rajkot  (5 stops, 8 000 kg cap)
  const truck1 = await Truck.create({
    companyId: c1._id, licensePlate: "MH-01-AA-1111",
    totalCapacity: 8000,
    currentLoad:   [1000, 800, 600, 500, 400],
    remainingLoad: [7000, 7200, 7400, 7500, 7600]
  });
  await Route.create({
    companyId: c1._id, truckId: truck1._id,
    source: "Mumbai", destination: "Rajkot",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad", "Rajkot"]
  });

  // Truck 2  Mumbai → Surat → Vadodara → Ahmedabad  (4 stops, 5 000 kg cap — subset of Truck1)
  const truck2 = await Truck.create({
    companyId: c2._id, licensePlate: "DL-02-BB-2222",
    totalCapacity: 5000,
    currentLoad:   [900, 700, 600, 500],
    remainingLoad: [4100, 4300, 4400, 4500]
  });
  await Route.create({
    companyId: c2._id, truckId: truck2._id,
    source: "Mumbai", destination: "Ahmedabad",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"]
  });

  // ── Pair B ──────────────────────────────────────────────────────────
  // Truck 3  Delhi → Agra → Gwalior → Bhopal → Nagpur → Hyderabad  (6 stops, 10 000 kg)
  const truck3 = await Truck.create({
    companyId: c2._id, licensePlate: "DL-03-CC-3333",
    totalCapacity: 10000,
    currentLoad:   [2000, 1500, 1200, 1000, 800, 600],
    remainingLoad: [8000, 8500, 8800, 9000, 9200, 9400]
  });
  await Route.create({
    companyId: c2._id, truckId: truck3._id,
    source: "Delhi", destination: "Hyderabad",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal", "Nagpur", "Hyderabad"]
  });

  // Truck 4  Delhi → Agra → Gwalior → Bhopal  (4 stops, 6 000 kg — subset of Truck3)
  const truck4 = await Truck.create({
    companyId: c3._id, licensePlate: "TN-04-DD-4444",
    totalCapacity: 6000,
    currentLoad:   [1500, 1200, 1000, 800],
    remainingLoad: [4500, 4800, 5000, 5200]
  });
  await Route.create({
    companyId: c3._id, truckId: truck4._id,
    source: "Delhi", destination: "Bhopal",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal"]
  });

  // ── Solo ────────────────────────────────────────────────────────────
  // Truck 5  Chennai → Vellore → Bengaluru → Mysuru → Mangaluru  (5 stops, 7 000 kg)
  const truck5 = await Truck.create({
    companyId: c3._id, licensePlate: "TN-05-EE-5555",
    totalCapacity: 7000,
    currentLoad:   [1200, 900, 800, 700, 500],
    remainingLoad: [5800, 6100, 6200, 6300, 6500]
  });
  await Route.create({
    companyId: c3._id, truckId: truck5._id,
    source: "Chennai", destination: "Mangaluru",
    stops: ["Chennai", "Vellore", "Bengaluru", "Mysuru", "Mangaluru"]
  });

  console.log("✅ 5 trucks + 5 routes\n");

  // ── 6. Trader Requests ────────────────────────────────────────────────
  // All trader routes are sub-sets of at least one truck route → they will match
  console.log("📦 Seeding trader requests...");

  // TR1  Ramesh: Mumbai → Ahmedabad  (matches Truck1 & Truck2)
  await TraderRequest.create({
    traderId: t1._id, source: "Mumbai", destination: "Ahmedabad",
    stops: ["Mumbai", "Surat", "Vadodara", "Ahmedabad"],
    load: [300, 250, 200, 150]
  });

  // TR2  Sunita: Mumbai → Vadodara  (matches Truck1 & Truck2)
  await TraderRequest.create({
    traderId: t2._id, source: "Mumbai", destination: "Vadodara",
    stops: ["Mumbai", "Surat", "Vadodara"],
    load: [400, 350, 300]
  });

  // TR3  Amit: Delhi → Nagpur  (matches Truck3)
  await TraderRequest.create({
    traderId: t3._id, source: "Delhi", destination: "Nagpur",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal", "Nagpur"],
    load: [500, 400, 350, 300, 250]
  });

  // TR4  Priya: Delhi → Bhopal  (matches Truck3 & Truck4)
  await TraderRequest.create({
    traderId: t4._id, source: "Delhi", destination: "Bhopal",
    stops: ["Delhi", "Agra", "Gwalior", "Bhopal"],
    load: [600, 500, 400, 300]
  });

  // TR5  Vikram: Chennai → Bengaluru  (matches Truck5)
  await TraderRequest.create({
    traderId: t5._id, source: "Chennai", destination: "Bengaluru",
    stops: ["Chennai", "Vellore", "Bengaluru"],
    load: [800, 600, 400]
  });

  console.log("✅ 5 trader requests\n");

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("🎉  SEED COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n🔑 LOGIN CREDENTIALS");
  console.log("  Admin     : lakshya@cargoxpress.com  / Admin@1234");
  console.log("  Company 1 : fasttrack@logistics.com  / Test@1234");
  console.log("  Company 2 : northstar@transport.com  / Test@1234");
  console.log("  Company 3 : southex@freight.com      / Test@1234");
  console.log("  Trader 1  : ramesh@trading.com       / Test@1234");
  console.log("  Trader 2  : sunita@goods.com         / Test@1234");
  console.log("  Trader 3  : amit@trade.com           / Test@1234");
  console.log("  Trader 4  : priya@commerce.com       / Test@1234");
  console.log("  Trader 5  : vikram@exports.com       / Test@1234");
  console.log("\n🚚 MERGEABLE PAIRS (overlapping routes)");
  console.log("  PAIR A  →  MH-01-AA-1111  (Mumbai→Rajkot, 5 stops)");
  console.log("             DL-02-BB-2222  (Mumbai→Ahmedabad, 4 stops)  ← subset");
  console.log("  PAIR B  →  DL-03-CC-3333  (Delhi→Hyderabad, 6 stops)");
  console.log("             TN-04-DD-4444  (Delhi→Bhopal, 4 stops)      ← subset");
  console.log("  SOLO    →  TN-05-EE-5555  (Chennai→Mangaluru, 5 stops) no pair");
  console.log("\n📦 TRADER REQUESTS");
  console.log("  TR1 Ramesh  : Mumbai → Ahmedabad (overlaps PAIR A trucks)");
  console.log("  TR2 Sunita  : Mumbai → Vadodara  (overlaps PAIR A trucks)");
  console.log("  TR3 Amit    : Delhi  → Nagpur    (overlaps Truck3 in PAIR B)");
  console.log("  TR4 Priya   : Delhi  → Bhopal    (overlaps PAIR B trucks)");
  console.log("  TR5 Vikram  : Chennai → Bengaluru (overlaps SOLO Truck5)");
  console.log("═══════════════════════════════════════════════════════\n");

  await mongoose.connection.close();
  console.log("✅ Connection closed");
}

run().catch(err => { console.error("❌", err); process.exit(1); });
