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
const Trader = require('../src/models/trader');
const TraderRequest = require('../src/models/traderRequest');
const MergeableTrader = require('../src/models/mergeableTrader');
const Admin = require('../src/models/admin');
const TripStopExecution = require('../src/models/tripStopExecution');
const bcrypt = require('bcrypt');

describe('Driver App — Pickup, Delivery, and Stop Status Updates Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, adminUser, traderUserA, traderUserB;
    let truckCarrier, truckAbsorbed;
    let routeCarrier;
    let driverCarrier, driverUnassigned;
    let driverCarrierToken, driverUnassignedToken, adminToken, traderTokenA, traderTokenB;
    let consolidatedSchedule;
    let traderReqA;

    const cleanupTestData = async () => {
        await Promise.all([
            Driver.deleteMany({ emailId: /^test_stop_drv_/ }),
            DriverAssignment.deleteMany({ notes: /TEST-STOP/ }),
            TransportCompany.deleteMany({ emailId: /^test_stop_comp_/ }),
            Truck.deleteMany({ licensePlate: /^TEST-STOP-TRK-/ }),
            Route.deleteMany({ source: /^StopCity/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-STOP-TRK-/ }),
            Trader.deleteMany({ emailId: /^test_stop_trader_/ }),
            TraderRequest.deleteMany({ source: /^StopCity/ }),
            MergeableTrader.deleteMany({ licensePlate: /^TEST-STOP-TRK-/ }),
            TripStopExecution.deleteMany({ truckLicensePlate: /^TEST-STOP-TRK-/ }),
            Admin.deleteMany({ emailId: /^test_stop_admin/ })
        ]);
    };

    const apiFetch = async (url, options = {}) => {
        const headers = { 'Connection': 'close', ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (_) {
            parsed = text;
        }
        return { status: res.status, ok: res.ok, body: parsed };
    };

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(URI);
        }
        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        await cleanupTestData();

        const hashedPassword = await bcrypt.hash('secret123', 10);

        // 1. Create Transport Company
        companyA = await TransportCompany.create({
            name: 'Stop Express Logistics',
            emailId: 'test_stop_comp_a@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-STOP-REG-A',
            address: '100 Express Freightway'
        });

        // 2. Create Admin
        adminUser = await Admin.create({
            name: 'Stop Admin',
            emailId: 'test_stop_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '888899990000'
        });

        // 3. Create Traders
        traderUserA = await Trader.create({
            name: 'Trader Alice',
            emailId: 'test_stop_trader_a@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999900001111'
        });

        traderUserB = await Trader.create({
            name: 'Trader Bob',
            emailId: 'test_stop_trader_b@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999900002222'
        });

        // 4. Create Trucks
        truckCarrier = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-STOP-TRK-CARRIER',
            totalCapacity: 12000,
            currentLoad: [2000],
            remainingLoad: [10000]
        });

        truckAbsorbed = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-STOP-TRK-ABSORBED',
            totalCapacity: 5000,
            currentLoad: [1500],
            remainingLoad: [3500]
        });

        // 5. Create Carrier Consolidated MergedSchedule (Mumbai -> Surat -> Vadodara -> Ahmedabad)
        // Truck Carrier brings 2000kg from Mumbai to Ahmedabad
        // Truck Absorbed cargo is 1500kg from Surat to Vadodara
        consolidatedSchedule = await MergedSchedule.create({
            transportationTruckId: truckCarrier._id.toString(),
            transportationTruckLicensePlate: truckCarrier.licensePlate,
            mergedFromTrucks: [
                {
                    licensePlate: truckCarrier.licensePlate,
                    id: truckCarrier._id.toString(),
                    source: 'StopCity-Mumbai',
                    destination: 'StopCity-Ahmedabad',
                    stops: ['StopCity-Mumbai', 'StopCity-Surat', 'StopCity-Vadodara', 'StopCity-Ahmedabad'],
                    load: [2000],
                    companyId: companyA._id,
                    role: 'carrier'
                },
                {
                    licensePlate: truckAbsorbed.licensePlate,
                    id: truckAbsorbed._id.toString(),
                    source: 'StopCity-Surat',
                    destination: 'StopCity-Vadodara',
                    stops: ['StopCity-Surat', 'StopCity-Vadodara'],
                    load: [1500],
                    companyId: companyA._id,
                    role: 'absorbed'
                }
            ],
            totalCapacity: 12000,
            finalSource: 'StopCity-Mumbai',
            finalDestination: 'StopCity-Ahmedabad',
            stops: ['StopCity-Mumbai', 'StopCity-Surat', 'StopCity-Vadodara', 'StopCity-Ahmedabad'],
            finalCurrentLoad: [2000, 3500, 2000, 0],
            finalRemainingLoad: [10000, 8500, 10000, 12000],
            status: 'accepted'
        });

        // 6. Create Trader Request A (merged with truck Carrier: Surat -> Ahmedabad, 500kg)
        traderReqA = await TraderRequest.create({
            traderId: traderUserA._id,
            source: 'StopCity-Surat',
            destination: 'StopCity-Ahmedabad',
            stops: ['StopCity-Surat', 'StopCity-Vadodara', 'StopCity-Ahmedabad'],
            load: [500]
        });

        await MergeableTrader.create({
            traderRequestId: traderReqA._id.toString(),
            truckId: truckCarrier._id.toString(),
            load: [500],
            source: 'StopCity-Surat',
            destination: 'StopCity-Ahmedabad',
            stops: ['StopCity-Surat', 'StopCity-Vadodara', 'StopCity-Ahmedabad'],
            licensePlate: truckCarrier.licensePlate,
            status: 'accepted'
        });

        // 7. Create Drivers
        driverCarrier = await Driver.create({
            name: 'Driver Vikram Carrier',
            emailId: 'test_stop_drv_carrier@cargoxpress.com',
            password: hashedPassword,
            phone: '9876543210',
            licenseNumber: 'DL-STOP-001',
            status: 'active',
            companyId: companyA._id
        });

        driverUnassigned = await Driver.create({
            name: 'Driver Idle',
            emailId: 'test_stop_drv_idle@cargoxpress.com',
            password: hashedPassword,
            phone: '9876543211',
            licenseNumber: 'DL-STOP-002',
            status: 'active',
            companyId: companyA._id
        });

        // 8. Assign Driver Carrier to truckCarrier
        await DriverAssignment.assignDriver({
            driverId: driverCarrier._id,
            truckId: truckCarrier._id,
            companyId: companyA._id,
            notes: 'TEST-STOP Assigned Carrier'
        });

        // 9. Login to obtain tokens
        const loginCarrier = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: driverCarrier.emailId, password: 'secret123' })
        });
        driverCarrierToken = loginCarrier.body.token;

        const loginIdle = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: driverUnassigned.emailId, password: 'secret123' })
        });
        driverUnassignedToken = loginIdle.body.token;

        adminToken = await adminUser.getJWT();
        traderTokenA = await traderUserA.getJWT();
        traderTokenB = await traderUserB.getJWT();
    });

    after(async () => {
        if (server) {
            server.close();
        }
        await cleanupTestData();
    });

    test('1. GET /driver/active-trip/stops initializes ordered stops with correct stop types and cargo manifest', async () => {
        const res = await apiFetch(`${baseUrl}/driver/active-trip/stops`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });

        assert.equal(res.status, 200);
        assert.ok(res.body.stops, 'Expected stops array in response');
        assert.equal(res.body.stops.length, 4, 'Expected 4 stops (Mumbai, Surat, Vadodara, Ahmedabad)');

        const stops = res.body.stops;

        // Stop 0: Mumbai (Pickup Carrier cargo)
        assert.equal(stops[0].stopName, 'StopCity-Mumbai');
        assert.equal(stops[0].stopType, 'pickup');
        assert.equal(stops[0].status, 'pending');
        assert.equal(stops[0].shipments.length, 1);
        assert.equal(stops[0].shipments[0].operation, 'pickup');
        assert.equal(stops[0].shipments[0].weightKg, 2000);

        // Stop 1: Surat (Pickup Absorbed truck cargo 1500kg + Trader cargo 500kg)
        assert.equal(stops[1].stopName, 'StopCity-Surat');
        assert.equal(stops[1].stopType, 'pickup');
        assert.equal(stops[1].status, 'pending');
        assert.equal(stops[1].shipments.length, 2);

        // Stop 2: Vadodara (Delivery Absorbed truck cargo 1500kg)
        assert.equal(stops[2].stopName, 'StopCity-Vadodara');
        assert.equal(stops[2].stopType, 'delivery');
        assert.equal(stops[2].status, 'pending');
        assert.equal(stops[2].shipments.length, 1);
        assert.equal(stops[2].shipments[0].operation, 'delivery');
        assert.equal(stops[2].shipments[0].weightKg, 1500);

        // Stop 3: Ahmedabad (Delivery Carrier cargo 2000kg + Trader cargo 500kg)
        assert.equal(stops[3].stopName, 'StopCity-Ahmedabad');
        assert.equal(stops[3].stopType, 'delivery');
        assert.equal(stops[3].status, 'pending');
        assert.equal(stops[3].shipments.length, 2);
    });

    test('2. Transition Validation: Cannot jump from pending directly to completed', async () => {
        const res = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });

        assert.equal(res.status, 400);
        assert.match(res.body.message, /operational steps must be followed/i);
    });

    test('3. Transition Validation: Valid operational flow (pending -> en_route -> arrived -> in_progress -> completed)', async () => {
        // Step 1: Start en_route
        const r1 = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'en_route', notes: 'Departing origin yard' })
        });
        assert.equal(r1.status, 200);
        assert.equal(r1.body.stop.status, 'en_route');

        // Step 2: Record arrived
        const r2 = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'arrived' })
        });
        assert.equal(r2.status, 200);
        assert.equal(r2.body.stop.status, 'arrived');
        assert.ok(r2.body.stop.arrivedAt, 'Expected arrivedAt timestamp');

        // Step 3: Begin in_progress
        const r3 = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'in_progress', notes: 'Cargo loading under way' })
        });
        assert.equal(r3.status, 200);
        assert.equal(r3.body.stop.status, 'in_progress');

        // Step 4: Mark completed (Pickup completion)
        const r4 = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });
        assert.equal(r4.status, 200);
        assert.equal(r4.body.stop.status, 'completed');
        assert.ok(r4.body.stop.completedAt, 'Expected completedAt timestamp');

        // Onboard cargo should now reflect only the 2000kg picked up at Mumbai
        assert.equal(r4.body.currentLoadOnBoard, 2000);
        assert.equal(r4.body.stop.shipments[0].status, 'loaded');
    });

    test('4. Completed Stop Immutability: Completed stop cannot be reverted to pending or modified', async () => {
        const res = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'pending' })
        });

        assert.equal(res.status, 400);
        assert.match(res.body.message, /already completed and cannot be reverted/i);
    });

    test('5. Multi-Shipment Isolation: Stop 1 pickup affects only Stop 1 shipments', async () => {
        // Progress stop 1 (Surat) to completed
        await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'en_route' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'arrived' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' })
        });

        const completeRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });

        assert.equal(completeRes.status, 200);
        assert.equal(completeRes.body.stop.status, 'completed');

        // Loaded 2000kg (from Mumbai) + 1500kg (Absorbed truck) + 500kg (Trader) = 4000kg onboard
        assert.equal(completeRes.body.currentLoadOnBoard, 4000);

        // Verify stop 2 (Vadodara) delivery shipments are still pending and not marked delivered yet
        const stopsRes = await apiFetch(`${baseUrl}/driver/active-trip/stops`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        const stop2 = stopsRes.body.stops[2];
        assert.equal(stop2.status, 'pending');
        assert.equal(stop2.shipments[0].status, 'pending', 'Stop 2 shipment must remain pending');
    });

    test('6. Delivery Workflow with Partial Delivery & POD: Stop 2 (Vadodara)', async () => {
        // Move stop 2 to in_progress
        await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'en_route' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'arrived' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' })
        });

        // Submit delivery with POD (Recipient signature) and partial delivery (1000kg delivered out of 1500kg)
        const deliveryRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                recipient: {
                    name: 'Rajesh Warehouse Manager',
                    phone: '9822001122',
                    notes: 'Inspected dock 4'
                },
                proofOfDelivery: {
                    type: 'signature',
                    signatureData: 'BASE64_SIG_HASH'
                },
                shipmentUpdates: [
                    {
                        shipmentId: truckAbsorbed._id.toString(),
                        status: 'partial',
                        deliveredWeightKg: 1000,
                        failureReason: 'Consignee warehouse storage limit reached; remaining 500kg rejected'
                    }
                ]
            })
        });

        assert.equal(deliveryRes.status, 200);
        assert.equal(deliveryRes.body.stop.status, 'completed');

        // POD verification status must be driver_reported (never claiming verified from client report)
        assert.equal(deliveryRes.body.stop.proofOfDelivery.verificationStatus, 'driver_reported');
        assert.equal(deliveryRes.body.stop.recipient.name, 'Rajesh Warehouse Manager');

        // Shipment status should be partial
        const updatedShipment = deliveryRes.body.stop.shipments[0];
        assert.equal(updatedShipment.status, 'partial');
        assert.equal(updatedShipment.deliveredWeightKg, 1000);
        assert.equal(deliveryRes.body.totalDeliveredWeight, 1000);

        // Onboard load was 4000kg - 1000kg delivered = 3000kg remaining on board
        assert.equal(deliveryRes.body.currentLoadOnBoard, 3000);
    });

    test('7. Stop Failure Workflow: Requires failureReason', async () => {
        // Move stop 3 to en_route
        await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'en_route' })
        });

        // Fail without reason -> 400
        const failNoReason = await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed' })
        });
        assert.equal(failNoReason.status, 400);
        assert.match(failNoReason.body.message, /failureReason is required/i);

        // Fail with reason -> 200
        const failWithReason = await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'failed',
                failureReason: 'Consignee warehouse flooded due to heavy rain; gates shut'
            })
        });
        assert.equal(failWithReason.status, 200);
        assert.equal(failWithReason.body.stop.status, 'failed');
        assert.equal(failWithReason.body.stop.failureReason, 'Consignee warehouse flooded due to heavy rain; gates shut');
        assert.ok(failWithReason.body.stop.failedAt, 'Expected failedAt timestamp');

        // All stops now completed or failed -> lifecycleStatus should be completed
        assert.equal(failWithReason.body.lifecycleStatus, 'completed');
    });

    test('8. Authorization: Driver without assignment cannot access or modify stops', async () => {
        const getRes = await apiFetch(`${baseUrl}/driver/active-trip/stops`, {
            headers: { 'Authorization': `Bearer ${driverUnassignedToken}` }
        });
        assert.equal(getRes.status, 403);

        const postRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverUnassignedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'en_route' })
        });
        assert.equal(postRes.status, 403);
    });

    test('9. Admin Dispatch Oversight: GET /admin/trip-stops/:tripId returns full audit history', async () => {
        const res = await apiFetch(`${baseUrl}/admin/trip-stops/${consolidatedSchedule._id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.tripId, consolidatedSchedule._id.toString());
        assert.equal(res.body.stops.length, 4);

        // Verify stop 0 transitionHistory contains immutable audit trail
        const stop0 = res.body.stops[0];
        assert.ok(stop0.transitionHistory.length >= 4, 'Expected transition audit trail for stop 0');
        assert.equal(stop0.transitionHistory[0].fromStatus, 'pending');
        assert.equal(stop0.transitionHistory[0].toStatus, 'en_route');
        assert.equal(stop0.transitionHistory[0].driverName, 'Driver Vikram Carrier');
    });

    test('10. Trader Shipment Tracking: GET /trader/shipment-status/:traderRequestId provides private tracking', async () => {
        // Trader A views their own request
        const resA = await apiFetch(`${baseUrl}/trader/shipment-status/${traderReqA._id}`, {
            headers: { 'Authorization': `Bearer ${traderTokenA}` }
        });

        assert.equal(resA.status, 200);
        assert.equal(resA.body.traderRequestId, traderReqA._id.toString());
        assert.equal(resA.body.weightKg, 500);
        assert.equal(resA.body.carrierTruckLicensePlate, 'TEST-STOP-TRK-CARRIER');
        assert.ok(resA.body.milestones.length > 0);

        // Trader B attempts to access Trader A's request -> 403 Forbidden
        const resB = await apiFetch(`${baseUrl}/trader/shipment-status/${traderReqA._id}`, {
            headers: { 'Authorization': `Bearer ${traderTokenB}` }
        });
        assert.equal(resB.status, 403);
        assert.match(resB.body.message, /do not own this shipment/i);
    });
});
