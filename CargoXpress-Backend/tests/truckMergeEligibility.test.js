const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const TransportCompany = require('../src/models/transportCompany');
const MergeablePair = require('../src/models/mergeablePair');
const MergedSchedule = require('../src/models/mergedSchedule');
const FreeTruck = require('../src/models/freeTruck');
const mergeRouter = require('../src/routes/merge');

const { generateMergeablePairs, executeAcceptPair } = mergeRouter;

describe('Truck Merge Eligibility & Successive Merging Test Suite', () => {
    let testCompany;
    let truckA, truckB, truckC, truckD, truckE;
    let routeA, routeB, routeC, routeD, routeE;

    before(async () => {
        const uri = process.env.MONGODB_STRING;
        assert.ok(uri, 'MONGODB_STRING must be defined in environment');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }

        // Clean up previous test artifacts if any
        await cleanupTestData();

        // Create a test transport company
        testCompany = await TransportCompany.create({
            name: 'Eligibility Test Transport Ltd',
            emailId: 'test_company_eligibility@cargoxpress-test.com',
            password: 'TestPassword123!',
            registrationNumber: 'TEST-REG-ELIG-999',
            address: 'Mumbai, India',
        });

        // ── Truck A: Potential Carrier (Capacity: 8000 kg) ──
        truckA = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-A-8000',
            totalCapacity: 8000,
            currentLoad: [1000, 800, 600, 500, 400],
            remainingLoad: [7000, 7200, 7400, 7500, 7600],
        });
        routeA = await Route.create({
            companyId: testCompany._id,
            truckId: truckA._id,
            source: 'Mumbai',
            destination: 'Rajkot',
            stops: ['Mumbai', 'Surat', 'Vadodara', 'Ahmedabad', 'Rajkot'],
        });

        // ── Truck B: First Compatible Truck (Capacity: 5000 kg) ──
        truckB = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-B-5000',
            totalCapacity: 5000,
            currentLoad: [900, 700, 600],
            remainingLoad: [4100, 4300, 4400],
        });
        routeB = await Route.create({
            companyId: testCompany._id,
            truckId: truckB._id,
            source: 'Mumbai',
            destination: 'Vadodara',
            stops: ['Mumbai', 'Surat', 'Vadodara'],
        });

        // ── Truck C: Second Compatible Truck (Capacity: 4000 kg) ──
        truckC = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-C-4000',
            totalCapacity: 4000,
            currentLoad: [500, 400, 300],
            remainingLoad: [3500, 3600, 3700],
        });
        routeC = await Route.create({
            companyId: testCompany._id,
            truckId: truckC._id,
            source: 'Surat',
            destination: 'Ahmedabad',
            stops: ['Surat', 'Vadodara', 'Ahmedabad'],
        });

        // ── Truck D: Incompatible (Capacity Overload) ──
        truckD = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-D-OVERLOAD',
            totalCapacity: 7000,
            currentLoad: [6800, 6800, 6800], // Exceeds remaining capacity of Truck A
            remainingLoad: [200, 200, 200],
        });
        routeD = await Route.create({
            companyId: testCompany._id,
            truckId: truckD._id,
            source: 'Surat',
            destination: 'Ahmedabad',
            stops: ['Surat', 'Vadodara', 'Ahmedabad'],
        });

        // ── Truck E: Incompatible (Reverse Route / Directional Mismatch) ──
        truckE = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-E-REVERSED',
            totalCapacity: 3000,
            currentLoad: [400, 400],
            remainingLoad: [2600, 2600],
        });
        routeE = await Route.create({
            companyId: testCompany._id,
            truckId: truckE._id,
            source: 'Ahmedabad',
            destination: 'Surat', // Opposite direction from Truck A's corridor
            stops: ['Ahmedabad', 'Surat'],
        });
    });

    after(async () => {
        await cleanupTestData();
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    async function cleanupTestData() {
        const plates = [
            'TEST-TRK-A-8000',
            'TEST-TRK-B-5000',
            'TEST-TRK-C-4000',
            'TEST-TRK-D-OVERLOAD',
            'TEST-TRK-E-REVERSED',
        ];
        const trucks = await Truck.find({ licensePlate: { $in: plates } });
        const truckIds = trucks.map(t => t._id);
        const truckIdStrs = truckIds.map(id => id.toString());

        await MergeablePair.deleteMany({
            $or: [
                { truckOneId: { $in: truckIds } },
                { truckTwoId: { $in: truckIds } },
            ]
        });
        await MergedSchedule.deleteMany({
            $or: [
                { transportationTruckId: { $in: truckIdStrs } },
                { "mergedFromTrucks.id": { $in: truckIdStrs } }
            ]
        });
        await FreeTruck.deleteMany({ truckId: { $in: truckIdStrs } });
        await Route.deleteMany({ truckId: { $in: truckIds } });
        await Truck.deleteMany({ _id: { $in: truckIds } });
        await TransportCompany.deleteMany({ emailId: 'test_company_eligibility@cargoxpress-test.com' });
    }

    test('1. Fresh unmerged trucks generate candidate pair (Truck A, Truck B)', async () => {
        const candidates = await generateMergeablePairs();
        
        const pairAB = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-B-5000'
        );

        assert.ok(pairAB, 'Expected Pair (Truck A, Truck B) to be generated');
        assert.equal(pairAB.truckOneLicensePlate, 'TEST-TRK-A-8000', 'Truck A should be carrier (larger capacity)');
        assert.equal(pairAB.truckTwoLicensePlate, 'TEST-TRK-B-5000', 'Truck B should be absorbed');
    });

    test('2. First merge approval consolidates loads and marks Truck B as released in FreeTruck', async () => {
        const candidates = await generateMergeablePairs();
        const pairAB = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-B-5000'
        );
        assert.ok(pairAB, 'Pair AB must exist');

        const mergedSchedule = await executeAcceptPair(pairAB._id);
        assert.equal(mergedSchedule.status, 'accepted');
        assert.equal(mergedSchedule.transportationTruckId, truckA._id.toString());
        assert.equal(mergedSchedule.mergedFromTrucks.length, 2);

        // Check consolidated loads on Truck A:
        // Mumbai: 1000 + 900 = 1900
        // Surat: 800 + 700 = 1500
        // Vadodara: 600 + 600 = 1200
        // Ahmedabad: 500 + 0 = 500
        // Rajkot: 400 + 0 = 400
        assert.deepEqual(mergedSchedule.finalCurrentLoad, [1900, 1500, 1200, 500, 400]);
        assert.deepEqual(mergedSchedule.finalRemainingLoad, [6100, 6500, 6800, 7500, 7600]);

        // Check Truck B is in FreeTruck collection
        const freeTruckB = await FreeTruck.findOne({ truckId: truckB._id.toString() });
        assert.ok(freeTruckB, 'Truck B must be registered in FreeTruck collection');

        // Check carrier Truck document is updated in database
        const updatedTruckA = await Truck.findById(truckA._id);
        assert.deepEqual(updatedTruckA.currentLoad, [1900, 1500, 1200, 500, 400]);
        assert.deepEqual(updatedTruckA.remainingLoad, [6100, 6500, 6800, 7500, 7600]);
    });

    test('3. Released Truck B is NOT proposed as candidate or carrier', async () => {
        const candidates = await generateMergeablePairs();

        const anyPairWithB = candidates.filter(
            p => p.truckOneLicensePlate === 'TEST-TRK-B-5000' || p.truckTwoLicensePlate === 'TEST-TRK-B-5000'
        );

        assert.equal(anyPairWithB.length, 0, 'Released Truck B must never be proposed in any candidate pair');
    });

    test('4. Active carrier Truck A remains eligible and generates candidate with Truck C', async () => {
        const candidates = await generateMergeablePairs();

        const pairAC = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-C-4000'
        );

        assert.ok(pairAC, 'Active carrier Truck A MUST be proposed to absorb compatible Truck C');
        assert.equal(pairAC.truckOneLicensePlate, 'TEST-TRK-A-8000');
        assert.equal(pairAC.truckTwoLicensePlate, 'TEST-TRK-C-4000');
    });

    test('5. Ineligible trucks (Overload D and Reversed-Route E) remain excluded', async () => {
        const candidates = await generateMergeablePairs();

        const pairWithOverloadD = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-D-OVERLOAD' || p.truckTwoLicensePlate === 'TEST-TRK-D-OVERLOAD'
        );
        assert.equal(pairWithOverloadD, undefined, 'Capacity-incompatible Truck D must remain excluded');

        const pairWithReversedE = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-E-REVERSED' || p.truckTwoLicensePlate === 'TEST-TRK-E-REVERSED'
        );
        assert.equal(pairWithReversedE, undefined, 'Reversed-direction Truck E must remain excluded');
    });

    test('6. Second merge approval consolidates Truck C into Truck A without duplicate schedules', async () => {
        const candidates = await generateMergeablePairs();
        const pairAC = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-C-4000'
        );
        assert.ok(pairAC, 'Pair AC must exist');

        const updatedSchedule = await executeAcceptPair(pairAC._id);

        // Verify only ONE schedule exists for Truck A
        const allSchedsForA = await MergedSchedule.find({ transportationTruckId: truckA._id.toString() });
        assert.equal(allSchedsForA.length, 1, 'Truck A must have exactly one consolidated schedule, no duplicates');

        // Verify all 3 trucks are present in mergedFromTrucks
        assert.equal(updatedSchedule.mergedFromTrucks.length, 3);
        const mergedIds = updatedSchedule.mergedFromTrucks.map(t => t.id);
        assert.ok(mergedIds.includes(truckA._id.toString()), 'Must contain Truck A');
        assert.ok(mergedIds.includes(truckB._id.toString()), 'Must contain Truck B');
        assert.ok(mergedIds.includes(truckC._id.toString()), 'Must contain Truck C');

        // Check new 3-truck consolidated loads:
        // Mumbai: 1900 + 0 = 1900
        // Surat: 1500 + 500 = 2000
        // Vadodara: 1200 + 400 = 1600
        // Ahmedabad: 500 + 300 = 800
        // Rajkot: 400 + 0 = 400
        assert.deepEqual(updatedSchedule.finalCurrentLoad, [1900, 2000, 1600, 800, 400]);
        assert.deepEqual(updatedSchedule.finalRemainingLoad, [6100, 6000, 6400, 7200, 7600]);

        // Truck C must now be in FreeTruck
        const freeTruckC = await FreeTruck.findOne({ truckId: truckC._id.toString() });
        assert.ok(freeTruckC, 'Truck C must be registered in FreeTruck collection');

        // Neither Truck B nor Truck C can be proposed again
        const remainingCandidates = await generateMergeablePairs();
        const stalePairs = remainingCandidates.filter(
            p => p.truckTwoLicensePlate === 'TEST-TRK-B-5000' || p.truckTwoLicensePlate === 'TEST-TRK-C-4000'
        );
        assert.equal(stalePairs.length, 0, 'No absorbed trucks should appear in candidate pairs');
    });
});
