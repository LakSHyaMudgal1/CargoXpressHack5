const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const MergeablePair = require('../src/models/mergeablePair');
const MergedSchedule = require('../src/models/mergedSchedule');
const FreeTruck = require('../src/models/freeTruck');
const TransportCompany = require('../src/models/transportCompany');
const Trader = require('../src/models/trader');
const TraderRequest = require('../src/models/traderRequest');
const MergeableTrader = require('../src/models/mergeableTrader');

const mergeRouter = require('../src/routes/merge');
const {
    evaluateRouteCompatibility,
    evaluateSegmentCapacity,
    buildMergedData,
    generateMergeablePairs,
    executeAcceptPair,
} = mergeRouter;

describe('Route Compatibility & Segment Capacity Validation Test Suite', () => {
    const URI = process.env.MONGODB_URI || process.env.MONGODB_STRING;

    let company;
    let traderUser;

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(URI);
        }

        // Clean up any test fixtures from previous runs
        await Promise.all([
            Truck.deleteMany({ licensePlate: /^VAL-/ }),
            Route.deleteMany({ source: /^ValCity-/ }),
            FreeTruck.deleteMany({ licensePlate: /^VAL-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^VAL-/ }),
            MergeablePair.deleteMany({
                $or: [
                    { truckOneLicensePlate: /^VAL-/ },
                    { truckTwoLicensePlate: /^VAL-/ },
                ]
            }),
            TransportCompany.deleteMany({ emailId: 'val_test_company@cargoxpress-test.com' }),
            Trader.deleteMany({ emailId: 'val_trader@cargoxpress-test.com' }),
            TraderRequest.deleteMany({ source: /^ValCity-/ }),
            MergeableTrader.deleteMany({ licensePlate: /^VAL-/ }),
        ]);

        company = await TransportCompany.create({
            name: 'Validation Test Logistics',
            emailId: 'val_test_company@cargoxpress-test.com',
            password: 'TestPassword123!',
            registrationNumber: 'VAL-REG-777',
            address: 'Vadodara, India',
        });

        traderUser = await Trader.create({
            name: 'Val Test Trader',
            emailId: 'val_trader@cargoxpress-test.com',
            password: 'TestPassword123!',
            aadharNumber: '999988887777',
            address: 'Surat, India',
        });
    });

    after(async () => {
        await Promise.all([
            Truck.deleteMany({ licensePlate: /^VAL-/ }),
            Route.deleteMany({ source: /^ValCity-/ }),
            FreeTruck.deleteMany({ licensePlate: /^VAL-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^VAL-/ }),
            MergeablePair.deleteMany({
                $or: [
                    { truckOneLicensePlate: /^VAL-/ },
                    { truckTwoLicensePlate: /^VAL-/ },
                ]
            }),
            TransportCompany.deleteMany({ emailId: 'val_test_company@cargoxpress-test.com' }),
            Trader.deleteMany({ emailId: 'val_trader@cargoxpress-test.com' }),
            TraderRequest.deleteMany({ source: /^ValCity-/ }),
            MergeableTrader.deleteMany({ licensePlate: /^VAL-/ }),
        ]);
        await mongoose.connection.close();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Compatible short route merging into a longer route
    // ─────────────────────────────────────────────────────────────────────────
    test('1. A compatible short route merging into a longer route', async () => {
        const carrierStops = ['ValCity-A1', 'ValCity-A2', 'ValCity-A3', 'ValCity-A4', 'ValCity-A5'];
        const shortStops = ['ValCity-A2', 'ValCity-A3', 'ValCity-A4'];

        const routeCheck = evaluateRouteCompatibility(carrierStops, shortStops);
        assert.equal(routeCheck.compatible, true, 'Short route should be compatible with carrier route');
        assert.deepEqual(routeCheck.allStops, carrierStops, 'All stops should equal carrier stops');

        // Carrier: 8000 kg cap, short: 4000 kg cap, loads fit comfortably
        const carrierLoads = [1000, 800, 600, 500, 400];
        const shortLoads = [800, 600, 500];
        const capacityCheck = evaluateSegmentCapacity(
            carrierStops, carrierLoads, 8000,
            shortStops, shortLoads, carrierStops
        );

        assert.equal(capacityCheck.feasible, true, 'Capacity should be feasible on all segments');
        // S1: 1000 + 0 = 1000
        // S2: 800 + 800 = 1600
        // S3: 600 + 600 = 1200
        // S4: 500 + 500 = 1000
        // S5: 400 + 0 = 400
        assert.deepEqual(capacityCheck.finalCurrentLoad, [1000, 1600, 1200, 1000, 400]);
        assert.deepEqual(capacityCheck.finalRemainingLoad, [7000, 6400, 6800, 7000, 7600]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Previously merged carrier accepting additional compatible cargo
    // ─────────────────────────────────────────────────────────────────────────
    test('2. A previously merged carrier accepting additional compatible cargo', async () => {
        const C1 = 'ValCity-B1', C2 = 'ValCity-B2', C3 = 'ValCity-B3', C4 = 'ValCity-B4', C5 = 'ValCity-B5';

        // Step A: Create and merge Truck A and Truck B in DB
        const truckA = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-TRK-A2',
            totalCapacity: 8000,
            currentLoad: [1000, 800, 600, 500, 400],
            remainingLoad: [7000, 7200, 7400, 7500, 7600],
        });
        await Route.create({
            companyId: company._id, truckId: truckA._id,
            source: C1, destination: C5, stops: [C1, C2, C3, C4, C5],
        });

        const truckB = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-TRK-B2',
            totalCapacity: 5000,
            currentLoad: [800, 600, 500],
            remainingLoad: [4200, 4400, 4500],
        });
        await Route.create({
            companyId: company._id, truckId: truckB._id,
            source: C2, destination: C4, stops: [C2, C3, C4],
        });

        const pairs1 = await generateMergeablePairs();
        const pairAB = pairs1.find(p => p.truckOneLicensePlate === 'VAL-TRK-A2' && p.truckTwoLicensePlate === 'VAL-TRK-B2');
        assert.ok(pairAB, 'Pair AB should be generated');

        const schedAB = await executeAcceptPair(pairAB._id);
        assert.equal(schedAB.status, 'accepted');
        assert.deepEqual(schedAB.finalCurrentLoad, [1000, 1600, 1200, 1000, 400]);

        // Step B: Create Truck C with additional compatible cargo
        const truckC = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-TRK-C2',
            totalCapacity: 4000,
            currentLoad: [400, 300],
            remainingLoad: [3600, 3700],
        });
        await Route.create({
            companyId: company._id, truckId: truckC._id,
            source: C3, destination: C4, stops: [C3, C4],
        });

        // Step C: Optimizer should find active carrier Truck A with Truck C
        const pairs2 = await generateMergeablePairs();
        const pairAC = pairs2.find(p => p.truckOneLicensePlate === 'VAL-TRK-A2' && p.truckTwoLicensePlate === 'VAL-TRK-C2');
        assert.ok(pairAC, 'Active carrier Truck A should generate candidate pair with Truck C');

        const schedABC = await executeAcceptPair(pairAC._id);
        assert.equal(schedABC.mergedFromTrucks.length, 3, 'Must retain carrier and both absorbed shipments');
        // S1: 1000
        // S2: 1600
        // S3: 1200 + 400 = 1600
        // S4: 1000 + 300 = 1300
        // S5: 400
        assert.deepEqual(schedABC.finalCurrentLoad, [1000, 1600, 1600, 1300, 400]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: New cargo load fitting later segments but not an earlier segment
    // ─────────────────────────────────────────────────────────────────────────
    test('3. A new cargo load fitting the later segments but not an earlier segment', async () => {
        const stops = ['ValCity-C1', 'ValCity-C2', 'ValCity-C3', 'ValCity-C4'];
        const carrierLoads = [4500, 1500, 1000, 500]; // S1 has only 500 kg remaining space!
        const carrierCapacity = 5000;

        // Incoming truck wants to ship 1000 kg across the whole route S1 -> S4
        const incomingStops = stops;
        const incomingLoads = [1000, 1000, 1000, 500];

        const capCheck = evaluateSegmentCapacity(
            stops, carrierLoads, carrierCapacity,
            incomingStops, incomingLoads, stops
        );

        assert.equal(capCheck.feasible, false, 'Must be rejected because S1 exceeds capacity');
        assert.equal(capCheck.failedStopIndex, 0, 'Must fail on first segment at index 0');
        assert.equal(capCheck.totalLoadAtStop, 5500, '4500 + 1000 = 5500 kg exceeds 5000 kg capacity');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Merge rejected when only one segment exceeds capacity
    // ─────────────────────────────────────────────────────────────────────────
    test('4. A merge being rejected when only one segment exceeds capacity', async () => {
        const stops = ['ValCity-D1', 'ValCity-D2', 'ValCity-D3', 'ValCity-D4'];
        const carrierLoads = [2000, 4200, 2000, 1000]; // Only S2 is bottleneck (4200 kg)
        const carrierCapacity = 5000;

        // Incoming truck brings 1000 kg
        const incomingStops = stops;
        const incomingLoads = [1000, 1000, 1000, 500];

        const capCheck = evaluateSegmentCapacity(
            stops, carrierLoads, carrierCapacity,
            incomingStops, incomingLoads, stops
        );

        // At S1: 2000 + 1000 = 3000 <= 5000 (Fits)
        // At S2: 4200 + 1000 = 5200 > 5000 (EXCEEDS!)
        // At S3: 2000 + 1000 = 3000 <= 5000 (Fits)
        assert.equal(capCheck.feasible, false, 'Candidate must be rejected');
        assert.equal(capCheck.failedStopIndex, 1, 'Failure must be at index 1 (S2)');
        assert.equal(capCheck.stopName, 'ValCity-D2');
        assert.equal(capCheck.totalLoadAtStop, 5200);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Intermediate delivery freeing capacity on subsequent segments
    // ─────────────────────────────────────────────────────────────────────────
    test('5. An intermediate delivery freeing capacity on subsequent segments', async () => {
        const stops = ['ValCity-E1', 'ValCity-E2', 'ValCity-E3', 'ValCity-E4'];
        // Carrier: departing E1: 4800 kg (only 200 kg free).
        // At E2: 3300 kg unloaded! Departing E2: 1500 kg (3500 kg free!).
        const carrierLoads = [4800, 1500, 1000, 500];
        const carrierCapacity = 5000;

        // Incoming truck only starts at E2 (pickup at E2) and delivers at E4 with 2500 kg
        const incomingStops = ['ValCity-E2', 'ValCity-E3', 'ValCity-E4'];
        const incomingLoads = [2500, 2000, 1000];

        const capCheck = evaluateSegmentCapacity(
            stops, carrierLoads, carrierCapacity,
            incomingStops, incomingLoads, stops
        );

        assert.equal(capCheck.feasible, true, 'Must be feasible because delivery at E2 freed capacity');
        // E1: 4800 + 0 = 4800 <= 5000
        // E2: 1500 + 2500 = 4000 <= 5000
        // E3: 1000 + 2000 = 3000 <= 5000
        // E4: 500 + 1000 = 1500 <= 5000
        assert.deepEqual(capCheck.finalCurrentLoad, [4800, 4000, 3000, 1500]);
        assert.deepEqual(capCheck.finalRemainingLoad, [200, 1000, 2000, 3500]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 6: Route rejected when stop sequence violates delivery constraints
    // ─────────────────────────────────────────────────────────────────────────
    test('6. A route being rejected when the stop sequence violates delivery constraints', async () => {
        const carrierStops = ['ValCity-F1', 'ValCity-F2', 'ValCity-F3', 'ValCity-F4'];
        // Incoming truck has reversed stops: F3 before F2
        const reversedStops = ['ValCity-F3', 'ValCity-F2'];

        const routeCheck = evaluateRouteCompatibility(carrierStops, reversedStops);
        assert.equal(routeCheck.compatible, false, 'Reversed route must be rejected');
        assert.match(routeCheck.reason, /Stop sequence violates delivery constraints/i);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 7: Partial route overlap that is compatible under existing business rules
    // ─────────────────────────────────────────────────────────────────────────
    test('7. Partial route overlap that is compatible under the existing business rules', async () => {
        const carrierStops = ['ValCity-G1', 'ValCity-G2', 'ValCity-G4', 'ValCity-G5'];
        const incomingStops = ['ValCity-G2', 'ValCity-G3', 'ValCity-G4'];

        const routeCheck = evaluateRouteCompatibility(carrierStops, incomingStops);
        assert.equal(routeCheck.compatible, true, 'Intermediate stop G3 should be incorporated');
        assert.deepEqual(routeCheck.allStops, ['ValCity-G1', 'ValCity-G2', 'ValCity-G3', 'ValCity-G4', 'ValCity-G5']);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 8: Partial route overlap that is not compatible
    // ─────────────────────────────────────────────────────────────────────────
    test('8. Partial route overlap that is not compatible', async () => {
        // Case A: Incoming shipment destination extends past carrier destination
        const carrierA = ['ValCity-H1', 'ValCity-H2', 'ValCity-H3'];
        const incomingA = ['ValCity-H2', 'ValCity-H3', 'ValCity-H4'];
        const checkA = evaluateRouteCompatibility(carrierA, incomingA);
        assert.equal(checkA.compatible, false, 'Delivery beyond carrier terminus must be rejected');
        assert.match(checkA.reason, /beyond the carrier's itinerary bounds/i);

        // Case B: Incoming shipment origin starts before carrier origin
        const carrierB = ['ValCity-H2', 'ValCity-H3', 'ValCity-H4'];
        const incomingB = ['ValCity-H1', 'ValCity-H2', 'ValCity-H3'];
        const checkB = evaluateRouteCompatibility(carrierB, incomingB);
        assert.equal(checkB.compatible, false, 'Pickup before carrier origin must be rejected');
        assert.match(checkB.reason, /not reachable on the carrier's itinerary/i);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 9: Two consecutive merges preserving original and incoming shipment data
    // ─────────────────────────────────────────────────────────────────────────
    test('9. Two consecutive merges preserving the original and incoming shipment data', async () => {
        const K1 = 'ValCity-K1', K2 = 'ValCity-K2', K3 = 'ValCity-K3', K4 = 'ValCity-K4', K5 = 'ValCity-K5';

        const truckCarrier = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-CARRIER-9',
            totalCapacity: 10000,
            currentLoad: [2000, 1500, 1200, 1000, 800],
            remainingLoad: [8000, 8500, 8800, 9000, 9200],
        });
        await Route.create({
            companyId: company._id, truckId: truckCarrier._id,
            source: K1, destination: K5, stops: [K1, K2, K3, K4, K5],
        });

        const truckInc1 = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-INC-9A',
            totalCapacity: 4000,
            currentLoad: [900, 700, 600],
            remainingLoad: [3100, 3300, 3400],
        });
        await Route.create({
            companyId: company._id, truckId: truckInc1._id,
            source: K1, destination: K3, stops: [K1, K2, K3],
        });

        // 1st merge: Carrier absorbs Inc1
        const pairs1 = await generateMergeablePairs();
        const pair1 = pairs1.find(p => p.truckOneLicensePlate === 'VAL-CARRIER-9' && p.truckTwoLicensePlate === 'VAL-INC-9A');
        assert.ok(pair1, 'Pair 1 (Carrier + Inc1) must be found');
        await executeAcceptPair(pair1._id);

        const truckInc2 = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-INC-9B',
            totalCapacity: 4000,
            currentLoad: [500, 400, 300],
            remainingLoad: [3500, 3600, 3700],
        });
        await Route.create({
            companyId: company._id, truckId: truckInc2._id,
            source: K2, destination: K4, stops: [K2, K3, K4],
        });

        // 2nd merge: Carrier absorbs Inc2
        const pairs2 = await generateMergeablePairs();
        const pair2 = pairs2.find(p => p.truckOneLicensePlate === 'VAL-CARRIER-9' && p.truckTwoLicensePlate === 'VAL-INC-9B');
        assert.ok(pair2, 'Pair 2 (Carrier + Inc2) must be found');
        const finalSched = await executeAcceptPair(pair2._id);

        // Manifest must have exactly 3 shipments with full provenance
        assert.equal(finalSched.mergedFromTrucks.length, 3);
        const carrierManifest = finalSched.mergedFromTrucks.find(t => t.id === truckCarrier._id.toString());
        const inc1Manifest = finalSched.mergedFromTrucks.find(t => t.id === truckInc1._id.toString());
        const inc2Manifest = finalSched.mergedFromTrucks.find(t => t.id === truckInc2._id.toString());

        assert.ok(carrierManifest && carrierManifest.role === 'carrier');
        assert.ok(inc1Manifest && inc1Manifest.role === 'absorbed');
        assert.ok(inc2Manifest && inc2Manifest.role === 'absorbed');

        assert.deepEqual(inc1Manifest.stops, [K1, K2, K3]);
        assert.deepEqual(inc1Manifest.load, [900, 700, 600]);
        assert.deepEqual(inc2Manifest.stops, [K2, K3, K4]);
        assert.deepEqual(inc2Manifest.load, [500, 400, 300]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Test 10: Trader cargo matching using the updated capacity state
    // ─────────────────────────────────────────────────────────────────────────
    test('10. Trader cargo matching using the updated capacity state', async () => {
        const M1 = 'ValCity-M1', M2 = 'ValCity-M2', M3 = 'ValCity-M3';

        // Truck with 8000 kg capacity and heavy existing load
        const carrierTruck = await Truck.create({
            companyId: company._id,
            licensePlate: 'VAL-TRADER-TRK',
            totalCapacity: 8000,
            currentLoad: [1000, 7500, 1000], // M2 has only 500 kg remaining space!
            remainingLoad: [7000, 500, 7000],
        });
        await Route.create({
            companyId: company._id, truckId: carrierTruck._id,
            source: M1, destination: M3, stops: [M1, M2, M3],
        });

        // Trader Request 1: Needs 1000 kg between M1 and M3 (passes through bottleneck M2)
        // 7500 + 1000 = 8500 > 8000! Must NOT be matched
        const trOverload = await TraderRequest.create({
            traderId: traderUser._id,
            source: M1, destination: M3, stops: [M1, M2, M3],
            load: [1000, 1000, 1000],
        });

        // Trader Request 2: Small load of 200 kg between M1 and M3
        // 7500 + 200 = 7700 <= 8000! Fits!
        const trFit = await TraderRequest.create({
            traderId: traderUser._id,
            source: M1, destination: M3, stops: [M1, M2, M3],
            load: [200, 200, 200],
        });

        // Test GET /mergedTrader logic
        const FreeTruck = require('../src/models/freeTruck');
        const MergedSchedule = require('../src/models/mergedSchedule');

        const allFreeTrucks = await FreeTruck.find();
        const freeTruckIds = new Set(allFreeTrucks.map(ft => ft.truckId.toString()));
        const allRoutes = await Route.find();
        const allTrucks = await Truck.find();

        const truckMap = new Map();
        allTrucks.forEach(t => {
            const tid = t._id.toString();
            if (!freeTruckIds.has(tid)) {
                truckMap.set(tid, { truck: t, route: null });
            }
        });
        allRoutes.forEach(r => {
            const tid = r.truckId.toString();
            const e = truckMap.get(tid);
            if (e) e.route = r;
        });

        const availableTrucks = Array.from(truckMap.values()).map(e => ({
            truck: e.truck,
            stops: e.route ? e.route.stops : [],
            currentLoad: e.truck.currentLoad || [],
            totalCapacity: e.truck.totalCapacity,
        })).filter(e => e.stops && e.stops.length > 0);

        // Check Trader 1 (Overload)
        const matchOverload = availableTrucks.find(e => {
            if (e.truck._id.toString() !== carrierTruck._id.toString()) return false;
            for (let i = 0; i < trOverload.stops.length; i++) {
                const idx = e.stops.indexOf(trOverload.stops[i]);
                if (idx === -1) return false;
                if ((e.currentLoad[idx] || 0) + trOverload.load[i] > e.totalCapacity) return false;
            }
            return true;
        });
        assert.equal(matchOverload, undefined, 'Trader 1 must be rejected due to segment bottleneck at M2');

        // Check Trader 2 (Fit)
        const matchFit = availableTrucks.find(e => {
            if (e.truck._id.toString() !== carrierTruck._id.toString()) return false;
            for (let i = 0; i < trFit.stops.length; i++) {
                const idx = e.stops.indexOf(trFit.stops[i]);
                if (idx === -1) return false;
                if ((e.currentLoad[idx] || 0) + trFit.load[i] > e.totalCapacity) return false;
            }
            return true;
        });
        assert.ok(matchFit, 'Trader 2 must match carrier truck as it fits within remaining segment capacity');
    });
});
