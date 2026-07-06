require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const TransportCompany = require('./src/models/transportCompany');
const Trader           = require('./src/models/trader');
const Truck            = require('./src/models/truck');
const Route            = require('./src/models/route');
const TraderRequest    = require('./src/models/traderRequest');

// ── Indian city routes ─────────────────────────────────────────────────────
const routeTemplates = [
  { source: 'Mumbai',    destination: 'Delhi',     stops: ['Surat', 'Vadodara', 'Ahmedabad', 'Udaipur', 'Jaipur'] },
  { source: 'Delhi',     destination: 'Kolkata',   stops: ['Agra', 'Lucknow', 'Varanasi', 'Patna'] },
  { source: 'Chennai',   destination: 'Hyderabad', stops: ['Vellore', 'Tirupati', 'Kurnool'] },
  { source: 'Bangalore', destination: 'Mumbai',    stops: ['Pune', 'Nashik'] },
  { source: 'Kolkata',   destination: 'Guwahati',  stops: ['Durgapur', 'Siliguri', 'Jalpaiguri'] },
  { source: 'Jaipur',    destination: 'Delhi',     stops: ['Alwar', 'Gurugram'] },
  { source: 'Ahmedabad', destination: 'Pune',      stops: ['Surat', 'Nashik'] },
  { source: 'Hyderabad', destination: 'Bangalore', stops: ['Kurnool', 'Anantapur'] },
  { source: 'Lucknow',   destination: 'Kolkata',   stops: ['Varanasi', 'Patna', 'Dhanbad'] },
  { source: 'Delhi',     destination: 'Chandigarh',stops: ['Panipat', 'Ambala'] },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const companyNames = [
  'Bharat Freight Co.',    'Rajdhani Logistics',    'Shakti Transport Ltd.',
  'Ambika Roadways',       'Ganesh Cargo Services', 'National Carriers Pvt.',
  'Sunrise Logistics',     'IndiaLoad Express',     'TrustLine Transport',
];

const traderNames = [
  'Ramesh Agarwal',  'Sunita Sharma',   'Vikram Patel',    'Priya Nair',
  'Amit Joshi',      'Kavita Singh',    'Deepak Yadav',    'Meena Gupta',
  'Sanjay Mehta',    'Anita Verma',     'Ravi Kumar',      'Pooja Tiwari',
  'Harish Soni',     'Geeta Mishra',    'Naresh Reddy',    'Shweta Dubey',
  'Mahesh Pandey',   'Lalita Chauhan',  'Suresh Iyer',     'Rekha Pillai',
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_STRING);
  console.log('Connected to MongoDB');

  const password = await bcrypt.hash('Test@1234', 10);

  // ── 1. Create 9 more transport companies ──────────────────────────────────
  const existingCompanies = await TransportCompany.find({}).select('_id name');
  let companies = [...existingCompanies];

  for (let i = 0; i < companyNames.length; i++) {
    const emailId = `company${i + 1}@cargoxpress-demo.com`;
    const exists = await TransportCompany.findOne({ emailId });
    if (!exists) {
      const c = await TransportCompany.create({
        name: companyNames[i],
        emailId,
        password,
        registrationNumber: `REG${100 + i}`,
        address: `${pick(['Mumbai','Delhi','Chennai','Kolkata','Bangalore'])}, India`,
        photoUrl: 'https://cdn-icons-png.flaticon.com/256/149/149071.png',
      });
      companies.push(c);
      console.log('  Created company:', c.name);
    }
  }

  // ── 2. Create 20 traders ─────────────────────────────────────────────────
  const existingTraders = await Trader.find({}).select('_id name');
  let traders = [...existingTraders];

  for (let i = 0; i < traderNames.length; i++) {
    const emailId = `trader${i + 1}@demo.com`;
    const aadharNumber = String(700000000000 + i * 17 + rand(1, 9)).padStart(12, '0');
    const exists = await Trader.findOne({ emailId });
    if (!exists) {
      const t = await Trader.create({
        name: traderNames[i],
        emailId,
        password,
        aadharNumber,
        photoUrl: 'https://cdn-icons-png.flaticon.com/256/149/149071.png',
      });
      traders.push(t);
      console.log('  Created trader:', t.name);
    }
  }

  // ── 3. Add trucks + routes for each company ───────────────────────────────
  let truckCount = 0;

  for (let ci = 0; ci < companies.length; ci++) {
    const company = companies[ci];
    const numTrucks = rand(2, 4);

    for (let t = 0; t < numTrucks; t++) {
      const plate = `TRK${String(ci).padStart(2,'0')}${String(t).padStart(2,'0')}${rand(10,99)}`;
      const exists = await Truck.findOne({ licensePlate: plate });
      if (exists) continue;

      const routeTemplate = routeTemplates[(ci * numTrucks + t) % routeTemplates.length];
      const totalCapacity = pick([800, 1000, 1200, 1500, 2000]);
      const numStops = routeTemplate.stops.length;
      const currentLoad = Array.from({ length: numStops }, () => rand(50, Math.floor(totalCapacity * 0.6)));
      const remainingLoad = currentLoad.map(l => totalCapacity - l);

      const truck = await Truck.create({
        licensePlate: plate,
        companyId: company._id,
        totalCapacity,
        currentLoad,
        remainingLoad,
      });

      await Route.create({
        truckId: truck._id,
        source: routeTemplate.source,
        destination: routeTemplate.destination,
        stops: routeTemplate.stops,
      });

      truckCount++;
      console.log(`  Truck ${plate} (${routeTemplate.source}→${routeTemplate.destination}) for ${company.name}`);
    }
  }

  // ── 4. Add trader requests ─────────────────────────────────────────────────
  let reqCount = 0;

  for (let ti = 0; ti < traders.length; ti++) {
    const trader = traders[ti];
    const numReqs = rand(1, 3);

    for (let r = 0; r < numReqs; r++) {
      const rt = routeTemplates[(ti + r) % routeTemplates.length];
      const numStops = rand(1, rt.stops.length);
      const load = Array.from({ length: numStops }, () => rand(50, 400));
      const stops = rt.stops.slice(0, numStops);

      await TraderRequest.create({
        traderId: trader._id,
        load,
        source: rt.source,
        destination: rt.destination,
        stops,
      });

      reqCount++;
    }
  }

  console.log(`\n✅ Seed complete:`);
  console.log(`   Companies : ${companies.length}`);
  console.log(`   Traders   : ${traders.length}`);
  console.log(`   Trucks+Routes added : ${truckCount}`);
  console.log(`   Trader Requests added : ${reqCount}`);
  console.log(`\n   All passwords: Test@1234`);

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
