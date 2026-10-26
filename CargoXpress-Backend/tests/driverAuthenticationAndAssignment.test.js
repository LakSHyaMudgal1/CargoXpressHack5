const { test, describe, before, after } = require('node:test');
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
const Admin = require('../src/models/admin');
const bcrypt = require('bcrypt');

describe('Driver App Backend Foundation & Assignment Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser;
    let truckA1, truckA2, truckB1;
    let routeA1;
    let driver1, driver2, driverDisabled;
    let driver1Token, driver2Token, companyAToken, adminToken;

    before(async () => {
        assert.ok(URI, 'MONGODB_STRING must be defined in environment');
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(URI);
        }

        // Clean up any test artifacts from prior runs
        await Promise.all([
            Driver.deleteMany({ emailId: /^test_drv_/ }),
            DriverAssignment.deleteMany({ notes: /^TEST-DRV/ }),
            TransportCompany.deleteMany({ emailId: /^test_drv_comp_/ }),
            Admin.deleteMany({ emailId: /^test_drv_admin/ }),
            Truck.deleteMany({ licensePlate: /^TEST-DRV-/ }),
            Route.deleteMany({ source: /^DRV-City/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-DRV-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-DRV-/ })
        ]);

        // Start server on an ephemeral port
        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        // Create test transport companies
        companyA = await TransportCompany.create({
            name: 'Test Fleet Operations Ltd',
            emailId: 'test_drv_comp_a@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-DRV-REG-A',
            address: 'Mumbai, India'
        });

        companyB = await TransportCompany.create({
            name: 'Rival Logistics Corp',
            emailId: 'test_drv_comp_b@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-DRV-REG-B',
            address: 'Pune, India'
        });

        adminUser = await Admin.create({
            name: 'Test Dispatch Admin',
            emailId: 'test_drv_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999988887777',
            address: 'Delhi, India'
        });

        // Create trucks
        truckA1 = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-DRV-TRK-A1',
            totalCapacity: 10000,
            currentLoad: [2000, 1500, 1000],
            remainingLoad: [8000, 8500, 9000]
        });

        truckA2 = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-DRV-TRK-A2',
            totalCapacity: 5000,
            currentLoad: [1000, 800],
            remainingLoad: [4000, 4200]
        });

        truckB1 = await Truck.create({
            companyId: companyB._id,
            licensePlate: 'TEST-DRV-TRK-B1',
            totalCapacity: 8000,
            currentLoad: [1000, 500],
            remainingLoad: [7000, 7500]
        });

        // Create route for truckA1
        routeA1 = await Route.create({
            truckId: truckA1._id,
            source: 'DRV-City1',
            destination: 'DRV-City3',
            stops: ['DRV-City1', 'DRV-City2', 'DRV-City3']
        });

        // Create drivers
        driver1 = await Driver.create({
            name: 'Rajesh Kumar',
            emailId: 'test_drv_driver1@cargoxpress-test.com',
            password: hashedPassword,
            phone: '+919876543210',
            licenseNumber: 'DL-TEST-DRV-001',
            companyId: companyA._id,
            status: 'active'
        });

        driver2 = await Driver.create({
            name: 'Suresh Singh',
            emailId: 'test_drv_driver2@cargoxpress-test.com',
            password: hashedPassword,
            phone: '+919876543211',
            licenseNumber: 'DL-TEST-DRV-002',
            companyId: companyA._id,
            status: 'active'
        });

        driverDisabled = await Driver.create({
            name: 'Disabled Driver',
            emailId: 'test_drv_disabled@cargoxpress-test.com',
            password: hashedPassword,
            phone: '+919876543212',
            licenseNumber: 'DL-TEST-DRV-003',
            companyId: companyA._id,
            status: 'disabled'
        });

        // Generate tokens
        driver1Token = await driver1.getJWT();
        driver2Token = await driver2.getJWT();
        companyAToken = await companyA.getJWT();
        adminToken = await adminUser.getJWT();
    });

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

    after(async () => {
        await Promise.all([
            Driver.deleteMany({ emailId: /^test_drv_/ }),
            DriverAssignment.deleteMany({ notes: /^TEST-DRV/ }),
            TransportCompany.deleteMany({ emailId: /^test_drv_comp_/ }),
            Admin.deleteMany({ emailId: /^test_drv_admin/ }),
            Truck.deleteMany({ licensePlate: /^TEST-DRV-/ }),
            Route.deleteMany({ source: /^DRV-City/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-DRV-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-DRV-/ })
        ]);
        if (server) {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise(resolve => server.close(resolve));
        }
    });

    // ── 1. DRIVER AUTHENTICATION ──────────────────────────────────────────────

    test('1. Valid driver login via /driver/login and /login returns token and profile', async () => {
        // Dedicated driver login
        const res1 = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: 'test_drv_driver1@cargoxpress-test.com',
                password: 'TestPassword123!'
            })
        });
        assert.equal(res1.status, 200);
        const data1 = await res1.json();
        assert.ok(data1.token, 'Must return JWT token in JSON payload for mobile');
        assert.equal(data1.driver.name, 'Rajesh Kumar');
        assert.equal(data1.driver.licenseNumber, 'DL-TEST-DRV-001');
        assert.equal(data1.driver.password, undefined, 'Must not return password hash');

        // General unified login
        const res2 = await apiFetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: 'test_drv_driver1@cargoxpress-test.com',
                password: 'TestPassword123!'
            })
        });
        assert.equal(res2.status, 200);
        const data2 = await res2.json();
        assert.ok(data2.token, 'Unified login must also include token for mobile clients');
        assert.equal(data2.name, 'Rajesh Kumar');
    });

    test('2. Invalid driver credentials are rejected', async () => {
        // Wrong password
        const res1 = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: 'test_drv_driver1@cargoxpress-test.com',
                password: 'WrongPassword999'
            })
        });
        assert.equal(res1.status, 400);

        // Non-existent email
        const res2 = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: 'nonexistent_driver@cargoxpress.com',
                password: 'TestPassword123!'
            })
        });
        assert.equal(res2.status, 400);
    });

    test('3. Unauthenticated requests to driver endpoints are rejected with 401', async () => {
        const endpoints = [
            '/driver/me',
            '/driver/assignment',
            '/driver/active-trip',
            '/driver/trips',
            '/driver/merge-offers'
        ];

        for (const ep of endpoints) {
            const res = await apiFetch(`${baseUrl}${ep}`);
            assert.equal(res.status, 401, `Endpoint ${ep} must require authentication`);
        }
    });

    test('4. Disabled driver accounts cannot authenticate or access trips', async () => {
        // Login attempt by disabled driver
        const resLogin = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: 'test_drv_disabled@cargoxpress-test.com',
                password: 'TestPassword123!'
            })
        });
        assert.equal(resLogin.status, 403, 'Disabled driver login must be rejected with 403');

        // Request with pre-existing token for disabled driver
        const disabledToken = await driverDisabled.getJWT();
        const resMe = await apiFetch(`${baseUrl}/driver/me`, {
            headers: { Authorization: `Bearer ${disabledToken}` }
        });
        assert.equal(resMe.status, 403, 'Disabled driver session must be blocked with 403');
    });

    // ── 2. DRIVER ASSIGNMENT & REASSIGNMENT OPERATIONS ─────────────────────────

    test('5. Transport company assigns Driver 1 to Truck A1 and driver views active trip', async () => {
        // Company assigns driver
        const resAssign = await apiFetch(`${baseUrl}/driver/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyAToken}`
            },
            body: JSON.stringify({
                driverId: driver1._id.toString(),
                truckId: truckA1._id.toString(),
                notes: 'TEST-DRV Route assignment 1'
            })
        });
        assert.equal(resAssign.status, 200);
        const dataAssign = await resAssign.json();
        assert.equal(dataAssign.assignment.status, 'active');

        // Driver 1 retrieves active assignment
        const resAss = await apiFetch(`${baseUrl}/driver/assignment`, {
            headers: { Authorization: `Bearer ${driver1Token}` }
        });
        assert.equal(resAss.status, 200);
        const dataAss = await resAss.json();
        assert.ok(dataAss.assignment);
        assert.equal(dataAss.assignment.truck.licensePlate, 'TEST-DRV-TRK-A1');

        // Driver 1 retrieves active trip
        const resTrip = await apiFetch(`${baseUrl}/driver/active-trip`, {
            headers: { Authorization: `Bearer ${driver1Token}` }
        });
        assert.equal(resTrip.status, 200);
        const dataTrip = await resTrip.json();
        assert.ok(dataTrip.trip);
        assert.equal(dataTrip.trip.type, 'Route');
        assert.equal(dataTrip.trip.origin, 'DRV-City1');
        assert.equal(dataTrip.trip.destination, 'DRV-City3');
        assert.deepEqual(dataTrip.trip.stops, ['DRV-City1', 'DRV-City2', 'DRV-City3']);
    });

    test('6. Reassigning Truck A1 to Driver 2 revokes Driver 1 access and grants Driver 2 access', async () => {
        // Company reassigns truckA1 to Driver 2
        const resReassign = await apiFetch(`${baseUrl}/driver/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyAToken}`
            },
            body: JSON.stringify({
                driverId: driver2._id.toString(),
                truckId: truckA1._id.toString(),
                notes: 'TEST-DRV Reassignment to Driver 2'
            })
        });
        assert.equal(resReassign.status, 200);

        // Verify previous assignment for Driver 1 is terminated in DB
        const prevAssignment = await DriverAssignment.findOne({
            driverId: driver1._id,
            truckId: truckA1._id
        }).sort({ createdAt: -1 });
        assert.equal(prevAssignment.status, 'reassigned', 'Old assignment must be marked reassigned');
        assert.ok(prevAssignment.endedAt, 'Must have recorded endedAt timestamp');

        // Driver 1 should no longer have an active assignment
        const resAssDriver1 = await apiFetch(`${baseUrl}/driver/assignment`, {
            headers: { Authorization: `Bearer ${driver1Token}` }
        });
        const dataAss1 = await resAssDriver1.json();
        assert.equal(dataAss1.assignment, null);

        // Driver 1 trying to access trip details of Route A1 is forbidden (403)
        const resTripDetails1 = await apiFetch(`${baseUrl}/driver/trip-details/${routeA1._id}`, {
            headers: { Authorization: `Bearer ${driver1Token}` }
        });
        assert.equal(resTripDetails1.status, 403, 'Old driver must be forbidden from accessing trip details');

        // Driver 2 now retrieves active trip successfully
        const resTrip2 = await apiFetch(`${baseUrl}/driver/active-trip`, {
            headers: { Authorization: `Bearer ${driver2Token}` }
        });
        assert.equal(resTrip2.status, 200);
        const dataTrip2 = await resTrip2.json();
        assert.ok(dataTrip2.trip);
        assert.equal(dataTrip2.truck.licensePlate, 'TEST-DRV-TRK-A1');

        // Driver 2 retrieves trip details successfully
        const resTripDetails2 = await apiFetch(`${baseUrl}/driver/trip-details/${routeA1._id}`, {
            headers: { Authorization: `Bearer ${driver2Token}` }
        });
        assert.equal(resTripDetails2.status, 200);
        const dataDetails2 = await resTripDetails2.json();
        assert.equal(dataDetails2.trip.id, routeA1._id.toString());
    });

    // ── 3. CROSS-COMPANY AND CROSS-DRIVER ACCESS BOUNDARIES ───────────────────

    test('7. Cross-company vehicle and driver assignment operations are blocked (403)', async () => {
        const companyBToken = await companyB.getJWT();

        // Company B attempts to assign Company A's driver
        const res1 = await apiFetch(`${baseUrl}/driver/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyBToken}`
            },
            body: JSON.stringify({
                driverId: driver1._id.toString(), // belongs to Company A
                truckId: truckB1._id.toString()
            })
        });
        assert.equal(res1.status, 403, 'Company B cannot assign Driver belonging to Company A');

        // Company B attempts to assign Company A's truck
        const driverCompanyB = await Driver.create({
            name: 'Company B Driver',
            emailId: 'test_drv_b_driver@cargoxpress-test.com',
            password: 'TestPassword123!',
            phone: '+919876543299',
            licenseNumber: 'DL-TEST-DRV-999',
            companyId: companyB._id,
            status: 'active'
        });

        const res2 = await apiFetch(`${baseUrl}/driver/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyBToken}`
            },
            body: JSON.stringify({
                driverId: driverCompanyB._id.toString(),
                truckId: truckA1._id.toString() // belongs to Company A
            })
        });
        assert.equal(res2.status, 403, 'Company B cannot assign Truck belonging to Company A');
    });

    test('8. Missing, invalid, or unauthorized trip IDs are safely handled', async () => {
        // Invalid ObjectId format -> 400
        const resInvalid = await apiFetch(`${baseUrl}/driver/trip-details/not-a-valid-id`, {
            headers: { Authorization: `Bearer ${driver2Token}` }
        });
        assert.equal(resInvalid.status, 400);

        // Non-existent ObjectId -> 404
        const fakeId = new mongoose.Types.ObjectId().toString();
        const resNotFound = await apiFetch(`${baseUrl}/driver/trip-details/${fakeId}`, {
            headers: { Authorization: `Bearer ${driver2Token}` }
        });
        assert.equal(resNotFound.status, 404);
    });

    // ── 4. MERGE OFFERS FILTERING FOR DRIVER ───────────────────────────────────

    test('9. Driver only receives merge offers relevant to their active vehicle', async () => {
        // Create a merge pair between truckA1 and truckA2
        const pair = await MergeablePair.create({
            truckOneId: truckA1._id,
            truckOneLicensePlate: truckA1.licensePlate,
            truckOneStops: ['DRV-City1', 'DRV-City2', 'DRV-City3'],
            truckTwoId: truckA2._id,
            truckTwoLicensePlate: truckA2.licensePlate,
            truckTwoStops: ['DRV-City1', 'DRV-City2']
        });

        // Driver 2 (assigned to truckA1) queries merge offers
        const resOffers = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { Authorization: `Bearer ${driver2Token}` }
        });
        assert.equal(resOffers.status, 200);
        const dataOffers = await resOffers.json();
        assert.equal(dataOffers.offers.length, 1);
        assert.equal(dataOffers.offers[0].pairId, pair._id.toString());
        assert.equal(dataOffers.offers[0].myTruck.licensePlate, 'TEST-DRV-TRK-A1');
        assert.equal(dataOffers.offers[0].partnerTruck.licensePlate, 'TEST-DRV-TRK-A2');

        // Driver 1 (currently unassigned) queries merge offers
        const resOffers1 = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { Authorization: `Bearer ${driver1Token}` }
        });
        assert.equal(resOffers1.status, 200);
        const dataOffers1 = await resOffers1.json();
        assert.equal(dataOffers1.offers.length, 0, 'Unassigned driver must receive 0 merge offers');
    });

    // ── 5. PRESERVATION OF EXISTING ADMIN AND COMPANY ACCESS ──────────────────

    test('10. Existing Transport Company and Admin endpoints operate without regressions', async () => {
        // Company A lists its drivers
        const resCompDrivers = await apiFetch(`${baseUrl}/company/drivers`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(resCompDrivers.status, 200);
        const dataComp = await resCompDrivers.json();
        assert.ok(dataComp.drivers.length >= 2);

        // Company A updates driver status
        const resStatus = await apiFetch(`${baseUrl}/company/drivers/${driver2._id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyAToken}`
            },
            body: JSON.stringify({ status: 'on_duty' })
        });
        assert.equal(resStatus.status, 200);

        // Admin access check: Admin can access /mergedSchedule
        const resAdmin = await apiFetch(`${baseUrl}/mergedSchedule`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resAdmin.status, 200);
    });
});
