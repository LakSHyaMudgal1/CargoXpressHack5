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
const Admin = require('../src/models/admin');
const DriverLocation = require('../src/models/driverLocation');
const bcrypt = require('bcrypt');

describe('Driver GPS Location Tracking Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser;
    let truckA, truckB;
    let routeA, routeB;
    let driverA, driverB, driverUnassigned;
    let driverAToken, driverBToken, driverUnassignedToken, adminToken;

    const cleanupTestData = async (cleanAdmin = false) => {
        const cleanupOps = [
            Driver.deleteMany({ emailId: /^test_gps_drv_/ }),
            DriverAssignment.deleteMany({ notes: /TEST-GPS/ }),
            TransportCompany.deleteMany({ emailId: /^test_gps_comp_/ }),
            Truck.deleteMany({ licensePlate: /^TEST-GPS-TRK-/ }),
            Route.deleteMany({ source: /^GPS-City/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-GPS-TRK-/ }),
            DriverLocation.deleteMany({ truckLicensePlate: /^TEST-GPS-TRK-/ })
        ];
        if (cleanAdmin) {
            cleanupOps.push(Admin.deleteMany({ emailId: /^test_gps_admin/ }));
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

        await cleanupTestData(true);

        // Start server on an ephemeral port
        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        // Create Admin
        adminUser = await Admin.create({
            name: 'Fleet Dispatcher Admin',
            emailId: 'test_gps_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '777788889999',
            address: 'Navi Mumbai, MH'
        });
        adminToken = await adminUser.getJWT();

        // Create Transport Companies
        companyA = await TransportCompany.create({
            name: 'GPS Fleet Logistics A',
            emailId: 'test_gps_comp_a@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-GPS-REG-A',
            address: 'Mumbai, MH'
        });

        companyB = await TransportCompany.create({
            name: 'GPS Fleet Logistics B',
            emailId: 'test_gps_comp_b@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-GPS-REG-B',
            address: 'Surat, GJ'
        });

        // Create Trucks
        truckA = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-GPS-TRK-A',
            totalCapacity: 12000,
            currentLoad: [4000, 3000, 1000],
            remainingLoad: [8000, 9000, 11000]
        });

        truckB = await Truck.create({
            companyId: companyB._id,
            licensePlate: 'TEST-GPS-TRK-B',
            totalCapacity: 8000,
            currentLoad: [2000, 1000],
            remainingLoad: [6000, 7000]
        });

        // Create Routes
        routeA = await Route.create({
            companyId: companyA._id,
            truckId: truckA._id,
            source: 'GPS-City-Mumbai',
            destination: 'GPS-City-Ahmedabad',
            stops: ['GPS-City-Mumbai', 'GPS-City-Surat', 'GPS-City-Ahmedabad']
        });

        routeB = await Route.create({
            companyId: companyB._id,
            truckId: truckB._id,
            source: 'GPS-City-Surat',
            destination: 'GPS-City-Vadodara',
            stops: ['GPS-City-Surat', 'GPS-City-Vadodara']
        });

        // Create Drivers
        driverA = await Driver.create({
            name: 'Karan GPS Driver',
            emailId: 'test_gps_drv_a@cargoxpress.com',
            password: hashedPassword,
            phone: '+919911111111',
            licenseNumber: 'TEST-GPS-DL-A',
            companyId: companyA._id,
            status: 'active'
        });

        driverB = await Driver.create({
            name: 'Manish GPS Driver',
            emailId: 'test_gps_drv_b@cargoxpress.com',
            password: hashedPassword,
            phone: '+919922222222',
            licenseNumber: 'TEST-GPS-DL-B',
            companyId: companyB._id,
            status: 'active'
        });

        driverUnassigned = await Driver.create({
            name: 'Sunil Unassigned Driver',
            emailId: 'test_gps_drv_unassigned@cargoxpress.com',
            password: hashedPassword,
            phone: '+919933333333',
            licenseNumber: 'TEST-GPS-DL-U',
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
            notes: 'TEST-GPS Assignment A'
        });

        // Assign Driver B to Truck B
        await DriverAssignment.create({
            driverId: driverB._id,
            truckId: truckB._id,
            companyId: companyB._id,
            status: 'active',
            assignedByRole: 'admin',
            notes: 'TEST-GPS Assignment B'
        });

        driverAToken = await driverA.getJWT();
        driverBToken = await driverB.getJWT();
        driverUnassignedToken = await driverUnassigned.getJWT();
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

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Valid Authorized Single Location Update
    // ─────────────────────────────────────────────────────────────────────────────
    test('1. Valid authorized driver location update is ingested with GeoJSON and telemetry fields', async () => {
        const now = new Date();
        const payload = {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 14.5,
            speed: 18.2,
            heading: 42,
            altitude: 25.0,
            timestamp: now.toISOString()
        };

        const res = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        assert.equal(res.status, 200);
        assert.equal(res.data.recordedCount, 1);
        assert.equal(res.data.trip.truckLicensePlate, 'TEST-GPS-TRK-A');

        // Check MongoDB persistence
        const record = await DriverLocation.findOne({ driverId: driverA._id });
        assert.ok(record, 'Location record must be saved in MongoDB');
        assert.equal(record.latitude, 19.0760);
        assert.equal(record.longitude, 72.8777);
        assert.deepEqual(record.location.coordinates, [72.8777, 19.0760], 'Coordinates must follow [lng, lat] GeoJSON format');
        assert.equal(record.accuracy, 14.5);
        assert.equal(record.speed, 18.2);
        assert.equal(record.heading, 42);
        assert.equal(record.altitude, 25.0);
        assert.equal(record.driverName, 'Karan GPS Driver');
        assert.equal(record.truckLicensePlate, 'TEST-GPS-TRK-A');
        assert.equal(record.tripId.toString(), routeA._id.toString());
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Valid Authorized Batch Location Updates (Offline Queue Sync)
    // ─────────────────────────────────────────────────────────────────────────────
    test('2. Batched location updates recorded during offline queueing are bulk ingested', async () => {
        const baseTime = Date.now() - 100000;
        const batch = [
            {
                latitude: 19.2183,
                longitude: 72.9781,
                accuracy: 10.0,
                speed: 22.0,
                heading: 10,
                timestamp: new Date(baseTime + 10000).toISOString()
            },
            {
                latitude: 19.5000,
                longitude: 72.9900,
                accuracy: 8.5,
                speed: 25.0,
                heading: 12,
                timestamp: new Date(baseTime + 20000).toISOString()
            },
            {
                latitude: 19.8000,
                longitude: 73.0100,
                accuracy: 12.0,
                speed: 24.5,
                heading: 15,
                timestamp: new Date(baseTime + 30000).toISOString()
            }
        ];

        const res = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${driverAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ locations: batch })
        });

        assert.equal(res.status, 200);
        assert.equal(res.data.recordedCount, 3);
        assert.equal(res.data.totalSubmitted, 3);

        const count = await DriverLocation.countDocuments({
            driverId: driverA._id,
            latitude: { $gte: 19.2 }
        });
        assert.equal(count, 3);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Invalid Coordinate Validation
    // ─────────────────────────────────────────────────────────────────────────────
    test('3. Invalid latitude or longitude out of geographical range is rejected with HTTP 400', async () => {
        const now = new Date().toISOString();

        // 3a. Latitude > 90
        const resHighLat = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 95.5, longitude: 72.87, timestamp: now })
        });
        assert.equal(resHighLat.status, 400);
        assert.ok(resHighLat.data.message.includes('Invalid latitude value'));

        // 3b. Latitude < -90
        const resLowLat = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: -91.0, longitude: 72.87, timestamp: now })
        });
        assert.equal(resLowLat.status, 400);

        // 3c. Longitude > 180
        const resHighLng = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0, longitude: 185.0, timestamp: now })
        });
        assert.equal(resHighLng.status, 400);
        assert.ok(resHighLng.data.message.includes('Invalid longitude value'));

        // 3d. Non-numeric latitude
        const resNaNLat = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 'NOT_A_COORDINATE', longitude: 72.87, timestamp: now })
        });
        assert.equal(resNaNLat.status, 400);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Unauthenticated Updates
    // ─────────────────────────────────────────────────────────────────────────────
    test('4. Unauthenticated location update attempts are rejected with HTTP 401', async () => {
        const res = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, timestamp: new Date().toISOString() })
        });

        assert.equal(res.status, 401);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Cross-Driver / Conflicting Trip Update Protection
    // ─────────────────────────────────────────────────────────────────────────────
    test('5. Submitting another driver\'s trip ID or vehicle ID is rejected with HTTP 403', async () => {
        const now = new Date().toISOString();

        // Driver A tries to submit updates claiming Truck B (assigned to Driver B)
        const resWrongTruck = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                truckId: truckB._id.toString(),
                latitude: 19.0760,
                longitude: 72.8777,
                timestamp: now
            })
        });
        assert.equal(resWrongTruck.status, 403);
        assert.ok(resWrongTruck.data.message.includes('does not match your authorized vehicle'));

        // Driver A tries to submit updates claiming Route B (unrelated trip)
        const resWrongTrip = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tripId: routeB._id.toString(),
                latitude: 19.0760,
                longitude: 72.8777,
                timestamp: now
            })
        });
        assert.equal(resWrongTrip.status, 403);
        assert.ok(resWrongTrip.data.message.includes('does not match your assigned active trip'));
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Tracking After Assignment Revocation / End
    // ─────────────────────────────────────────────────────────────────────────────
    test('6. Unassigned driver or driver with ended assignment is denied tracking with HTTP 403', async () => {
        // Driver Unassigned has no active assignment
        const res = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverUnassignedToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, timestamp: new Date().toISOString() })
        });

        assert.equal(res.status, 403);
        assert.ok(res.data.message.includes('no active vehicle assignment authorized for tracking'));
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Stale and Future Timestamps
    // ─────────────────────────────────────────────────────────────────────────────
    test('7. Implausible future or stale timestamps (> 24 hours) are rejected with HTTP 400', async () => {
        // 7a. Future timestamp (> 5 minutes ahead)
        const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const resFuture = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, timestamp: futureDate })
        });
        assert.equal(resFuture.status, 400);
        assert.ok(resFuture.data.message.includes('implausible (in the future)'));

        // 7b. Ancient timestamp (> 24 hours old)
        const ancientDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const resAncient = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, timestamp: ancientDate })
        });
        assert.equal(resAncient.status, 400);
        assert.ok(resAncient.data.message.includes('stale'));

        // 7c. Malformed date string
        const resMalformed = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, timestamp: 'NOT_A_DATE' })
        });
        assert.equal(resMalformed.status, 400);
        assert.ok(resMalformed.data.message.includes('Invalid timestamp format'));
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 8: Deduplication of Identical Timestamp Events
    // ─────────────────────────────────────────────────────────────────────────────
    test('8. Replaying duplicate location events for the same driver is handled idempotently without duplicate rows', async () => {
        const uniqueTimestamp = new Date(Date.now() - 50000).toISOString();
        const point = {
            latitude: 19.1234,
            longitude: 72.5678,
            accuracy: 10,
            timestamp: uniqueTimestamp
        };

        // First send -> records 1
        const resFirst = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(point)
        });
        assert.equal(resFirst.status, 200);
        assert.equal(resFirst.data.recordedCount, 1);

        // Second send with same timestamp -> deduplicated, records 0
        const resSecond = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverAToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(point)
        });
        assert.equal(resSecond.status, 200);
        assert.equal(resSecond.data.recordedCount, 0, 'Replayed event must be deduplicated');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 9: GET /driver/location/latest — Driver Self-Service Position Check
    // ─────────────────────────────────────────────────────────────────────────────
    test('9. Driver can fetch their latest recorded location via GET /driver/location/latest', async () => {
        const res = await apiFetch(`${baseUrl}/driver/location/latest`, {
            headers: { 'Cookie': `token=${driverAToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(res.data.location, 'Location object must be returned');
        assert.equal(res.data.location.truckLicensePlate, 'TEST-GPS-TRK-A');
        assert.equal(typeof res.data.location.latitude, 'number');
        assert.equal(typeof res.data.location.longitude, 'number');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 10: GET /admin/driver-locations — Admin Live Fleet Overview
    // ─────────────────────────────────────────────────────────────────────────────
    test('10. Admin can inspect live location and freshness of active fleet via GET /admin/driver-locations', async () => {
        // Also send location for Driver B so both drivers have positions
        await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: { 'Cookie': `token=${driverBToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: 21.1702,
                longitude: 72.8311,
                accuracy: 15,
                timestamp: new Date().toISOString()
            })
        });

        const res = await apiFetch(`${baseUrl}/admin/driver-locations`, {
            headers: { 'Cookie': `token=${adminToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data.drivers));
        assert.ok(res.data.drivers.length >= 2);

        const driverAEntry = res.data.drivers.find(d => d.driver.name === 'Karan GPS Driver');
        assert.ok(driverAEntry, 'Driver A must be in fleet overview');
        assert.ok(driverAEntry.latestLocation, 'Driver A must have a latestLocation');
        assert.equal(driverAEntry.truck.licensePlate, 'TEST-GPS-TRK-A');
        assert.equal(driverAEntry.latestLocation.freshnessStatus, 'live', 'Fresh timestamp must have live status');

        const driverBEntry = res.data.drivers.find(d => d.driver.name === 'Manish GPS Driver');
        assert.ok(driverBEntry, 'Driver B must be in fleet overview');
        assert.equal(driverBEntry.truck.licensePlate, 'TEST-GPS-TRK-B');
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 11: GET /admin/driver-locations/:driverId/history — Breadcrumb Trail
    // ─────────────────────────────────────────────────────────────────────────────
    test('11. Admin can fetch GPS breadcrumb history for an authorized trip via GET /admin/driver-locations/:driverId/history', async () => {
        const res = await apiFetch(`${baseUrl}/admin/driver-locations/${driverA._id}/history?limit=50`, {
            headers: { 'Cookie': `token=${adminToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(res.data.driverId, driverA._id.toString());
        assert.ok(Array.isArray(res.data.history));
        assert.ok(res.data.history.length > 0, 'History trail must contain breadcrumb records');

        // Check descending timestamp ordering
        const first = new Date(res.data.history[0].deviceTimestamp).getTime();
        const last = new Date(res.data.history[res.data.history.length - 1].deviceTimestamp).getTime();
        assert.ok(first >= last, 'History must be returned in descending chronological order');
    });
});
