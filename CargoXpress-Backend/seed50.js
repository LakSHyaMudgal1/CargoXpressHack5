const mongoose = require("mongoose");
require("dotenv").config();

const Truck = require("./src/models/truck");
const Route = require("./src/models/route");
const MergeablePair = require("./src/models/mergeablePair");
const MergedSchedule = require("./src/models/mergedSchedule");
const MergeableTrader = require("./src/models/mergeableTrader");
const TransportCompany = require("./src/models/transportCompany");
const Trader = require("./src/models/trader");

const URI = process.env.MONGODB_URI || "mongodb+srv://LAD_PROJECT:LAD%40123@ladproject.cfgyg.mongodb.net/CargoXpress";

const indianCities = [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai",
    "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
    "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna",
    "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad"
];

function getRandomCities(count) {
    const shuffled = [...indianCities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
    await mongoose.connect(URI);
    console.log("✅ Connected to MongoDB");

    console.log("🗑️  Clearing MergeablePair, MergedSchedule, MergeableTrader...");
    await MergeablePair.deleteMany({});
    await MergedSchedule.deleteMany({});
    await MergeableTrader.deleteMany({});
    console.log("✅ Cleared data.");

    // Fetch a company and a trader to associate records with
    const company = await TransportCompany.findOne();
    const trader = await Trader.findOne();

    if (!company || !trader) {
        console.error("❌ Need at least one TransportCompany and one Trader in the DB.");
        process.exit(1);
    }

    console.log("🚀 Generating 50 MergeablePairs...");
    for (let i = 0; i < 50; i++) {
        const stops = getRandomCities(4);
        
        // Create Truck 1
        const truck1 = await Truck.create({
            companyId: company._id,
            licensePlate: `MH-${getRandomInt(10, 99)}-AA-${getRandomInt(1000, 9999)}`,
            totalCapacity: 10000,
            currentLoad: [1000, 2000, 3000, 4000],
            remainingLoad: [9000, 8000, 7000, 6000]
        });
        await Route.create({
            companyId: company._id, truckId: truck1._id,
            source: stops[0], destination: stops[3], stops: stops
        });

        // Create Truck 2 (subset of Truck 1)
        const truck2 = await Truck.create({
            companyId: company._id,
            licensePlate: `DL-${getRandomInt(10, 99)}-BB-${getRandomInt(1000, 9999)}`,
            totalCapacity: 5000,
            currentLoad: [500, 1000, 1500],
            remainingLoad: [4500, 4000, 3500]
        });
        await Route.create({
            companyId: company._id, truckId: truck2._id,
            source: stops[0], destination: stops[2], stops: stops.slice(0, 3)
        });

        await MergeablePair.create({
            truckOneId: truck1._id,
            truckOneLicensePlate: truck1.licensePlate,
            truckOneStops: stops,
            truckTwoId: truck2._id,
            truckTwoLicensePlate: truck2.licensePlate,
            truckTwoStops: stops.slice(0, 3)
        });
    }

    console.log("🚀 Generating 50 MergedSchedules...");
    for (let i = 0; i < 50; i++) {
        const stops = getRandomCities(5);
        const truck = await Truck.create({
            companyId: company._id,
            licensePlate: `GJ-${getRandomInt(10, 99)}-CC-${getRandomInt(1000, 9999)}`,
            totalCapacity: 12000,
            currentLoad: [1000, 2000, 3000, 4000, 5000],
            remainingLoad: [11000, 10000, 9000, 8000, 7000]
        });
        await Route.create({
            companyId: company._id, truckId: truck._id,
            source: stops[0], destination: stops[4], stops: stops
        });

        await MergedSchedule.create({
            transportationTruckId: truck._id,
            transportationTruckLicensePlate: truck.licensePlate,
            mergedFromTrucks: [
                { licensePlate: `XX-00-XX-${getRandomInt(1000, 9999)}`, id: new mongoose.Types.ObjectId().toString() },
                { licensePlate: `YY-00-YY-${getRandomInt(1000, 9999)}`, id: new mongoose.Types.ObjectId().toString() }
            ],
            finalSource: stops[0],
            finalDestination: stops[4],
            stops: stops,
            finalCurrentLoad: [1000, 2000, 3000, 4000, 5000],
            finalRemainingLoad: [11000, 10000, 9000, 8000, 7000],
            totalCapacity: 12000,
            status: Math.random() > 0.2 ? 'accepted' : 'rejected'
        });
    }

    console.log("🚀 Generating 50 MergeableTraders...");
    const mergedSchedules = await MergedSchedule.find({ status: 'accepted' }).limit(50);
    
    for (let i = 0; i < 50; i++) {
        const schedule = mergedSchedules[i % mergedSchedules.length];
        if (!schedule) break;

        await MergeableTrader.create({
            traderRequestId: new mongoose.Types.ObjectId().toString(),
            traderId: trader._id,
            truckId: schedule.transportationTruckId.toString(),
            licensePlate: schedule.transportationTruckLicensePlate,
            load: [500, 500, 500],
            source: schedule.stops[0],
            destination: schedule.stops[2] || schedule.stops[1],
            stops: schedule.stops.slice(0, 3),
            status: 'accepted'
        });
    }

    console.log("✅ Successfully seeded 50 entries each!");
    await mongoose.connection.close();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
