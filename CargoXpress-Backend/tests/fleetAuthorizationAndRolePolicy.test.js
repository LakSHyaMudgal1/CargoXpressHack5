const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const TransportCompany = require('../src/models/transportCompany');
const Admin = require('../src/models/admin');
const Truck = require('../src/models/truck');
const Route = require('../src/models/route');

describe('Fleet Authorization and Role-Based Create Policy Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser;
    let companyAToken, companyBToken, adminToken;
    let createdTruckA, createdRouteA;

    const apiFetch = async (url, options = {}) => {
        const headers = { Connection: 'close', ...(options.headers || {}) };
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

        // Clean up any test artifacts from prior runs
        await Promise.all([
            TransportCompany.deleteMany({ emailId: /^test_auth_comp_/ }),
            Admin.deleteMany({ emailId: /^test_auth_admin/ }),
            Truck.deleteMany({ licensePlate: /^TEST-AUTH-/ }),
            Route.deleteMany({ source: /^AuthCity-/ })
        ]);

        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        companyA = await TransportCompany.create({
            name: 'Alpha Freight Logistics',
            emailId: 'test_auth_comp_a@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-AUTH-REG-A',
            address: 'Mumbai, India'
        });

        companyB = await TransportCompany.create({
            name: 'Beta Express Carriers',
            emailId: 'test_auth_comp_b@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-AUTH-REG-B',
            address: 'Pune, India'
        });

        adminUser = await Admin.create({
            name: 'System Dispatch Admin',
            emailId: 'test_auth_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '888877776666',
            address: 'New Delhi, India'
        });

        companyAToken = await companyA.getJWT();
        companyBToken = await companyB.getJWT();
        adminToken = await adminUser.getJWT();
    });

    after(async () => {
        await Promise.all([
            TransportCompany.deleteMany({ emailId: /^test_auth_comp_/ }),
            Admin.deleteMany({ emailId: /^test_auth_admin/ }),
            Truck.deleteMany({ licensePlate: /^TEST-AUTH-/ }),
            Route.deleteMany({ source: /^AuthCity-/ })
        ]);

        if (server) {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise((resolve) => server.close(resolve));
        }
        await mongoose.disconnect();
    });

    // ─── 1. ADMIN CREATE REQUESTS ARE REJECTED (403) ─────────────────────────

    test('1. Admin create requests to POST /scheduleDelivery/addtruck are rejected with 403', async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addtruck`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-ADMIN-TRK',
                totalCapacity: 10000,
                currentLoad: [1000]
            })
        });

        assert.equal(res.status, 403, 'Admin truck creation must be rejected with 403 Forbidden');
        const data = await res.json();
        assert.ok(data && data.message, 'Response should contain an explanatory error message');
        assert.match(
            data.message,
            /Admin users are not permitted to register trucks/i,
            'Message must clarify that admin cannot register trucks'
        );

        // Verify truck was NOT persisted
        const saved = await Truck.findOne({ licensePlate: 'TEST-AUTH-ADMIN-TRK' });
        assert.equal(saved, null, 'No truck record should be created in the database by admin');
    });

    test('2. Admin create requests to POST /scheduleDelivery/addroute are rejected with 403', async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addroute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-ADMIN-TRK',
                source: 'AuthCity-Origin',
                destination: 'AuthCity-Destination',
                stops: ['AuthCity-Stop1']
            })
        });

        assert.equal(res.status, 403, 'Admin route schedule creation must be rejected with 403 Forbidden');
        const data = await res.json();
        assert.ok(data && data.message);
        assert.match(data.message, /Admin users are not permitted/i);
    });

    test('3. Admin requests to DELETE /scheduleDelivery/deletescheduleDelivery/:id are rejected with 403', async () => {
        const dummyId = new mongoose.Types.ObjectId();
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/deletescheduleDelivery/${dummyId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        assert.equal(res.status, 403, 'Admin cannot invoke carrier route deletion endpoint');
    });

    // ─── 2. TRANSPORT COMPANY CAN CREATE A TRUCK ─────────────────────────────

    test('4. Transport Company can successfully register a truck via POST /scheduleDelivery/addtruck', async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addtruck`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyAToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-TRK-A1',
                totalCapacity: 12000,
                currentLoad: [3000, 2000, 1500]
            })
        });

        assert.equal(res.status, 201, 'Transport company truck creation must succeed with 201 Created');
        const data = await res.json();
        assert.ok(data.data, 'Response should return created truck data');
        assert.equal(data.data.licensePlate, 'TEST-AUTH-TRK-A1');
        assert.equal(data.data.totalCapacity, 12000);
        assert.equal(data.data.companyId, companyA._id.toString());
        assert.deepEqual(data.data.currentLoad, [3000, 2000, 1500]);
        assert.deepEqual(data.data.remainingLoad, [9000, 10000, 10500]);

        createdTruckA = await Truck.findById(data.data._id);
        assert.ok(createdTruckA, 'Truck must be persisted in database');
    });

    // ─── 3. TRANSPORT COMPANY CAN CREATE A ROUTE SCHEDULE ─────────────────────

    test('5. Transport Company can successfully schedule a route via POST /scheduleDelivery/addroute', async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addroute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyAToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-TRK-A1',
                source: 'AuthCity-Mumbai',
                destination: 'AuthCity-Ahmedabad',
                stops: ['AuthCity-Surat', 'AuthCity-Vadodara']
            })
        });

        assert.equal(res.status, 201, 'Transport company route creation must succeed with 201 Created');
        const data = await res.json();
        assert.ok(data.data, 'Response should return created route data');
        assert.equal(data.data.truckId, createdTruckA._id.toString());
        assert.equal(data.data.source, 'AuthCity-Mumbai');
        assert.equal(data.data.destination, 'AuthCity-Ahmedabad');
        assert.deepEqual(data.data.stops, ['AuthCity-Surat', 'AuthCity-Vadodara']);

        createdRouteA = await Route.findById(data.data._id);
        assert.ok(createdRouteA, 'Route must be persisted in database');
    });

    // ─── 4. CROSS-COMPANY RECORD CREATION & MODIFICATION IS BLOCKED ───────────

    test("6. Company B cannot schedule a route for Company A's truck (403)", async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addroute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyBToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-TRK-A1', // belongs to Company A
                source: 'AuthCity-Pune',
                destination: 'AuthCity-Nagpur',
                stops: []
            })
        });

        assert.equal(res.status, 403, 'Cross-company route creation on another carrier truck must be blocked with 403');
        const data = await res.json();
        assert.match(data.message, /not authorized to create or modify routes for another company's vehicle/i);
    });

    test("7. Company B cannot delete Company A's route schedule (403)", async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/deletescheduleDelivery/${createdRouteA._id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${companyBToken}` // Company B attempting to delete Company A's route
            }
        });

        assert.equal(res.status, 403, 'Cross-company route deletion must be blocked with 403');
        const data = await res.json();
        assert.match(data.message, /not authorized to delete this route/i);

        // Verify route still exists
        const stillExists = await Route.findById(createdRouteA._id);
        assert.ok(stillExists, 'Route must not be deleted by unauthorized company');
    });

    test("8. Company B cannot register a truck with a duplicate license plate already owned by Company A (403)", async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/addtruck`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${companyBToken}`
            },
            body: JSON.stringify({
                licensePlate: 'TEST-AUTH-TRK-A1', // Already registered by Company A
                totalCapacity: 8000,
                currentLoad: [1000]
            })
        });

        assert.equal(res.status, 403, 'Duplicate truck registration by another company must be rejected with 403');
        const data = await res.json();
        assert.match(data.message, /registered to another transport company/i);
    });

    test("9. Company A can legitimately delete its own route schedule (200)", async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/deletescheduleDelivery/${createdRouteA._id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${companyAToken}`
            }
        });

        assert.equal(res.status, 200, 'Company A must be able to delete its own route');
        const deletedCheck = await Route.findById(createdRouteA._id);
        assert.equal(deletedCheck, null, 'Route should be removed from database');
    });

    // ─── 5. ADMIN READ-ONLY MONITORING STILL WORKS ────────────────────────────

    test('10. Admin read-only monitoring endpoint GET /admin/fleet-overview functions correctly', async () => {
        const res = await apiFetch(`${baseUrl}/admin/fleet-overview`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        assert.equal(res.status, 200, 'Admin fleet overview must return 200 OK');
        const data = await res.json();
        assert.ok(data.metrics, 'Metrics object should be present');
        assert.ok(typeof data.metrics.totalRegisteredTrucks === 'number');
        assert.ok(Array.isArray(data.freeTrucks), 'FreeTruck list must be an array');
        assert.ok(Array.isArray(data.scheduleUtilization), 'Schedule utilization must be an array');
    });

    test('11. Admin read-only monitoring endpoints GET /viewCompany and /viewCompanyDetails function correctly', async () => {
        const resList = await apiFetch(`${baseUrl}/viewCompany`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        assert.equal(resList.status, 200, 'Admin can view company list');
        const companies = await resList.json();
        assert.ok(Array.isArray(companies), 'Expected company list array');

        const resDetails = await apiFetch(`${baseUrl}/viewCompanyDetails/${companyA._id}`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        assert.equal(resDetails.status, 200, 'Admin can view company details and fleet');
        const details = await resDetails.json();
        assert.ok(details.trucksWithRoutes, 'Expected trucksWithRoutes in company details');
    });

    // ─── 6. OPTIMIZATION & MERGE-APPROVAL APIS REMAIN FUNCTIONAL ───────────────

    test('12. Admin optimization & merge dispatch endpoints remain fully accessible', async () => {
        const resMergeable = await apiFetch(`${baseUrl}/mergeableSchedule`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        assert.equal(resMergeable.status, 200, 'Admin can access /mergeableSchedule');

        const resMerged = await apiFetch(`${baseUrl}/mergedSchedule`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        assert.equal(resMerged.status, 200, 'Admin can access /mergedSchedule');

        const resTrader = await apiFetch(`${baseUrl}/mergedTrader`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });
        assert.equal(resTrader.status, 200, 'Admin can access /mergedTrader');
    });

    test('13. Non-admin roles (Company) are blocked from admin dispatch & merge approval endpoints (403)', async () => {
        const resFleet = await apiFetch(`${baseUrl}/admin/fleet-overview`, {
            headers: {
                Authorization: `Bearer ${companyAToken}`
            }
        });
        assert.equal(resFleet.status, 403, 'Company must be blocked from admin fleet overview');

        const resMergeable = await apiFetch(`${baseUrl}/mergeableSchedule`, {
            headers: {
                Authorization: `Bearer ${companyAToken}`
            }
        });
        assert.equal(resMergeable.status, 403, 'Company must be blocked from admin mergeableSchedule');
    });
});
