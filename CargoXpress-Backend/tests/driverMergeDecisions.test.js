const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const Driver = require('../src/models/driver');
const DriverAssignment = require('../src/models/driverAssignment');
const TransportCompany = require('../src/models/transportCompany');
const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const MergedSchedule = require('../src/models/mergedSchedule');
const MergeablePair = require('../src/models/mergeablePair');
const FreeTruck = require('../src/models/freeTruck');
const Admin = require('../src/models/admin');
const MergeDecisionLog = require('../src/models/mergeDecisionLog');
const bcrypt = require('bcrypt');

describe('Driver Merge Offers and Autonomous Decisions Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser;
    let truckA, truckB, truckC;
    let routeA, routeB, routeC;
    let driverA, driverB, driverC, driverUnassigned;
    let driverAToken, driverBToken, driverCToken, driverUnassignedToken, adminToken;

    const cleanupTestData = async (cleanAdmin = false) => {
        const cleanupOps = [
            Driver.deleteMany({ emailId: /^test_md_drv_/ }),
            DriverAssignment.deleteMany({ notes: /TEST-MD/ }),
            TransportCompany.deleteMany({ emailId: /^test_md_comp_/ }),
            Truck.deleteMany({ licensePlate: /^TEST-MD-TRK-/ }),
            Route.deleteMany({ source: /^MD-City/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-MD-TRK-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-MD-TRK-/ }),
            FreeTruck.deleteMany({ licensePlate: /^TEST-MD-TRK-/ }),
            MergeDecisionLog.deleteMany({ carrierLicensePlate: /^TEST-MD-TRK-/ })
        ];
        if (cleanAdmin) {
            cleanupOps.push(Admin.deleteMany({ emailId: /^test_md_admin/ }));
        }
        await Promise.all(cleanupOps);
    };

    const apiFetch = async (url, options = {}) => {
        const headers = { 'Connection': 'close', ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (_) {}
        return {
            status: res.status,
            headers: res.headers,
            text: async () => text,
            json: async () => parsed,
            data: parsed
        };
    };

    before(async () => {
        assert.ok(URI, 'MONGODB_STRING must be defined in environment');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(URI);
        }

        await cleanupTestData();

        // Start server on an ephemeral port
        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        const hashedPassword = await bcrypt.hash('Secret123!', 10);

        companyA = await TransportCompany.create({
            name: 'Speedy Logistics India',
            emailId: 'test_md_comp_a@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-MD-REG-A',
            address: 'Mumbai, MH'
        });

        companyB = await TransportCompany.create({
            name: 'Interstate Freight Corp',
            emailId: 'test_md_comp_b@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-MD-REG-B',
            address: 'Surat, GJ'
        });

        adminUser = await Admin.create({
            name: 'Central Dispatch Admin',
            emailId: 'test_md_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '888877776666',
            address: 'New Delhi, DL'
        });

        adminToken = await adminUser.getJWT();
    });

    after(async () => {
        await cleanupTestData(true);
        if (server) {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise(resolve => server.close(resolve));
        }
    });

    // Helper to seed fresh trucks, routes, and drivers before relevant tests
    const setupFreshFleet = async () => {
        await cleanupTestData();

        // Truck A: Carrier (10000kg) on MD-City-Mumbai -> MD-City-Surat -> MD-City-Vadodara -> MD-City-Ahmedabad
        truckA = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-MD-TRK-A',
            totalCapacity: 10000,
            currentLoad: [3000, 2500, 2000, 0],
            remainingLoad: [7000, 7500, 8000, 10000]
        });

        routeA = await Route.create({
            companyId: companyA._id,
            truckId: truckA._id,
            source: 'MD-City-Mumbai',
            destination: 'MD-City-Ahmedabad',
            stops: ['MD-City-Mumbai', 'MD-City-Surat', 'MD-City-Vadodara', 'MD-City-Ahmedabad']
        });

        // Truck B: Smaller truck to be absorbed (4000kg) on MD-City-Mumbai -> MD-City-Surat -> MD-City-Vadodara
        truckB = await Truck.create({
            companyId: companyB._id,
            licensePlate: 'TEST-MD-TRK-B',
            totalCapacity: 4000,
            currentLoad: [1500, 1000, 0],
            remainingLoad: [2500, 3000, 4000]
        });

        routeB = await Route.create({
            companyId: companyB._id,
            truckId: truckB._id,
            source: 'MD-City-Mumbai',
            destination: 'MD-City-Vadodara',
            stops: ['MD-City-Mumbai', 'MD-City-Surat', 'MD-City-Vadodara']
        });

        // Truck C: Third unrelated truck on different route
        truckC = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-MD-TRK-C',
            totalCapacity: 6000,
            currentLoad: [1000, 0],
            remainingLoad: [5000, 6000]
        });

        routeC = await Route.create({
            companyId: companyA._id,
            truckId: truckC._id,
            source: 'MD-City-Pune',
            destination: 'MD-City-Nashik',
            stops: ['MD-City-Pune', 'MD-City-Nashik']
        });

        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        driverA = await Driver.create({
            name: 'Ramesh Carrier Driver',
            emailId: 'test_md_drv_a@cargoxpress.com',
            password: hashedPassword,
            phone: '+919811111111',
            licenseNumber: 'TEST-MD-DL-A',
            companyId: companyA._id,
            status: 'active'
        });

        driverB = await Driver.create({
            name: 'Suresh Absorbed Driver',
            emailId: 'test_md_drv_b@cargoxpress.com',
            password: hashedPassword,
            phone: '+919822222222',
            licenseNumber: 'TEST-MD-DL-B',
            companyId: companyB._id,
            status: 'active'
        });

        driverC = await Driver.create({
            name: 'Vikram Unrelated Driver',
            emailId: 'test_md_drv_c@cargoxpress.com',
            password: hashedPassword,
            phone: '+919833333333',
            licenseNumber: 'TEST-MD-DL-C',
            companyId: companyA._id,
            status: 'active'
        });

        driverUnassigned = await Driver.create({
            name: 'Deepak Standby Driver',
            emailId: 'test_md_drv_unassigned@cargoxpress.com',
            password: hashedPassword,
            phone: '+919844444444',
            licenseNumber: 'TEST-MD-DL-D',
            companyId: companyA._id,
            status: 'active'
        });

        // Assign Driver A to Truck A
        await DriverAssignment.create({
            driverId: driverA._id,
            truckId: truckA._id,
            companyId: companyA._id,
            status: 'active',
            assignedByRole: 'admin',
            notes: 'TEST-MD Assignment A'
        });

        // Assign Driver B to Truck B
        await DriverAssignment.create({
            driverId: driverB._id,
            truckId: truckB._id,
            companyId: companyB._id,
            status: 'active',
            assignedByRole: 'admin',
            notes: 'TEST-MD Assignment B'
        });

        // Assign Driver C to Truck C
        await DriverAssignment.create({
            driverId: driverC._id,
            truckId: truckC._id,
            companyId: companyA._id,
            status: 'active',
            assignedByRole: 'admin',
            notes: 'TEST-MD Assignment C'
        });

        driverAToken = await driverA.getJWT();
        driverBToken = await driverB.getJWT();
        driverCToken = await driverC.getJWT();
        driverUnassignedToken = await driverUnassigned.getJWT();
    };

    // Helper to create a pending merge pair between Truck A and Truck B
    const createPendingPair = async () => {
        return await MergeablePair.create({
            truckOneId: truckA._id,
            truckOneLicensePlate: truckA.licensePlate,
            truckOneStops: routeA.stops,
            truckTwoId: truckB._id,
            truckTwoLicensePlate: truckB.licensePlate,
            truckTwoStops: routeB.stops
        });
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: GET /driver/merge-offers — Evaluates Carrier vs Absorbed Driver Roles
    // ─────────────────────────────────────────────────────────────────────────────
    test('1. GET /driver/merge-offers returns rich route proposal and marks carrier driver as authorized', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // 1a. Carrier Driver A requests merge offers
        const resA = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        assert.equal(resA.status, 200);
        assert.ok(resA.data.offers && resA.data.offers.length > 0);
        const offerA = resA.data.offers.find(o => o.pairId === pair._id.toString());
        assert.ok(offerA, 'Offer must be present for Driver A');
        assert.equal(offerA.isCarrier, true, 'Driver A truck has higher capacity and must be designated carrier');
        assert.equal(offerA.canAccept, true, 'Carrier driver must have canAccept = true');
        assert.ok(offerA.proposedRoute, 'Must contain proposed consolidated route details');
        assert.ok(offerA.incomingShipment, 'Must contain incoming shipment details');
        assert.ok(offerA.proposedRoute.consolidatedStops.length >= routeA.stops.length);

        // 1b. Absorbed Driver B requests merge offers
        const resB = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { 'Cookie': `token=${driverBToken}` }
        });

        assert.equal(resB.status, 200);
        const offerB = resB.data.offers.find(o => o.pairId === pair._id.toString());
        assert.ok(offerB, 'Offer must be present for Driver B');
        assert.equal(offerB.isCarrier, false, 'Driver B truck is smaller and must be marked absorbed');
        assert.equal(offerB.canAccept, false, 'Absorbed driver must have canAccept = false');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Accepting a Valid Offer by Authorized Carrier Driver
    // ─────────────────────────────────────────────────────────────────────────────
    test('2. Carrier driver accepts a valid merge offer: updates MergedSchedule, frees absorbed truck, and logs decision', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        const acceptRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        assert.equal(acceptRes.status, 200);
        assert.ok(acceptRes.data.mergedSchedule, 'Response must include updated mergedSchedule');
        assert.equal(acceptRes.data.mergedSchedule.status, undefined); // subdocument fields or values
        assert.deepEqual(acceptRes.data.mergedSchedule.stops, routeA.stops);

        // Verify MergedSchedule is saved in MongoDB with status: 'accepted'
        const savedSchedule = await MergedSchedule.findOne({
            transportationTruckId: truckA._id.toString(),
            status: 'accepted'
        });
        assert.ok(savedSchedule, 'MergedSchedule must be saved with status accepted');
        assert.equal(savedSchedule.transportationTruckLicensePlate, 'TEST-MD-TRK-A');

        // Verify pair is consumed/removed from MergeablePair
        const pairAfter = await MergeablePair.findById(pair._id);
        assert.equal(pairAfter, null, 'MergeablePair must be removed upon acceptance');

        // Verify absorbed truck is added to FreeTruck
        const freeTruckEntry = await FreeTruck.findOne({ truckId: truckB._id.toString() });
        assert.ok(freeTruckEntry, 'Absorbed truck must be registered in FreeTruck collection');

        // Verify MergeDecisionLog was recorded
        const decisionLog = await MergeDecisionLog.findOne({
            pairId: pair._id.toString(),
            decision: 'accepted'
        });
        assert.ok(decisionLog, 'Decision log must be persisted in database');
        assert.equal(decisionLog.decidedByRole, 'driver');
        assert.equal(decisionLog.driverName, 'Ramesh Carrier Driver');
        assert.equal(decisionLog.carrierLicensePlate, 'TEST-MD-TRK-A');
        assert.equal(decisionLog.absorbedLicensePlate, 'TEST-MD-TRK-B');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Absorbed Driver Assignment Transition
    // ─────────────────────────────────────────────────────────────────────────────
    test('3. Absorbed truck driver assignment is cleanly transitioned to completed to prevent conflicting active states', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // Prior to merge: Driver B has an active assignment on truck B
        const preAssignment = await DriverAssignment.getActiveForDriver(driverB._id);
        assert.ok(preAssignment, 'Driver B must start with active assignment');
        assert.equal(preAssignment.truckId._id.toString(), truckB._id.toString());

        // Carrier driver accepts
        const acceptRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });
        assert.equal(acceptRes.status, 200);

        // Post merge: Driver B assignment must now be completed
        const postAssignment = await DriverAssignment.getActiveForDriver(driverB._id);
        assert.equal(postAssignment, null, 'Driver B must no longer have any active assignment');

        const completedAssignment = await DriverAssignment.findOne({
            driverId: driverB._id,
            truckId: truckB._id
        });
        assert.equal(completedAssignment.status, 'completed');
        assert.ok(completedAssignment.endedAt, 'endedAt timestamp must be recorded');
        assert.ok(completedAssignment.notes.includes('absorbed into carrier truck'));
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Rejecting an Offer with an Explicit Reason
    // ─────────────────────────────────────────────────────────────────────────────
    test('4. Driver rejects an offer with reason: persists reason in log and dispatches independent schedules', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        const rejectRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/reject`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: 'Capacity headroom tight',
                notes: 'Bypass bridge under maintenance near Vadodara'
            })
        });

        assert.equal(rejectRes.status, 200);
        assert.equal(rejectRes.data.reason, 'Capacity headroom tight');

        // Pair must be deleted
        const pairAfter = await MergeablePair.findById(pair._id);
        assert.equal(pairAfter, null, 'Pair must be removed upon rejection');

        // Independent rejected schedules must be created for both trucks
        const rejectedSchedA = await MergedSchedule.findOne({
            transportationTruckId: truckA._id.toString(),
            status: 'rejected'
        });
        const rejectedSchedB = await MergedSchedule.findOne({
            transportationTruckId: truckB._id.toString(),
            status: 'rejected'
        });
        assert.ok(rejectedSchedA, 'Truck A must have independent rejected schedule');
        assert.ok(rejectedSchedB, 'Truck B must have independent rejected schedule');

        // Decision log must record the rejection and reason
        const decisionLog = await MergeDecisionLog.findOne({
            pairId: pair._id.toString(),
            decision: 'rejected'
        });
        assert.ok(decisionLog, 'Rejection must be logged in MergeDecisionLog');
        assert.equal(decisionLog.reason, 'Capacity headroom tight');
        assert.equal(decisionLog.notes, 'Bypass bridge under maintenance near Vadodara');
        assert.equal(decisionLog.driverName, 'Ramesh Carrier Driver');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Unauthorized Driver Decision Policies
    // ─────────────────────────────────────────────────────────────────────────────
    test('5. Unauthorized driver decisions are rejected with HTTP 403', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // 5a. Absorbed Driver B attempts to accept -> HTTP 403 (Only carrier driver can accept)
        const resAbsorbedAccept = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverBToken}` }
        });
        assert.equal(resAbsorbedAccept.status, 403);
        assert.ok(resAbsorbedAccept.data.message.includes('Only the carrier vehicle driver'));

        // 5b. Unrelated Driver C (assigned to Truck C) attempts to accept -> HTTP 403
        const resUnrelatedAccept = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverCToken}` }
        });
        assert.equal(resUnrelatedAccept.status, 403);
        assert.ok(resUnrelatedAccept.data.message.includes('You are not assigned to either vehicle'));

        // 5c. Unassigned Driver attempts to accept -> HTTP 403
        const resUnassignedAccept = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverUnassignedToken}` }
        });
        assert.equal(resUnassignedAccept.status, 403);
        assert.ok(resUnassignedAccept.data.message.includes('no active vehicle assignment'));

        // 5d. Unrelated Driver C attempts to reject -> HTTP 403
        const resUnrelatedReject = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/reject`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverCToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: 'Not interested' })
        });
        assert.equal(resUnrelatedReject.status, 403);

        // Verify offer is still untouched
        const pairAfter = await MergeablePair.findById(pair._id);
        assert.ok(pairAfter, 'Pair must remain pending after unauthorized attempts');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Duplicate Decisions and Stale Offers
    // ─────────────────────────────────────────────────────────────────────────────
    test('6. Duplicate decisions and stale offer requests are rejected with HTTP 409', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // First accept succeeds
        const firstAccept = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });
        assert.equal(firstAccept.status, 200);

        // Second accept on the same pair -> 409 Conflict
        const duplicateAccept = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });
        assert.equal(duplicateAccept.status, 409);
        assert.ok(duplicateAccept.data.message.includes('already been processed'));

        // Attempting to reject already processed pair -> 409 Conflict
        const staleReject = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/reject`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: 'Late rejection' })
        });
        assert.equal(staleReject.status, 409);

        // Non-existent random ID -> 409 Conflict (or 400 for bad ObjectId)
        const randomId = new mongoose.Types.ObjectId();
        const nonExistent = await apiFetch(`${baseUrl}/driver/merge-offers/${randomId}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });
        assert.equal(nonExistent.status, 409);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Concurrent Conflicting Decisions (Race Condition Protection)
    // ─────────────────────────────────────────────────────────────────────────────
    test('7. Concurrent decisions on the same offer are atomic: exactly one succeeds and the other receives 409', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // Fire accept and reject concurrently
        const [res1, res2] = await Promise.all([
            apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
                method: 'POST',
                headers: { 'Cookie': `token=${driverAToken}` }
            }),
            apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/reject`, {
                method: 'POST',
                headers: {
                    'Cookie': `token=${driverAToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Concurrent decline' })
            })
        ]);

        const statuses = [res1.status, res2.status].sort();
        assert.deepEqual(statuses, [200, 409], 'Exactly one concurrent decision must succeed (200) and the other must conflict (409)');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 8: Capacity Feasibility Validation Failure
    // ─────────────────────────────────────────────────────────────────────────────
    test('8. Feasibility validation failure rejects operation with HTTP 400 without corrupting state', async () => {
        await setupFreshFleet();

        // Create pair where combined loads exceed Truck A total capacity (10000kg)
        // Truck A: 8000kg on segments
        await Truck.findByIdAndUpdate(truckA._id, {
            currentLoad: [8000, 8000, 8000, 0],
            remainingLoad: [2000, 2000, 2000, 10000]
        });

        // Truck B: 3000kg on segments -> combined = 11000kg > 10000kg capacity
        await Truck.findByIdAndUpdate(truckB._id, {
            currentLoad: [3000, 3000, 0],
            remainingLoad: [1000, 1000, 4000]
        });

        const pair = await createPendingPair();

        const acceptRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        assert.equal(acceptRes.status, 400, 'Must return HTTP 400 on capacity limit violation');
        assert.ok(acceptRes.data.message.includes('Insufficient capacity'));

        // MergedSchedule must NOT be created
        const sched = await MergedSchedule.findOne({ transportationTruckId: truckA._id.toString() });
        assert.equal(sched, null, 'No schedule should be created if capacity check fails');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 9: Successful Refresh of Driver Active Trip Following Merge
    // ─────────────────────────────────────────────────────────────────────────────
    test('9. Following merge acceptance, GET /driver/active-trip returns the authoritative updated consolidated schedule', async () => {
        await setupFreshFleet();
        const pair = await createPendingPair();

        // Accept offer
        const acceptRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pair._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });
        assert.equal(acceptRes.status, 200);

        // Driver A queries active trip
        const tripRes = await apiFetch(`${baseUrl}/driver/active-trip`, {
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        assert.equal(tripRes.status, 200);
        assert.ok(tripRes.data.trip, 'Active trip must be returned');
        assert.equal(tripRes.data.trip.type, 'MergedSchedule');
        assert.deepEqual(tripRes.data.trip.stops, routeA.stops);
        assert.ok(tripRes.data.trip.manifest && tripRes.data.trip.manifest.length >= 2, 'Manifest must reflect consolidated trucks');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 10: Visibility of Driver Decisions on Admin Dashboard
    // ─────────────────────────────────────────────────────────────────────────────
    test('10. Admin can inspect all historical driver merge decisions via GET /admin/merge-decisions', async () => {
        await setupFreshFleet();
        const pair1 = await createPendingPair();

        // 1. Accept pair1
        await apiFetch(`${baseUrl}/driver/merge-offers/${pair1._id}/accept`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        // 2. Reject pair2
        const pair2 = await MergeablePair.create({
            truckOneId: truckA._id,
            truckOneLicensePlate: truckA.licensePlate,
            truckOneStops: routeA.stops,
            truckTwoId: truckC._id,
            truckTwoLicensePlate: truckC.licensePlate,
            truckTwoStops: routeC.stops
        });

        await apiFetch(`${baseUrl}/driver/merge-offers/${pair2._id}/reject`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: 'Capacity headroom tight',
                notes: 'Bypass bridge under maintenance near Vadodara'
            })
        });

        // GET /admin/merge-decisions using admin token
        const res = await apiFetch(`${baseUrl}/admin/merge-decisions`, {
            headers: { 'Cookie': `token=${adminToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data.decisions), 'Must return decisions array');
        assert.ok(res.data.decisions.length >= 2, 'Decisions logged must be present');

        const acceptedLog = res.data.decisions.find(d => d.decision === 'accepted' && d.driverName === 'Ramesh Carrier Driver');
        assert.ok(acceptedLog, 'Accepted decision log must be visible to admin');
        assert.equal(acceptedLog.decidedByRole, 'driver');

        const rejectedLog = res.data.decisions.find(d => d.decision === 'rejected' && d.reason === 'Capacity headroom tight');
        assert.ok(rejectedLog, 'Rejected decision log with reason must be visible to admin');
        assert.equal(rejectedLog.notes, 'Bypass bridge under maintenance near Vadodara');
    });
});
