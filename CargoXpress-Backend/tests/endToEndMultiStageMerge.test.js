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

const mergeRouter = require('../src/routes/merge');
const {
    generateMergeablePairs,
    executeAcceptPair,
    buildMergedData,
    evaluateRouteCompatibility,
    evaluateSegmentCapacity,
} = mergeRouter;

describe('End-to-End Multi-Stage Truck Merging Verification', () => {
    const URI = process.env.MONGODB_URI || process.env.MONGODB_STRING;

    // Distinct stop names for deterministic corridor testing
    const STOP_MUMBAI = 'E2E-Mumbai';
    const STOP_SURAT = 'E2E-Surat';
    const STOP_VADODARA = 'E2E-Vadodara';
    const STOP_AHMEDABAD = 'E2E-Ahmedabad';
    const STOP_RAJKOT = 'E2E-Rajkot';

    let companyA;
    let companyB;
    let companyC;

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(URI);
        }

        // Clean previous test data
        await Promise.all([
            Truck.deleteMany({ licensePlate: /^E2E-/ }),
            Route.deleteMany({ source: /^E2E-/ }),
            FreeTruck.deleteMany({ licensePlate: /^E2E-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^E2E-/ }),
            MergeablePair.deleteMany({
                $or: [
                    { truckOneLicensePlate: /^E2E-/ },
                    { truckTwoLicensePlate: /^E2E-/ },
                ]
            }),
            TransportCompany.deleteMany({ emailId: /^e2e_comp_/ }),
        ]);

        companyA = await TransportCompany.create({
            name: 'E2E FastLogistics',
            emailId: 'e2e_comp_a@cargoxpress.com',
            password: 'Password123!',
            registrationNumber: 'E2E-REG-A',
            address: 'Mumbai, India',
        });

        companyB = await TransportCompany.create({
            name: 'E2E NorthernCarrier',
            emailId: 'e2e_comp_b@cargoxpress.com',
            password: 'Password123!',
            registrationNumber: 'E2E-REG-B',
            address: 'Surat, India',
        });

        companyC = await TransportCompany.create({
            name: 'E2E WesternFreight',
            emailId: 'e2e_comp_c@cargoxpress.com',
            password: 'Password123!',
            registrationNumber: 'E2E-REG-C',
            address: 'Ahmedabad, India',
        });
    });

    after(async () => {
        await Promise.all([
            Truck.deleteMany({ licensePlate: /^E2E-/ }),
            Route.deleteMany({ source: /^E2E-/ }),
            FreeTruck.deleteMany({ licensePlate: /^E2E-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^E2E-/ }),
            MergeablePair.deleteMany({
                $or: [
                    { truckOneLicensePlate: /^E2E-/ },
                    { truckTwoLicensePlate: /^E2E-/ },
                ]
            }),
            TransportCompany.deleteMany({ emailId: /^e2e_comp_/ }),
        ]);
        await mongoose.connection.close();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1 & 2: Full Consecutive Workflow (Truck A + Truck B, then Truck A + Truck C)
    // ─────────────────────────────────────────────────────────────────────────
    test('1. Deterministic Multi-Stage Workflow: Truck A absorbs B, then absorbs C', async () => {
        // 1. Create Fixture Records
        // Truck A: Long corridor Mumbai -> Surat -> Vadodara -> Ahmedabad -> Rajkot, capacity 10000
        const truckA = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'E2E-TRK-A-10000',
            totalCapacity: 10000,
            currentLoad: [2000, 1600, 1200, 1000, 800],
            remainingLoad: [8000, 8400, 8800, 9000, 9200],
        });
        await Route.create({
            companyId: companyA._id,
            truckId: truckA._id,
            source: STOP_MUMBAI,
            destination: STOP_RAJKOT,
            stops: [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA, STOP_AHMEDABAD, STOP_RAJKOT],
        });

        // Truck B: Short route Mumbai -> Surat -> Vadodara, capacity 5000
        const truckB = await Truck.create({
            companyId: companyB._id,
            licensePlate: 'E2E-TRK-B-5000',
            totalCapacity: 5000,
            currentLoad: [1500, 1200, 1000],
            remainingLoad: [3500, 3800, 4000],
        });
        await Route.create({
            companyId: companyB._id,
            truckId: truckB._id,
            source: STOP_MUMBAI,
            destination: STOP_VADODARA,
            stops: [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA],
        });

        // Truck C: Complementary route Surat -> Vadodara -> Ahmedabad, capacity 4000
        const truckC = await Truck.create({
            companyId: companyC._id,
            licensePlate: 'E2E-TRK-C-4000',
            totalCapacity: 4000,
            currentLoad: [800, 700, 600],
            remainingLoad: [3200, 3300, 3400],
        });
        await Route.create({
            companyId: companyC._id,
            truckId: truckC._id,
            source: STOP_SURAT,
            destination: STOP_AHMEDABAD,
            stops: [STOP_SURAT, STOP_VADODARA, STOP_AHMEDABAD],
        });

        // 2. Candidate Generation (Stage 1)
        const candidatesStage1 = await generateMergeablePairs();
        const pairAB = candidatesStage1.find(
            p => p.truckOneLicensePlate === 'E2E-TRK-A-10000' && p.truckTwoLicensePlate === 'E2E-TRK-B-5000'
        );
        assert.ok(pairAB, 'Optimizer must generate candidate pair for Truck A and Truck B');

        // 3. Approve Merge 1 (Truck A absorbs Truck B)
        const schedMerge1 = await executeAcceptPair(pairAB._id);
        assert.equal(schedMerge1.status, 'accepted');
        assert.equal(schedMerge1.transportationTruckId, truckA._id.toString());
        assert.equal(schedMerge1.transportationTruckLicensePlate, 'E2E-TRK-A-10000');
        assert.equal(schedMerge1.mergedFromTrucks.length, 2, 'Manifest must contain Carrier A and Absorbed B');

        // Verify stage 1 consolidated loads:
        // Mumbai:   2000 + 1500 = 3500 <= 10000
        // Surat:    1600 + 1200 = 2800 <= 10000
        // Vadodara: 1200 + 1000 = 2200 <= 10000
        // Ahmedabad: 1000 + 0 = 1000 <= 10000 (B delivered at Vadodara)
        // Rajkot:    800 + 0 = 800 <= 10000
        assert.deepEqual(schedMerge1.finalCurrentLoad, [3500, 2800, 2200, 1000, 800]);
        assert.deepEqual(schedMerge1.finalRemainingLoad, [6500, 7200, 7800, 9000, 9200]);

        // Verify Truck B is registered as FreeTruck
        const freeB = await FreeTruck.findOne({ truckId: truckB._id.toString() });
        assert.ok(freeB, 'Truck B must be registered in FreeTruck collection');

        // 4. Candidate Generation (Stage 2)
        const candidatesStage2 = await generateMergeablePairs();

        // Verify Truck B is NOT proposed again
        const bProposed = candidatesStage2.some(
            p => p.truckOneLicensePlate === 'E2E-TRK-B-5000' || p.truckTwoLicensePlate === 'E2E-TRK-B-5000'
        );
        assert.equal(bProposed, false, 'Released Truck B must NOT be proposed in any candidate pair');

        // Verify Truck A remains eligible and candidate (Truck A, Truck C) appears
        const pairAC = candidatesStage2.find(
            p => p.truckOneLicensePlate === 'E2E-TRK-A-10000' && p.truckTwoLicensePlate === 'E2E-TRK-C-4000'
        );
        assert.ok(pairAC, 'Active carrier Truck A must generate a candidate pair with Truck C');

        // 5. Approve Merge 2 (Truck A absorbs Truck C)
        const schedMerge2 = await executeAcceptPair(pairAC._id);

        // 6. Verify Schedule Preservation & Manifest Retention
        assert.equal(schedMerge2._id.toString(), schedMerge1._id.toString(), 'Must update existing consolidated schedule, not create a duplicate');

        const allSchedsForA = await MergedSchedule.find({ transportationTruckId: truckA._id.toString() });
        assert.equal(allSchedsForA.length, 1, 'Exactly one consolidated schedule must exist for Truck A');

        // Verify all three trucks are in manifest
        assert.equal(schedMerge2.mergedFromTrucks.length, 3, 'Manifest must contain A, B, and C');
        const manifestA = schedMerge2.mergedFromTrucks.find(t => t.id === truckA._id.toString());
        const manifestB = schedMerge2.mergedFromTrucks.find(t => t.id === truckB._id.toString());
        const manifestC = schedMerge2.mergedFromTrucks.find(t => t.id === truckC._id.toString());

        assert.ok(manifestA && manifestA.role === 'carrier');
        assert.ok(manifestB && manifestB.role === 'absorbed');
        assert.ok(manifestC && manifestC.role === 'absorbed');

        assert.deepEqual(manifestB.stops, [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA]);
        assert.deepEqual(manifestB.load, [1500, 1200, 1000]);
        assert.deepEqual(manifestC.stops, [STOP_SURAT, STOP_VADODARA, STOP_AHMEDABAD]);
        assert.deepEqual(manifestC.load, [800, 700, 600]);

        // Verify 3-truck consolidated loads:
        // Mumbai:   3500 + 0 = 3500
        // Surat:    2800 + 800 = 3600
        // Vadodara: 2200 + 700 = 2900
        // Ahmedabad: 1000 + 600 = 1600
        // Rajkot:    800 + 0 = 800
        assert.deepEqual(schedMerge2.finalCurrentLoad, [3500, 3600, 2900, 1600, 800]);
        assert.deepEqual(schedMerge2.finalRemainingLoad, [6500, 6400, 7100, 8400, 9200]);

        // Verify both B and C are in FreeTruck
        const freeC = await FreeTruck.findOne({ truckId: truckC._id.toString() });
        assert.ok(freeC, 'Truck C must be registered in FreeTruck collection');

        // Verify carrier Truck record in DB is synchronized
        const updatedTruckA = await Truck.findById(truckA._id);
        assert.deepEqual(updatedTruckA.currentLoad, [3500, 3600, 2900, 1600, 800]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 3: Negative & Concurrency Scenarios
    // ─────────────────────────────────────────────────────────────────────────
    test('2. Negative: Candidate exceeding segment capacity is rejected', async () => {
        // Truck Overload has 7000 kg load on Vadodara -> Ahmedabad segment
        const truckOverload = await Truck.create({
            companyId: companyB._id,
            licensePlate: 'E2E-TRK-OVERLOAD',
            totalCapacity: 8000,
            currentLoad: [7000, 7000],
            remainingLoad: [1000, 1000],
        });
        await Route.create({
            companyId: companyB._id,
            truckId: truckOverload._id,
            source: STOP_VADODARA,
            destination: STOP_AHMEDABAD,
            stops: [STOP_VADODARA, STOP_AHMEDABAD],
        });

        // Truck A currently has 2900 kg at Vadodara. 2900 + 7000 = 9900 <= 10000.
        // But what if Overload has 8000 kg? 2900 + 8000 = 10900 > 10000!
        const carrierTruck = await Truck.findOne({ licensePlate: 'E2E-TRK-A-10000' });
        const carrierSched = await MergedSchedule.findOne({ transportationTruckId: carrierTruck._id.toString() });

        const capCheck = evaluateSegmentCapacity(
            carrierSched.stops,
            carrierSched.finalCurrentLoad,
            carrierSched.totalCapacity,
            [STOP_VADODARA, STOP_AHMEDABAD],
            [8000, 8000],
            carrierSched.stops
        );
        assert.equal(capCheck.feasible, false, 'Segment capacity overflow must be detected and rejected');
        assert.match(capCheck.reason, /Capacity exceeded/i);
    });

    test('3. Negative: Incompatible stop order / reversed route is rejected', async () => {
        const carrierStops = [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA, STOP_AHMEDABAD, STOP_RAJKOT];
        const reversedStops = [STOP_AHMEDABAD, STOP_SURAT]; // Reversed!

        const routeCheck = evaluateRouteCompatibility(carrierStops, reversedStops);
        assert.equal(routeCheck.compatible, false, 'Reversed stops must be rejected');
        assert.match(routeCheck.reason, /Stop sequence violates delivery constraints/i);
    });

    test('4. Concurrency: Double submit / replay on accepted pair throws 409', async () => {
        // Create a disposable pair
        const truckD1 = await Truck.create({
            companyId: companyA._id, licensePlate: 'E2E-DISP-1', totalCapacity: 6000,
            currentLoad: [1000, 800], remainingLoad: [5000, 5200]
        });
        await Route.create({
            companyId: companyA._id, truckId: truckD1._id, source: STOP_MUMBAI, destination: STOP_SURAT,
            stops: [STOP_MUMBAI, STOP_SURAT]
        });

        const truckD2 = await Truck.create({
            companyId: companyB._id, licensePlate: 'E2E-DISP-2', totalCapacity: 3000,
            currentLoad: [500, 400], remainingLoad: [2500, 2600]
        });
        await Route.create({
            companyId: companyB._id, truckId: truckD2._id, source: STOP_MUMBAI, destination: STOP_SURAT,
            stops: [STOP_MUMBAI, STOP_SURAT]
        });

        const pair = await MergeablePair.create({
            truckOneId: truckD1._id,
            truckOneLicensePlate: truckD1.licensePlate,
            truckOneStops: [STOP_MUMBAI, STOP_SURAT],
            truckTwoId: truckD2._id,
            truckTwoLicensePlate: truckD2.licensePlate,
            truckTwoStops: [STOP_MUMBAI, STOP_SURAT],
        });

        // First accept succeeds
        const firstAccept = await executeAcceptPair(pair._id);
        assert.ok(firstAccept);

        // Second accept immediately throws 409 Conflict
        await assert.rejects(
            async () => { await executeAcceptPair(pair._id); },
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.match(err.message, /already been processed/i);
                return true;
            }
        );
    });

    test('5. Concurrency: Concurrent approval calls on the same pair are atomic', async () => {
        const truckE1 = await Truck.create({
            companyId: companyA._id, licensePlate: 'E2E-CONC-1', totalCapacity: 6000,
            currentLoad: [1000, 800], remainingLoad: [5000, 5200]
        });
        await Route.create({
            companyId: companyA._id, truckId: truckE1._id, source: STOP_MUMBAI, destination: STOP_SURAT,
            stops: [STOP_MUMBAI, STOP_SURAT]
        });

        const truckE2 = await Truck.create({
            companyId: companyB._id, licensePlate: 'E2E-CONC-2', totalCapacity: 3000,
            currentLoad: [500, 400], remainingLoad: [2500, 2600]
        });
        await Route.create({
            companyId: companyB._id, truckId: truckE2._id, source: STOP_MUMBAI, destination: STOP_SURAT,
            stops: [STOP_MUMBAI, STOP_SURAT]
        });

        const pair = await MergeablePair.create({
            truckOneId: truckE1._id,
            truckOneLicensePlate: truckE1.licensePlate,
            truckOneStops: [STOP_MUMBAI, STOP_SURAT],
            truckTwoId: truckE2._id,
            truckTwoLicensePlate: truckE2.licensePlate,
            truckTwoStops: [STOP_MUMBAI, STOP_SURAT],
        });

        // Run two concurrent accept requests
        const results = await Promise.allSettled([
            executeAcceptPair(pair._id),
            executeAcceptPair(pair._id),
        ]);

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        assert.equal(fulfilled.length, 1, 'Exactly one concurrent accept must succeed');
        assert.equal(rejected.length, 1, 'The competing accept must be rejected with 409');
        assert.equal(rejected[0].reason.statusCode, 409);
    });

    test('6. Stale Candidate Guard: Released truck cannot be absorbed again', async () => {
        // Truck B was already freed in Test 1
        const freeTruckB = await Truck.findOne({ licensePlate: 'E2E-TRK-B-5000' });
        const carrierTruck = await Truck.findOne({ licensePlate: 'E2E-TRK-A-10000' });

        // Fabricate a stale pair in DB containing freed Truck B
        const stalePair = await MergeablePair.create({
            truckOneId: carrierTruck._id,
            truckOneLicensePlate: carrierTruck.licensePlate,
            truckOneStops: [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA],
            truckTwoId: freeTruckB._id,
            truckTwoLicensePlate: freeTruckB.licensePlate,
            truckTwoStops: [STOP_MUMBAI, STOP_SURAT, STOP_VADODARA],
        });

        // Attempting to accept stale pair must be blocked by FreeTruck guard
        await assert.rejects(
            async () => { await executeAcceptPair(stalePair._id); },
            (err) => {
                assert.match(err.message, /already been released as Free Trucks/i);
                return true;
            }
        );
    });
});
