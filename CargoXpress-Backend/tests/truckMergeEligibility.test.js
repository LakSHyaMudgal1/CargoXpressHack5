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

    // Unique cities to isolate tests from seed data in shared database
    const C1 = 'TestCorridor-Alpha';
    const C2 = 'TestCorridor-Beta';
    const C3 = 'TestCorridor-Gamma';
    const C4 = 'TestCorridor-Delta';
    const C5 = 'TestCorridor-Epsilon';

    before(async () => {
        const uri = process.env.MONGODB_STRING;
        assert.ok(uri, 'MONGODB_STRING must be defined in environment');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }

        // Clean up previous test artifacts if any
        await cleanupTestData();

        // Create an isolated test transport company
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
            source: C1,
            destination: C5,
            stops: [C1, C2, C3, C4, C5],
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
            source: C1,
            destination: C3,
            stops: [C1, C2, C3],
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
            source: C2,
            destination: C4,
            stops: [C2, C3, C4],
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
            source: C2,
            destination: C4,
            stops: [C2, C3, C4],
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
            source: C4,
            destination: C2, // Opposite direction from Truck A's corridor
            stops: [C4, C2],
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
            'TEST-TRK-F-REJECTED',
        ];
        const trucks = await Truck.find({ licensePlate: { $in: plates } });
        const truckIds = trucks.map(t => t._id);
        const truckIdStrs = truckIds.map(id => id.toString());

        await MergeablePair.deleteMany({
            $or: [
                { truckOneId: { $in: truckIds } },
                { truckTwoId: { $in: truckIds } },
                { truckOneLicensePlate: { $in: plates } },
                { truckTwoLicensePlate: { $in: plates } },
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

    let savedPairABId;

    test('2. First merge approval consolidates loads and marks Truck B as released in FreeTruck', async () => {
        const candidates = await generateMergeablePairs();
        const pairAB = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-B-5000'
        );
        assert.ok(pairAB, 'Pair AB must exist');
        savedPairABId = pairAB._id;

        const mergedSchedule = await executeAcceptPair(pairAB._id);
        assert.equal(mergedSchedule.status, 'accepted');
        assert.equal(mergedSchedule.transportationTruckId, truckA._id.toString());
        assert.equal(mergedSchedule.mergedFromTrucks.length, 2);

        // Check consolidated loads on Truck A:
        // C1: 1000 + 900 = 1900
        // C2: 800 + 700 = 1500
        // C3: 600 + 600 = 1200
        // C4: 500 + 0 = 500
        // C5: 400 + 0 = 400
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

    test('3. Double-submit protection: executing accept on already processed pair throws 409', async () => {
        await assert.rejects(
            async () => {
                await executeAcceptPair(savedPairABId);
            },
            (err) => {
                assert.equal(err.statusCode, 409, 'Expected 409 Conflict on double submit');
                return true;
            }
        );
    });

    test('4. Released Truck B is NOT proposed as candidate or carrier', async () => {
        const candidates = await generateMergeablePairs();

        const anyPairWithB = candidates.filter(
            p => p.truckOneLicensePlate === 'TEST-TRK-B-5000' || p.truckTwoLicensePlate === 'TEST-TRK-B-5000'
        );

        assert.equal(anyPairWithB.length, 0, 'Released Truck B must never be proposed in any candidate pair');
    });

    test('5. Active carrier Truck A remains eligible and generates candidate with Truck C', async () => {
        const candidates = await generateMergeablePairs();

        const pairAC = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-C-4000'
        );

        assert.ok(pairAC, 'Active carrier Truck A MUST be proposed to absorb compatible Truck C');
        assert.equal(pairAC.truckOneLicensePlate, 'TEST-TRK-A-8000');
        assert.equal(pairAC.truckTwoLicensePlate, 'TEST-TRK-C-4000');
    });

    test('6. Ineligible trucks (Overload D and Reversed-Route E) remain excluded', async () => {
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

    test('7. Second merge approval consolidates Truck C into Truck A without duplicate schedules', async () => {
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
        // C1: 1900 + 0 = 1900
        // C2: 1500 + 500 = 2000
        // C3: 1200 + 400 = 1600
        // C4: 500 + 300 = 800
        // C5: 400 + 0 = 400
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

    test('8. Manifest retains detailed shipment metadata for carrier and all absorbed trucks', async () => {
        const schedule = await MergedSchedule.findOne({ transportationTruckId: truckA._id.toString() });
        assert.ok(schedule, 'Consolidated schedule must exist');

        // Check entry 0 (Carrier Truck A)
        const shipmentA = schedule.mergedFromTrucks.find(t => t.id === truckA._id.toString());
        assert.ok(shipmentA, 'Carrier shipment must exist');
        assert.equal(shipmentA.role, 'carrier');
        assert.equal(shipmentA.licensePlate, 'TEST-TRK-A-8000');
        assert.deepEqual(shipmentA.stops, [C1, C2, C3, C4, C5]);

        // Check entry 1 (Absorbed Truck B)
        const shipmentB = schedule.mergedFromTrucks.find(t => t.id === truckB._id.toString());
        assert.ok(shipmentB, 'Absorbed shipment B must exist');
        assert.equal(shipmentB.role, 'absorbed');
        assert.equal(shipmentB.licensePlate, 'TEST-TRK-B-5000');
        assert.deepEqual(shipmentB.stops, [C1, C2, C3]);
        assert.deepEqual(shipmentB.load, [900, 700, 600]);

        // Check entry 2 (Absorbed Truck C)
        const shipmentC = schedule.mergedFromTrucks.find(t => t.id === truckC._id.toString());
        assert.ok(shipmentC, 'Absorbed shipment C must exist');
        assert.equal(shipmentC.role, 'absorbed');
        assert.equal(shipmentC.licensePlate, 'TEST-TRK-C-4000');
        assert.deepEqual(shipmentC.stops, [C2, C3, C4]);
        assert.deepEqual(shipmentC.load, [500, 400, 300]);
    });

    test('9. Execution revalidation: rejecting a pair with an active carrier preserves carrier schedule', async () => {
        // Create an unmerged Truck F
        const truckF = await Truck.create({
            companyId: testCompany._id,
            licensePlate: 'TEST-TRK-F-REJECTED',
            totalCapacity: 3000,
            currentLoad: [300, 300],
            remainingLoad: [2700, 2700],
        });
        await Route.create({
            companyId: testCompany._id,
            truckId: truckF._id,
            source: C3,
            destination: C4,
            stops: [C3, C4],
        });

        // Generate candidate pair between Truck A and Truck F
        const candidates = await generateMergeablePairs();
        const pairAF = candidates.find(
            p => p.truckOneLicensePlate === 'TEST-TRK-A-8000' && p.truckTwoLicensePlate === 'TEST-TRK-F-REJECTED'
        );
        assert.ok(pairAF, 'Expected Pair (Truck A, Truck F) to be generated');

        // Simulate admin rejection via DELETE route logic
        const makeIndependentSchedule = async (truck, stops) => {
            const hasAccepted = await MergedSchedule.findOne({
                transportationTruckId: truck._id.toString(),
                status: 'accepted'
            });
            if (hasAccepted) return; // Must preserve active accepted schedule!

            await MergedSchedule.create({
                transportationTruckId: truck._id.toString(),
                transportationTruckLicensePlate: truck.licensePlate,
                mergedFromTrucks: [],
                finalSource: stops[0],
                finalDestination: stops[stops.length - 1],
                stops,
                finalCurrentLoad: truck.currentLoad,
                finalRemainingLoad: truck.remainingLoad,
                totalCapacity: truck.totalCapacity,
                status: 'rejected',
            });
        };

        await makeIndependentSchedule(truckA, pairAF.truckOneStops);
        await makeIndependentSchedule(truckF, pairAF.truckTwoStops);
        await MergeablePair.findByIdAndDelete(pairAF._id);

        // Verify Truck A still has its ACCEPTED schedule with 3 trucks, not replaced with rejected!
        const schedA = await MergedSchedule.findOne({ transportationTruckId: truckA._id.toString() });
        assert.equal(schedA.status, 'accepted');
        assert.equal(schedA.mergedFromTrucks.length, 3);

        // Verify Truck F received an independent dispatch schedule with status rejected
        const schedF = await MergedSchedule.findOne({ transportationTruckId: truckF._id.toString() });
        assert.ok(schedF, 'Truck F must have its independent dispatch schedule');
        assert.equal(schedF.status, 'rejected');
    });
});
