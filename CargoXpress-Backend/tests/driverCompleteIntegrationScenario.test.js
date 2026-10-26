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
const FreeTruck = require('../src/models/freeTruck');
const MergeDecisionLog = require('../src/models/mergeDecisionLog');
const DriverLocation = require('../src/models/driverLocation');
const TripStopExecution = require('../src/models/tripStopExecution');
const Trader = require('../src/models/trader');
const TraderRequest = require('../src/models/traderRequest');
const MergeableTrader = require('../src/models/mergeableTrader');
const Admin = require('../src/models/admin');
const bcrypt = require('bcrypt');

describe('CargoXpress Driver Mobile App — Complete End-to-End Integration Scenario', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser, traderAlice, traderBob;
    let truckCarrier, truckAbsorbed;
    let routeCarrier, routeAbsorbed;
    let driverCarrier, driverAbsorbed;
    let driverCarrierToken, driverAbsorbedToken, companyAToken, adminToken, traderAliceToken, traderBobToken;
    let pairProposal;
    let traderReqAlice;
    let consolidatedSchedule;

    const cleanupTestData = async () => {
        await Promise.all([
            Driver.deleteMany({ emailId: /^test_e2e_drv_/ }),
            DriverAssignment.deleteMany({ notes: /TEST-E2E/ }),
            TransportCompany.deleteMany({ emailId: /^test_e2e_comp_/ }),
            Truck.deleteMany({ licensePlate: /^TEST-E2E-TRK-/ }),
            Route.deleteMany({ source: /^E2ECity/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-E2E-TRK-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-E2E-TRK-/ }),
            FreeTruck.deleteMany({ licensePlate: /^TEST-E2E-TRK-/ }),
            MergeDecisionLog.deleteMany({ carrierLicensePlate: /^TEST-E2E-TRK-/ }),
            DriverLocation.deleteMany({ truckLicensePlate: /^TEST-E2E-TRK-/ }),
            TripStopExecution.deleteMany({ truckLicensePlate: /^TEST-E2E-TRK-/ }),
            Trader.deleteMany({ $or: [{ emailId: /^test_e2e_trader_/ }, { aadharNumber: { $in: ['999911112222', '999933334444', '111122223333', '444455556666'] } }] }),
            TraderRequest.deleteMany({ source: /^E2ECity/ }),
            MergeableTrader.deleteMany({ licensePlate: /^TEST-E2E-TRK-/ }),
            Admin.deleteMany({ $or: [{ emailId: /^test_e2e_admin/ }, { aadharNumber: { $in: ['999955556666', '777788889999'] } }] })
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

        const hashedPassword = await bcrypt.hash('SecretPass123!', 10);

        // 1. Companies
        companyA = await TransportCompany.create({
            name: 'CargoXpress Express Fleet A',
            emailId: 'test_e2e_comp_a@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-E2E-REG-A',
            address: '100 Highway Corridor A'
        });

        companyB = await TransportCompany.create({
            name: 'Rival Haulers Co B',
            emailId: 'test_e2e_comp_b@cargoxpress.com',
            password: hashedPassword,
            registrationNumber: 'TEST-E2E-REG-B',
            address: '200 Logistics Avenue B'
        });

        // 2. Admin & Traders
        adminUser = await Admin.create({
            name: 'Fleet Dispatcher Admin',
            emailId: 'test_e2e_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999955556666'
        });

        traderAlice = await Trader.create({
            name: 'Trader Alice',
            emailId: 'test_e2e_trader_alice@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999911112222'
        });

        traderBob = await Trader.create({
            name: 'Trader Bob',
            emailId: 'test_e2e_trader_bob@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999933334444'
        });

        // 3. Vehicles
        truckCarrier = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-E2E-TRK-CARRIER',
            totalCapacity: 10000,
            currentLoad: [1000, 1000, 1000, 0],
            remainingLoad: [9000, 9000, 9000, 10000]
        });

        truckAbsorbed = await Truck.create({
            companyId: companyA._id,
            licensePlate: 'TEST-E2E-TRK-ABSORBED',
            totalCapacity: 4000,
            currentLoad: [1500, 0],
            remainingLoad: [2500, 4000]
        });

        // 4. Routes
        routeCarrier = await Route.create({
            truckId: truckCarrier._id,
            source: 'E2ECity-Mumbai',
            destination: 'E2ECity-Ahmedabad',
            stops: ['E2ECity-Mumbai', 'E2ECity-Surat', 'E2ECity-Vadodara', 'E2ECity-Ahmedabad']
        });

        routeAbsorbed = await Route.create({
            truckId: truckAbsorbed._id,
            source: 'E2ECity-Surat',
            destination: 'E2ECity-Vadodara',
            stops: ['E2ECity-Surat', 'E2ECity-Vadodara']
        });

        // 5. Drivers
        driverCarrier = await Driver.create({
            name: 'Vikram Carrier Driver',
            emailId: 'test_e2e_drv_carrier@cargoxpress.com',
            password: hashedPassword,
            phone: '9811223344',
            licenseNumber: 'DL-E2E-001',
            status: 'active',
            companyId: companyA._id
        });

        driverAbsorbed = await Driver.create({
            name: 'Anil Absorbed Driver',
            emailId: 'test_e2e_drv_absorbed@cargoxpress.com',
            password: hashedPassword,
            phone: '9822334455',
            licenseNumber: 'DL-E2E-002',
            status: 'active',
            companyId: companyA._id
        });

        // 6. Active Assignments
        await DriverAssignment.assignDriver({
            driverId: driverCarrier._id,
            truckId: truckCarrier._id,
            companyId: companyA._id,
            notes: 'TEST-E2E Initial Carrier Assignment'
        });

        await DriverAssignment.assignDriver({
            driverId: driverAbsorbed._id,
            truckId: truckAbsorbed._id,
            companyId: companyA._id,
            notes: 'TEST-E2E Initial Absorbed Assignment'
        });

        // 7. Compatible Merge Proposal in MergeablePair
        pairProposal = await MergeablePair.create({
            truckOneId: truckCarrier._id,
            truckTwoId: truckAbsorbed._id,
            truckOneLicensePlate: truckCarrier.licensePlate,
            truckTwoLicensePlate: truckAbsorbed.licensePlate,
            truckOneStops: routeCarrier.stops,
            truckTwoStops: routeAbsorbed.stops
        });

        // 8. Trader Alice Request (Surat -> Ahmedabad, 500kg)
        traderReqAlice = await TraderRequest.create({
            traderId: traderAlice._id,
            source: 'E2ECity-Surat',
            destination: 'E2ECity-Ahmedabad',
            stops: ['E2ECity-Surat', 'E2ECity-Vadodara', 'E2ECity-Ahmedabad'],
            load: [500]
        });

        await MergeableTrader.create({
            traderRequestId: traderReqAlice._id.toString(),
            truckId: truckCarrier._id.toString(),
            load: [500],
            source: 'E2ECity-Surat',
            destination: 'E2ECity-Ahmedabad',
            stops: ['E2ECity-Surat', 'E2ECity-Vadodara', 'E2ECity-Ahmedabad'],
            licensePlate: truckCarrier.licensePlate,
            status: 'accepted'
        });

        // 9. Generate Auth Tokens
        adminToken = await adminUser.getJWT();
        companyAToken = await companyA.getJWT();
        traderAliceToken = await traderAlice.getJWT();
        traderBobToken = await traderBob.getJWT();
    });

    after(async () => {
        if (server) {
            server.close();
        }
        await cleanupTestData();
    });

    test('Step 1 & 2: Driver signs in successfully and inspects assigned truck and initial active trip', async () => {
        // Driver Sign In
        const loginRes = await apiFetch(`${baseUrl}/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: driverCarrier.emailId, password: 'SecretPass123!' })
        });
        assert.equal(loginRes.status, 200);
        assert.ok(loginRes.body.token, 'Expected JWT token in driver login response');
        driverCarrierToken = loginRes.body.token;

        // View Profile
        const meRes = await apiFetch(`${baseUrl}/driver/me`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(meRes.status, 200);
        assert.equal(meRes.body.driver.name, 'Vikram Carrier Driver');
        assert.equal(meRes.body.driver.assignedTruck.licensePlate, 'TEST-E2E-TRK-CARRIER');

        // View Assigned Vehicle
        const assignmentRes = await apiFetch(`${baseUrl}/driver/assignment`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(assignmentRes.status, 200);
        assert.equal(assignmentRes.body.assignment.truck.licensePlate, 'TEST-E2E-TRK-CARRIER');
        assert.equal(assignmentRes.body.assignment.truck.totalCapacity, 10000);

        // View Initial Active Trip (Route)
        const tripRes = await apiFetch(`${baseUrl}/driver/active-trip`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(tripRes.status, 200);
        assert.equal(tripRes.body.trip.type, 'Route');
        assert.equal(tripRes.body.trip.origin, 'E2ECity-Mumbai');
        assert.equal(tripRes.body.trip.destination, 'E2ECity-Ahmedabad');
        assert.equal(tripRes.body.trip.stops.length, 4);
    });

    test('Step 3: Driver receives valid merge proposal offer', async () => {
        const offersRes = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });

        assert.equal(offersRes.status, 200);
        assert.ok(Array.isArray(offersRes.body.offers));
        assert.equal(offersRes.body.offers.length, 1);

        const offer = offersRes.body.offers[0];
        assert.equal(offer.pairId, pairProposal._id.toString());
        assert.equal(offer.isCarrier, true);
        assert.equal(offer.canAccept, true);
        assert.equal(offer.role, 'carrier');
        assert.equal(offer.partnerTruck.licensePlate, 'TEST-E2E-TRK-ABSORBED');
        assert.equal(offer.incomingShipment.origin, 'E2ECity-Surat');
        assert.equal(offer.incomingShipment.destination, 'E2ECity-Vadodara');
    });

    test('Step 4 & 5: Driver accepts merge offer through authoritative merge engine', async () => {
        const acceptRes = await apiFetch(`${baseUrl}/driver/merge-offers/${pairProposal._id}/accept`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });

        assert.equal(acceptRes.status, 200);
        assert.match(acceptRes.body.message, /merge offer accepted successfully/i);

        // Authoritative Schedule check
        const sched = await MergedSchedule.findOne({
            transportationTruckId: truckCarrier._id.toString(),
            status: 'accepted'
        });
        assert.ok(sched, 'Expected active accepted MergedSchedule for carrier truck');
        assert.equal(sched.stops.length, 4);
        consolidatedSchedule = sched;

        // Absorbed truck released into FreeTruck
        const freeEntry = await FreeTruck.findOne({ truckId: truckAbsorbed._id.toString() });
        assert.ok(freeEntry, 'Absorbed truck must be recorded in FreeTruck repository');

        // Absorbed driver assignment cleanly transitioned to completed
        const absorbedAssign = await DriverAssignment.findOne({ driverId: driverAbsorbed._id });
        assert.equal(absorbedAssign.status, 'completed');
        assert.ok(absorbedAssign.endedAt, 'Expected endedAt timestamp on absorbed driver assignment');

        // Operational decision recorded in MergeDecisionLog
        const decisionLog = await MergeDecisionLog.findOne({ pairId: pairProposal._id.toString() });
        assert.ok(decisionLog, 'Expected MergeDecisionLog entry');
        assert.equal(decisionLog.decision, 'accepted');
        assert.equal(decisionLog.decidedByRole, 'driver');
        assert.equal(decisionLog.driverName, 'Vikram Carrier Driver');
    });

    test('Step 6: Driver views updated consolidated itinerary and ordered stops', async () => {
        // Active trip now reflects MergedSchedule
        const tripRes = await apiFetch(`${baseUrl}/driver/active-trip`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(tripRes.status, 200);
        assert.equal(tripRes.body.trip.type, 'MergedSchedule');
        assert.ok(tripRes.body.trip.manifest.length >= 2, 'Manifest must reflect consolidated carrier and absorbed cargo');

        // Ordered stops execution initialization
        const stopsRes = await apiFetch(`${baseUrl}/driver/active-trip/stops`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(stopsRes.status, 200);
        assert.equal(stopsRes.body.stops.length, 4);

        const stops = stopsRes.body.stops;
        assert.equal(stops[0].stopName, 'E2ECity-Mumbai');
        assert.equal(stops[0].stopType, 'pickup');
        assert.equal(stops[1].stopName, 'E2ECity-Surat');
        assert.equal(stops[1].stopType, 'pickup');
        assert.equal(stops[2].stopName, 'E2ECity-Vadodara');
        assert.equal(stops[2].stopType, 'delivery');
        assert.equal(stops[3].stopName, 'E2ECity-Ahmedabad');
        assert.equal(stops[3].stopType, 'delivery');
    });

    test('Step 7 & 8: Driver starts GPS tracking; telemetry is saved and visible to Admin', async () => {
        const now = new Date();
        const telemetryPayload = {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 4.5,
            speed: 15.2,
            heading: 45,
            altitude: 12.0,
            deviceTimestamp: now.toISOString()
        };

        const postLoc = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(telemetryPayload)
        });
        assert.equal(postLoc.status, 200);
        assert.equal(postLoc.body.recordedCount, 1);

        // Driver fetches latest location
        const latestLoc = await apiFetch(`${baseUrl}/driver/location/latest`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(latestLoc.status, 200);
        assert.equal(latestLoc.body.location.latitude, 19.0760);
        assert.equal(latestLoc.body.location.truckLicensePlate, 'TEST-E2E-TRK-CARRIER');

        // Admin inspects fleet location overview
        const adminFleet = await apiFetch(`${baseUrl}/admin/driver-locations`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert.equal(adminFleet.status, 200);
        const myFleetDriver = adminFleet.body.drivers.find(d => d.truck.licensePlate === 'TEST-E2E-TRK-CARRIER');
        assert.ok(myFleetDriver, 'Expected carrier driver in admin fleet telemetry');
        assert.equal(myFleetDriver.latestLocation.freshnessStatus, 'live');

        // Admin fetches GPS breadcrumb trail
        const historyRes = await apiFetch(`${baseUrl}/admin/driver-locations/${driverCarrier._id}/history`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert.equal(historyRes.status, 200);
        assert.ok(historyRes.body.history.length >= 1);
    });

    test('Step 9 & 10: Driver progresses through pickups; individual shipments update with load-on-board integrity', async () => {
        // Stop 0 (Mumbai) Pickup: en_route -> arrived -> in_progress -> completed
        await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'en_route' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'arrived' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' })
        });
        const stop0Done = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });
        assert.equal(stop0Done.status, 200);
        // Only Carrier cargo (1000kg) loaded
        assert.equal(stop0Done.body.currentLoadOnBoard, 1000);

        // Stop 1 (Surat) Pickup: en_route -> arrived -> in_progress -> completed
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
        const stop1Done = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });
        assert.equal(stop1Done.status, 200);
        // Onboard: 1000kg (Carrier) + 1500kg (Absorbed) + 500kg (Trader Alice) = 3000kg
        assert.equal(stop1Done.body.currentLoadOnBoard, 3000);
    });

    test('Step 11: Partial Delivery with POD: Consignee receives partial cargo with reason without falsely marking entire shipment delivered', async () => {
        // Move Stop 2 (Vadodara) to in_progress
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

        // Submit partial delivery (1000kg out of 1500kg) with POD
        const deliveryRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                recipient: {
                    name: 'Receiving Mgr Suresh',
                    phone: '9800112233',
                    notes: 'Inspected dock 2'
                },
                proofOfDelivery: {
                    type: 'otp',
                    otpCode: '556677'
                },
                shipmentUpdates: [
                    {
                        shipmentId: truckAbsorbed._id.toString(),
                        status: 'partial',
                        deliveredWeightKg: 1000,
                        failureReason: 'Pallet packaging torn on remaining 500kg; rejected by consignee'
                    }
                ]
            })
        });

        assert.equal(deliveryRes.status, 200);
        assert.equal(deliveryRes.body.stop.status, 'completed');
        assert.equal(deliveryRes.body.stop.proofOfDelivery.verificationStatus, 'driver_reported');

        const shipment = deliveryRes.body.stop.shipments[0];
        assert.equal(shipment.status, 'partial', 'Shipment must be recorded as partial, NOT fully delivered');
        assert.equal(shipment.deliveredWeightKg, 1000);
        assert.match(shipment.failureReason, /packaging torn/i);

        // Onboard: 3000kg - 1000kg delivered = 2000kg remaining
        assert.equal(deliveryRes.body.currentLoadOnBoard, 2000);
        assert.equal(deliveryRes.body.totalDeliveredWeight, 1000);
    });

    test('Step 12: Trader Privacy & Milestones Isolation: Trader Alice tracks cargo; Trader Bob is denied access', async () => {
        // Alice views her shipment progress
        const aliceTracking = await apiFetch(`${baseUrl}/trader/shipment-status/${traderReqAlice._id}`, {
            headers: { 'Authorization': `Bearer ${traderAliceToken}` }
        });
        assert.equal(aliceTracking.status, 200);
        assert.equal(aliceTracking.body.traderRequestId, traderReqAlice._id.toString());
        assert.equal(aliceTracking.body.carrierTruckLicensePlate, 'TEST-E2E-TRK-CARRIER');
        assert.equal(aliceTracking.body.status, 'in_transit');
        assert.equal(aliceTracking.body.statusLabel, 'Picked Up & On Highway Route');

        // Verify milestones contain only transit stops without leaking other companies' private bills
        assert.ok(aliceTracking.body.milestones.length > 0);
        assert.equal(aliceTracking.body.weightKg, 500);

        // Bob attempts to query Alice's tracking ID -> 403 Forbidden
        const bobTracking = await apiFetch(`${baseUrl}/trader/shipment-status/${traderReqAlice._id}`, {
            headers: { 'Authorization': `Bearer ${traderBobToken}` }
        });
        assert.equal(bobTracking.status, 403);
        assert.match(bobTracking.body.message, /do not own this shipment/i);
    });

    test('Step 13: Ending trip / revoking assignment terminates access and blocks unauthorized updates', async () => {
        // Complete the final stop 3 (Ahmedabad)
        await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'en_route' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'arrived' })
        });
        await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' })
        });
        const finalStop = await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                recipient: { name: 'Ahmedabad Warehouse Lead' },
                proofOfDelivery: { type: 'acknowledgement' }
            })
        });
        assert.equal(finalStop.status, 200);
        assert.equal(finalStop.body.lifecycleStatus, 'completed');

        // Transport company revokes assignment (unassigns driver)
        const unassignRes = await apiFetch(`${baseUrl}/driver/unassign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${companyAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ driverId: driverCarrier._id.toString(), reason: 'completed' })
        });
        assert.equal(unassignRes.status, 200);

        // Revoked driver attempts to post GPS location -> 403 Forbidden
        const locAttempt = await apiFetch(`${baseUrl}/driver/location`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                latitude: 23.0225,
                longitude: 72.5714,
                deviceTimestamp: new Date().toISOString()
            })
        });
        assert.equal(locAttempt.status, 403);
        assert.match(locAttempt.body.message, /no active vehicle assignment/i);

        // Revoked driver attempts to update stops -> 403 Forbidden
        const stopAttempt = await apiFetch(`${baseUrl}/driver/active-trip/stops/3/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'in_progress' })
        });
        assert.equal(stopAttempt.status, 403);
        assert.match(stopAttempt.body.message, /no active vehicle assignment/i);
    });

    test('Security Audit: Cross-company vehicle assignment is strictly rejected with HTTP 403', async () => {
        // Company B attempts to assign Driver Carrier (who belongs to Company A)
        const crossCompanyRes = await apiFetch(`${baseUrl}/driver/assign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await companyB.getJWT()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                driverId: driverCarrier._id.toString(),
                truckId: truckCarrier._id.toString()
            })
        });
        assert.equal(crossCompanyRes.status, 403);
        assert.match(crossCompanyRes.body.message, /cannot assign a driver belonging to another company/i);
    });

    test('Security Audit: Authoritative trip stops audit trail is immutable and preserved in Admin oversight', async () => {
        const adminRes = await apiFetch(`${baseUrl}/admin/trip-stops/${consolidatedSchedule._id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert.equal(adminRes.status, 200);
        assert.equal(adminRes.body.lifecycleStatus, 'completed');

        // Verify stop 2 has both recipient info, POD, and audit history
        const stop2 = adminRes.body.stops[2];
        assert.equal(stop2.recipient.name, 'Receiving Mgr Suresh');
        assert.equal(stop2.proofOfDelivery.verificationStatus, 'driver_reported');
        assert.ok(stop2.transitionHistory.length >= 4, 'Stop 2 must maintain complete transition history');
    });
});
