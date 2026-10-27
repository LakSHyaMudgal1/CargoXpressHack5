const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const TransportCompany = require('../src/models/transportCompany');
const Admin = require('../src/models/admin');
const Trader = require('../src/models/trader');
const TraderRequest = require('../src/models/traderRequest');
const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const Driver = require('../src/models/driver');
const DriverAssignment = require('../src/models/driverAssignment');
const MergedSchedule = require('../src/models/mergedSchedule');
const MergeablePair = require('../src/models/mergeablePair');
const TripStopExecution = require('../src/models/tripStopExecution');
const DeliveryEvidence = require('../src/models/deliveryEvidence');

describe('Internal Merge APIs and Cross-Company Data Protection Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, companyB, adminUser, traderUser, traderUserB;
    let companyAToken, companyBToken, adminToken, traderToken, traderBToken;
    let truckA, routeA, driverA, assignmentA;
    let truckB, routeB, driverB, assignmentB;
    let mockMergedSchedule;

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
            TransportCompany.deleteMany({ emailId: /^test_merge_prot_/ }),
            Admin.deleteMany({ emailId: /^test_merge_admin/ }),
            Trader.deleteMany({ emailId: /^test_merge_trader/ }),
            TraderRequest.deleteMany({ source: /^ProtTraderCity-/ }),
            Truck.deleteMany({ licensePlate: /^TEST-PROT-/ }),
            Route.deleteMany({ source: /^ProtCity-/ }),
            Driver.deleteMany({ emailId: /^test_prot_driver_/ }),
            DriverAssignment.deleteMany({ notes: /^TEST-PROT-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-PROT-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-PROT-/ })
        ]);

        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;

        const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);

        // 1. Create Transport Company A and its fleet
        companyA = await TransportCompany.create({
            name: 'Apex Carriers Ltd',
            emailId: 'test_merge_prot_a@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-PROT-REG-A',
            address: 'Navi Mumbai, India'
        });

        // 2. Create Transport Company B and its fleet
        companyB = await TransportCompany.create({
            name: 'Beacon Logistics Inc',
            emailId: 'test_merge_prot_b@cargoxpress-test.com',
            password: hashedPassword,
            registrationNumber: 'TEST-PROT-REG-B',
            address: 'Pune, India'
        });

        // 3. Create Admin
        adminUser = await Admin.create({
            name: 'Super Dispatch Administrator',
            emailId: 'test_merge_admin@cargoxpress.com',
            password: hashedPassword,
            aadharNumber: '999988887777',
            address: 'Central Ops, India'
        });

        // 4. Create Trader User Alpha
        traderUser = await Trader.create({
            name: 'Verified Consignor Trader Alpha',
            emailId: 'test_merge_trader_a@cargoxpress-test.com',
            password: hashedPassword,
            aadharNumber: '112233445566',
            address: 'Surat, India'
        });

        // 5. Create Trader User Beta (for cross-trader data isolation tests)
        traderUserB = await Trader.create({
            name: 'Verified Consignor Trader Beta',
            emailId: 'test_merge_trader_b@cargoxpress-test.com',
            password: hashedPassword,
            aadharNumber: '998877665544',
            address: 'Vadodara, India'
        });

        companyAToken = await companyA.getJWT();
        companyBToken = await companyB.getJWT();
        adminToken = await adminUser.getJWT();
        traderToken = await traderUser.getJWT();
        traderBToken = await traderUserB.getJWT();

        // 4. Create Truck & Route for Company A
        truckA = await Truck.create({
            licensePlate: 'TEST-PROT-TRK-A',
            companyId: companyA._id,
            totalCapacity: 12000,
            currentLoad: [3000, 3000],
            remainingLoad: [9000, 9000]
        });

        routeA = await Route.create({
            truckId: truckA._id,
            source: 'ProtCity-Mumbai',
            destination: 'ProtCity-Surat',
            stops: ['ProtCity-Mumbai', 'ProtCity-Surat']
        });

        driverA = await Driver.create({
            name: 'Driver Alpha',
            emailId: 'test_prot_driver_a@cargoxpress-test.com',
            password: hashedPassword,
            phone: '9876543210',
            licenseNumber: 'DL-PROT-A-1234',
            companyId: companyA._id,
            status: 'active'
        });

        assignmentA = await DriverAssignment.create({
            driverId: driverA._id,
            truckId: truckA._id,
            companyId: companyA._id,
            status: 'active',
            notes: 'TEST-PROT-ASSIGN-A'
        });

        // 5. Create Truck & Route for Company B
        truckB = await Truck.create({
            licensePlate: 'TEST-PROT-TRK-B',
            companyId: companyB._id,
            totalCapacity: 8000,
            currentLoad: [2000, 2000],
            remainingLoad: [6000, 6000]
        });

        routeB = await Route.create({
            truckId: truckB._id,
            source: 'ProtCity-Pune',
            destination: 'ProtCity-Nashik',
            stops: ['ProtCity-Pune', 'ProtCity-Nashik']
        });

        driverB = await Driver.create({
            name: 'Driver Beta',
            emailId: 'test_prot_driver_b@cargoxpress-test.com',
            password: hashedPassword,
            phone: '9876543211',
            licenseNumber: 'DL-PROT-B-5678',
            companyId: companyB._id,
            status: 'active'
        });

        assignmentB = await DriverAssignment.create({
            driverId: driverB._id,
            truckId: truckB._id,
            companyId: companyB._id,
            status: 'active',
            notes: 'TEST-PROT-ASSIGN-B'
        });

        // 6. Seed an internal MergedSchedule containing Company A as carrier
        mockMergedSchedule = await MergedSchedule.create({
            transportationTruckId: truckA._id.toString(),
            transportationTruckLicensePlate: truckA.licensePlate,
            mergedFromTrucks: [
                {
                    id: truckA._id.toString(),
                    licensePlate: truckA.licensePlate,
                    companyId: companyA._id,
                    source: 'ProtCity-Mumbai',
                    destination: 'ProtCity-Surat',
                    stops: ['ProtCity-Mumbai', 'ProtCity-Surat'],
                    load: [3000, 3000],
                    role: 'carrier'
                }
            ],
            finalSource: 'ProtCity-Mumbai',
            finalDestination: 'ProtCity-Surat',
            stops: ['ProtCity-Mumbai', 'ProtCity-Surat'],
            finalCurrentLoad: [3000, 3000],
            finalRemainingLoad: [9000, 9000],
            totalCapacity: 12000,
            status: 'accepted'
        });
    });

    after(async () => {
        await Promise.all([
            TransportCompany.deleteMany({ emailId: /^test_merge_prot_/ }),
            Admin.deleteMany({ emailId: /^test_merge_admin/ }),
            Trader.deleteMany({ emailId: /^test_merge_trader/ }),
            TraderRequest.deleteMany({ source: /^ProtTraderCity-/ }),
            Truck.deleteMany({ licensePlate: /^TEST-PROT-/ }),
            Route.deleteMany({ source: /^ProtCity-/ }),
            Driver.deleteMany({ emailId: /^test_prot_driver_/ }),
            DriverAssignment.deleteMany({ notes: /^TEST-PROT-/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-PROT-/ }),
            MergeablePair.deleteMany({ truckOneLicensePlate: /^TEST-PROT-/ }),
            TripStopExecution.deleteMany({ truckLicensePlate: /^TEST-PROT-/ }),
            DeliveryEvidence.deleteMany({ evidenceId: /^EVID-PROT-/ })
        ]);

        if (server) {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise(resolve => server.close(resolve));
        }
        await mongoose.connection.close();
    });

    // ─── 1. RESTRICT INTERNAL MERGE ENDPOINTS FROM TRANSPORT COMPANY ─────────

    test('1. Company user is rejected from GET /mergeableSchedule with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergeableSchedule`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from viewing mergeable candidate pairs');
        assert.match(res.data.message, /Admin role required/i);
    });

    test('2. Company user is rejected from GET /mergedSchedule with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergedSchedule`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from viewing internal merged dispatches');
        assert.match(res.data.message, /Admin role required/i);
    });

    test('3. Company user is rejected from POST /acceptPair/:id with 403', async () => {
        const fakePairId = new mongoose.Types.ObjectId();
        const res = await apiFetch(`${baseUrl}/acceptPair/${fakePairId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from approving merge pairs');
    });

    test('4. Company user is rejected from DELETE /rejectPair/:id with 403', async () => {
        const fakePairId = new mongoose.Types.ObjectId();
        const res = await apiFetch(`${baseUrl}/rejectPair/${fakePairId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from rejecting merge pairs');
    });

    test('5. Company user is rejected from POST /mergeAllPairs with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergeAllPairs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from batch merge engine execution');
    });

    test('6. Company user is rejected from GET /mergedTrader with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergedTrader`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from viewing trader merge opportunities');
    });

    test('7. Company user is rejected from POST /acceptTrader with 403', async () => {
        const res = await apiFetch(`${baseUrl}/acceptTrader`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${companyAToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                traderRequestId: new mongoose.Types.ObjectId(),
                truckId: truckA._id
            })
        });
        assert.equal(res.status, 403, 'Company must be blocked from approving trader cargo merges');
    });

    test('8. Company user is rejected from GET /admin/fleet-overview with 403', async () => {
        const res = await apiFetch(`${baseUrl}/admin/fleet-overview`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from platform-wide fleet overview');
    });

    test('9. Company user is rejected from GET /admin/merge-decisions with 403', async () => {
        const res = await apiFetch(`${baseUrl}/admin/merge-decisions`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from admin merge decision logs');
    });

    test('10. Company user is rejected from GET /admin/trip-stops/:tripId with 403', async () => {
        const res = await apiFetch(`${baseUrl}/admin/trip-stops/${routeA._id}`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company must be blocked from central dispatch trip stop inspection');
    });

    test('11. Company user is rejected from driver-specific merge routes (/driver/merge-offers) with 403', async () => {
        const res = await apiFetch(`${baseUrl}/driver/merge-offers`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Company role cannot impersonate driver to access merge offers');
    });

    // ─── 2. PRESERVE COMPANY OPERATIONAL ACCESS & SANITIZE INTERNAL MERGES ───

    test('12. GET /company/fleet returns company trucks & authorized trips without leaking mergedSchedules', async () => {
        const res = await apiFetch(`${baseUrl}/company/fleet`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });

        assert.equal(res.status, 200, 'Company A can access its own fleet data');
        assert.ok(Array.isArray(res.data.trucks), 'Response must contain trucks array');
        assert.equal(res.data.trucks.length, 1);
        assert.equal(res.data.trucks[0].licensePlate, 'TEST-PROT-TRK-A');

        // Check stats
        assert.ok(res.data.stats, 'Response must contain stats');
        assert.equal(res.data.stats.totalTrucks, 1);
        assert.equal(res.data.stats.activeAssignments, 1);
        assert.equal(res.data.stats.activeTrips, 1);

        // Check authorized trips
        assert.ok(Array.isArray(res.data.authorizedTrips), 'Response must contain authorizedTrips array');
        assert.equal(res.data.authorizedTrips.length, 1);
        assert.equal(res.data.authorizedTrips[0].licensePlate, 'TEST-PROT-TRK-A');
        assert.equal(res.data.authorizedTrips[0].driver.name, 'Driver Alpha');
        assert.equal(res.data.authorizedTrips[0].route.source, 'ProtCity-Mumbai');

        // CRITICAL CHECK: mergedSchedules is NOT returned to the transport company!
        assert.equal(res.data.mergedSchedules, undefined, 'mergedSchedules must not be present in company fleet response');
    });

    test('13. Company A can legitimately retrieve its own trip details via GET /company/trip-details/:tripId', async () => {
        const res = await apiFetch(`${baseUrl}/company/trip-details/${routeA._id}`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });

        assert.equal(res.status, 200, 'Company A can fetch its own trip details');
        assert.equal(res.data.trip.licensePlate, 'TEST-PROT-TRK-A');
        assert.equal(res.data.trip.source, 'ProtCity-Mumbai');
        assert.equal(res.data.trip.destination, 'ProtCity-Surat');
        assert.equal(res.data.trip.driver.name, 'Driver Alpha');
    });

    // ─── 3. CROSS-COMPANY RESOURCE ISOLATION & OWNERSHIP VERIFICATION ────────

    test('14. Company B cannot retrieve Company A trip details via GET /company/trip-details/:tripId (403)', async () => {
        const res = await apiFetch(`${baseUrl}/company/trip-details/${routeA._id}`, {
            headers: { Authorization: `Bearer ${companyBToken}` }
        });

        assert.equal(res.status, 403, 'Company B must be denied access to Company A trip');
        assert.match(res.data.message, /do not own the vehicle/i);
    });

    test('15. Company B cannot query an internal MergedSchedule ID not belonging to its fleet (403)', async () => {
        const res = await apiFetch(`${baseUrl}/company/trip-details/${mockMergedSchedule._id}`, {
            headers: { Authorization: `Bearer ${companyBToken}` }
        });

        assert.equal(res.status, 403, 'Company B must be blocked from querying Company A merged schedule ID');
        assert.match(res.data.message, /not authorized/i);
    });

    test('16. Company B cannot unassign Company A driver via POST /driver/unassign (403)', async () => {
        const res = await apiFetch(`${baseUrl}/driver/unassign`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${companyBToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                driverId: driverA._id
            })
        });

        assert.equal(res.status, 403, 'Company B cannot unassign Company A driver');
        assert.match(res.data.message, /Cannot unassign a driver belonging to another company/i);
    });

    test('17. Company B cannot unassign Company A truck via POST /driver/unassign (403)', async () => {
        const res = await apiFetch(`${baseUrl}/driver/unassign`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${companyBToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                truckId: truckA._id
            })
        });

        assert.equal(res.status, 403, 'Company B cannot unassign Company A truck');
        assert.match(res.data.message, /Cannot unassign a truck belonging to another company/i);
    });

    // ─── 4. PRESERVE ADMIN ACCESS & ENGINE DATA INTEGRITY ────────────────────

    test('18. Admin maintains full monitoring and optimization access to /mergedSchedule and /mergeableSchedule', async () => {
        const resSched = await apiFetch(`${baseUrl}/mergedSchedule`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resSched.status, 200, 'Admin can access /mergedSchedule');
        assert.ok(Array.isArray(resSched.data.mergedSchedules), 'Admin receives mergedSchedules list');

        const resMergeable = await apiFetch(`${baseUrl}/mergeableSchedule`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resMergeable.status, 200, 'Admin can access /mergeableSchedule');
    });

    test('19. Admin retains central access to GET /admin/fleet-overview and /admin/trip-stops/:tripId', async () => {
        const resOverview = await apiFetch(`${baseUrl}/admin/fleet-overview`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resOverview.status, 200, 'Admin can access fleet overview');
        assert.ok(resOverview.data.metrics, 'Admin receives fleet overview metrics');

        const resStops = await apiFetch(`${baseUrl}/admin/trip-stops/${routeA._id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resStops.status, 200, 'Admin can inspect trip stops');
        assert.equal(resStops.data.truckLicensePlate, 'TEST-PROT-TRK-A');
    });

    test('20. Internal MergedSchedule records and engine collections remain intact', async () => {
        const schedDoc = await MergedSchedule.findById(mockMergedSchedule._id);
        assert.ok(schedDoc, 'MergedSchedule document was not deleted');
        assert.equal(schedDoc.status, 'accepted');
        assert.equal(schedDoc.transportationTruckLicensePlate, 'TEST-PROT-TRK-A');
    });

    // ─── 5. TRADER ROLE DISPATCH BLOCKING & OPERATIONAL PRESERVATION ─────────

    test('21. Trader user is rejected from GET /mergedSchedule with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergedSchedule`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(res.status, 403, 'Trader must be blocked from internal merged schedules');
        assert.match(res.data.message, /Admin role required/i);
    });

    test('22. Trader user is rejected from GET /mergeableSchedule with 403', async () => {
        const res = await apiFetch(`${baseUrl}/mergeableSchedule`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(res.status, 403, 'Trader must be blocked from merge candidate pairs');
        assert.match(res.data.message, /Admin role required/i);
    });

    test('23. Trader user is rejected from GET /admin/fleet-overview and /admin/trip-stops/:tripId with 403', async () => {
        const resOverview = await apiFetch(`${baseUrl}/admin/fleet-overview`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resOverview.status, 403, 'Trader must be blocked from central fleet overview');

        const resStops = await apiFetch(`${baseUrl}/admin/trip-stops/${routeA._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resStops.status, 403, 'Trader must be blocked from internal dispatch trip stops');
    });

    test('24. Trader user can legitimately post a consignment delivery request via POST /scheduleDelivery/traderRequest', async () => {
        const res = await apiFetch(`${baseUrl}/scheduleDelivery/traderRequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${traderToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: 'ProtTraderCity-Surat',
                destination: 'ProtTraderCity-Mumbai',
                stops: ['ProtTraderCity-Surat', 'ProtTraderCity-Mumbai'],
                load: [1500, 1500]
            })
        });

        assert.equal(res.status, 201, 'Trader can successfully submit consignment delivery request');
        const reqDoc = await TraderRequest.findOne({ source: 'ProtTraderCity-Surat' });
        assert.ok(reqDoc, 'TraderRequest record saved in MongoDB');
        assert.equal(reqDoc.requiredCapacity, 1500);
    });

    test('25. Trader user can view and track their own consignments via GET /trader/my-requests', async () => {
        const res = await apiFetch(`${baseUrl}/trader/my-requests`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });

        assert.equal(res.status, 200, 'Trader can view their own consignments and tracking');
        assert.ok(Array.isArray(res.data.requests), 'Response contains requests array');
        assert.equal(res.data.requests.length, 1);
        assert.equal(res.data.requests[0].source, 'ProtTraderCity-Surat');
        assert.equal(res.data.requests[0].destination, 'ProtTraderCity-Mumbai');
        assert.ok(Array.isArray(res.data.requests[0].milestones), 'Contains delivery tracking milestones');
        assert.ok(res.data.stats, 'Response contains consignments stats');
    });

    // ─── 6. UNAUTHORIZED REQUESTS & CROSS-TRADER DATA ISOLATION ─────────────

    test('26. Unauthenticated requests to dispatch APIs and tracking endpoints are rejected with 401', async () => {
        // Without Authorization header
        const resMergedSched = await apiFetch(`${baseUrl}/mergedSchedule`);
        assert.equal(resMergedSched.status, 401, 'Anonymous caller blocked from /mergedSchedule');

        const resMergeable = await apiFetch(`${baseUrl}/mergeableSchedule`);
        assert.equal(resMergeable.status, 401, 'Anonymous caller blocked from /mergeableSchedule');

        const resMergedTrader = await apiFetch(`${baseUrl}/mergedTrader`);
        assert.equal(resMergedTrader.status, 401, 'Anonymous caller blocked from /mergedTrader');

        const fakeId = new mongoose.Types.ObjectId();
        const resTracking = await apiFetch(`${baseUrl}/trader/shipment-status/${fakeId}`);
        assert.equal(resTracking.status, 401, 'Anonymous caller blocked from /trader/shipment-status');

        const resMyRequests = await apiFetch(`${baseUrl}/trader/my-requests`);
        assert.equal(resMyRequests.status, 401, 'Anonymous caller blocked from /trader/my-requests');
    });

    test('27. Trader user is rejected from internal trader merge actions (POST /acceptTrader, POST /rejectTrader, POST /mergeAllTraders) with 403', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const resAccept = await apiFetch(`${baseUrl}/acceptTrader`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${traderToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ traderRequestId: fakeId, truckId: truckA._id })
        });
        assert.equal(resAccept.status, 403, 'Trader blocked from /acceptTrader');

        const resReject = await apiFetch(`${baseUrl}/rejectTrader`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${traderToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ traderRequestId: fakeId })
        });
        assert.equal(resReject.status, 403, 'Trader blocked from /rejectTrader');

        const resMergeAll = await apiFetch(`${baseUrl}/mergeAllTraders`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resMergeAll.status, 403, 'Trader blocked from /mergeAllTraders');
    });

    test('28. Trader user is rejected from internal truck merge actions (POST /acceptPair, DELETE /rejectPair, POST /mergeAllPairs) with 403', async () => {
        const fakePairId = new mongoose.Types.ObjectId();
        const resAccept = await apiFetch(`${baseUrl}/acceptPair/${fakePairId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resAccept.status, 403, 'Trader blocked from /acceptPair');

        const resReject = await apiFetch(`${baseUrl}/rejectPair/${fakePairId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resReject.status, 403, 'Trader blocked from /rejectPair');

        const resMergeAll = await apiFetch(`${baseUrl}/mergeAllPairs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resMergeAll.status, 403, 'Trader blocked from /mergeAllPairs');
    });

    test('29. Transport carrier is rejected from GET /trader/shipment-status/:traderRequestId with 403', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await apiFetch(`${baseUrl}/trader/shipment-status/${fakeId}`, {
            headers: { Authorization: `Bearer ${companyAToken}` }
        });
        assert.equal(res.status, 403, 'Transport company blocked from trader shipment-status endpoint');
        assert.match(res.data.message, /Authorized trader or dispatch admin role required/i);
    });

    test('30. Cross-Trader Isolation: Trader B cannot access Trader A shipment tracking via GET /trader/shipment-status/:traderRequestId (403)', async () => {
        // Create a shipment request belonging strictly to Trader A
        const reqA = await TraderRequest.create({
            traderId: traderUser._id,
            source: 'ProtTraderCity-Surat-A',
            destination: 'ProtTraderCity-Mumbai-A',
            stops: ['ProtTraderCity-Surat-A', 'ProtTraderCity-Mumbai-A'],
            load: [2000, 2000],
            requiredCapacity: 2000
        });

        // Trader B attempts to query Trader A's request
        const resCrossAccess = await apiFetch(`${baseUrl}/trader/shipment-status/${reqA._id}`, {
            headers: { Authorization: `Bearer ${traderBToken}` }
        });

        assert.equal(resCrossAccess.status, 403, 'Cross-trader shipment status query must return 403');
        assert.match(resCrossAccess.data.message, /You do not own this shipment request/i);

        // Trader A can legitimately query their own request
        const resOwnAccess = await apiFetch(`${baseUrl}/trader/shipment-status/${reqA._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resOwnAccess.status, 200, 'Trader A can track their own consignment');
        assert.equal(resOwnAccess.data.source, 'ProtTraderCity-Surat-A');
        assert.equal(resOwnAccess.data.weightKg, 2000);
    });

    test('31. Cross-Trader Isolation: Trader B GET /trader/my-requests does not leak Trader A consignments', async () => {
        // Create a shipment for Trader B
        const reqB = await TraderRequest.create({
            traderId: traderUserB._id,
            source: 'ProtTraderCity-Vadodara-B',
            destination: 'ProtTraderCity-Pune-B',
            stops: ['ProtTraderCity-Vadodara-B', 'ProtTraderCity-Pune-B'],
            load: [3500, 3500],
            requiredCapacity: 3500
        });

        const resB = await apiFetch(`${baseUrl}/trader/my-requests`, {
            headers: { Authorization: `Bearer ${traderBToken}` }
        });

        assert.equal(resB.status, 200);
        assert.ok(Array.isArray(resB.data.requests));
        // Trader B only sees their own requests
        const returnedSources = resB.data.requests.map(r => r.source);
        assert.ok(returnedSources.includes('ProtTraderCity-Vadodara-B'), 'Trader B sees their own shipment');
        assert.ok(!returnedSources.includes('ProtTraderCity-Surat-A'), 'Trader B MUST NOT see Trader A shipment');
        assert.ok(!returnedSources.includes('ProtTraderCity-Surat'), 'Trader B MUST NOT see Trader A prior shipment');
    });

    test('32. Cross-Trader Isolation: Trader B cannot access Trader A delivery evidence via GET /driver/evidence/:evidenceId (403)', async () => {
        const reqA = await TraderRequest.findOne({ source: 'ProtTraderCity-Surat-A' });
        assert.ok(reqA, 'Trader A request exists');

        const evidenceDoc = await DeliveryEvidence.create({
            evidenceId: 'EVID-PROT-' + Date.now(),
            fileName: 'pod_sample.png',
            filePath: 'mock/path/pod_sample.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            tripId: routeA._id.toString(),
            truckId: truckA._id,
            driverId: driverA._id,
            stopIndex: 1,
            shipmentId: reqA._id.toString(),
            companyId: companyA._id,
            verificationStatus: 'driver_reported'
        });

        // Trader B attempts to access Trader A evidence
        const resB = await apiFetch(`${baseUrl}/driver/evidence/${evidenceDoc.evidenceId}`, {
            headers: { Authorization: `Bearer ${traderBToken}` }
        });
        assert.equal(resB.status, 403, 'Trader B denied access to Trader A delivery evidence');
        assert.match(resB.data.message, /not authorized to view this delivery evidence/i);
    });

    test('33. Admin functionality: Central dispatch administrator can track any shipment (Trader A and Trader B) via GET /trader/shipment-status/:traderRequestId', async () => {
        const reqA = await TraderRequest.findOne({ source: 'ProtTraderCity-Surat-A' });
        const reqB = await TraderRequest.findOne({ source: 'ProtTraderCity-Vadodara-B' });

        // Admin tracks Trader A's cargo
        const resAdminA = await apiFetch(`${baseUrl}/trader/shipment-status/${reqA._id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resAdminA.status, 200, 'Admin can track Trader A consignment from central dispatch');
        assert.equal(resAdminA.data.source, 'ProtTraderCity-Surat-A');

        // Admin tracks Trader B's cargo
        const resAdminB = await apiFetch(`${baseUrl}/trader/shipment-status/${reqB._id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(resAdminB.status, 200, 'Admin can track Trader B consignment from central dispatch');
        assert.equal(resAdminB.data.source, 'ProtTraderCity-Vadodara-B');
    });

    // ─── 7. TRADER SHIPMENT LIFECYCLE TRACKING ──────────────────────────────

    test('34. Trader Lifecycle: Initial consignment starts in pending_dispatch with initial milestone', async () => {
        const reqDoc = await TraderRequest.create({
            traderId: traderUser._id,
            source: 'ProtTraderCity-Lifecycle-Origin',
            destination: 'ProtTraderCity-Lifecycle-Dest',
            stops: ['ProtTraderCity-Lifecycle-Origin', 'ProtTraderCity-Lifecycle-Dest'],
            load: [4000, 4000],
            requiredCapacity: 4000
        });

        const res = await apiFetch(`${baseUrl}/trader/shipment-status/${reqDoc._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(res.data.status, 'pending_dispatch');
        assert.equal(res.data.statusLabel, 'Pending Truck Assignment & Dispatch');
        assert.equal(res.data.carrierTruckLicensePlate, null);
        assert.ok(Array.isArray(res.data.milestones));
        assert.equal(res.data.milestones.length, 1);
        assert.equal(res.data.milestones[0].event, 'Consignment Created');
        assert.equal(res.data.milestones[0].completed, true);
    });

    test('35. Trader Lifecycle: Assignment and transit transitions through pickup_in_progress and in_transit', async () => {
        const reqDoc = await TraderRequest.findOne({ source: 'ProtTraderCity-Lifecycle-Origin' });
        assert.ok(reqDoc);

        // Create a TripStopExecution with pickup and delivery stops
        const execution = await TripStopExecution.create({
            tripId: routeA._id.toString(),
            tripType: 'Route',
            truckId: truckA._id,
            truckLicensePlate: 'TEST-PROT-TRK-A',
            companyId: companyA._id,
            lifecycleStatus: 'in_transit',
            currentLoadOnBoard: 4000,
            totalDeliveredWeight: 0,
            stops: [
                {
                    stopIndex: 0,
                    stopName: 'ProtTraderCity-Lifecycle-Origin',
                    stopType: 'pickup',
                    status: 'in_progress', // truck arrived for pickup
                    shipments: [
                        {
                            shipmentId: reqDoc._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqDoc._id.toString().slice(-6)}`,
                            weightKg: 4000,
                            operation: 'pickup',
                            status: 'pending'
                        }
                    ]
                },
                {
                    stopIndex: 1,
                    stopName: 'ProtTraderCity-Lifecycle-Dest',
                    stopType: 'delivery',
                    status: 'pending',
                    shipments: [
                        {
                            shipmentId: reqDoc._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqDoc._id.toString().slice(-6)}`,
                            weightKg: 4000,
                            operation: 'delivery',
                            status: 'pending'
                        }
                    ]
                }
            ]
        });

        // Stage 1: Truck arrived for pickup
        const resPickup = await apiFetch(`${baseUrl}/trader/shipment-status/${reqDoc._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resPickup.status, 200);
        assert.equal(resPickup.data.status, 'pickup_in_progress');
        assert.equal(resPickup.data.statusLabel, 'Truck Arrived for Cargo Pickup');
        assert.equal(resPickup.data.carrierTruckLicensePlate, 'TEST-PROT-TRK-A');

        // Stage 2: Pickup completed, now on highway route
        execution.stops[0].status = 'completed';
        execution.stops[0].completedAt = new Date();
        await execution.save();

        const resTransit = await apiFetch(`${baseUrl}/trader/shipment-status/${reqDoc._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(resTransit.status, 200);
        assert.equal(resTransit.data.status, 'in_transit');
        assert.equal(resTransit.data.statusLabel, 'Picked Up & On Highway Route');
        assert.ok(resTransit.data.pickedUpAt);
    });

    test('36. Trader Lifecycle: Delivery completed with proof of delivery and milestone verification', async () => {
        const reqDoc = await TraderRequest.findOne({ source: 'ProtTraderCity-Lifecycle-Origin' });
        const execution = await TripStopExecution.findOne({
            'stops.shipments.shipmentId': reqDoc._id.toString()
        });
        assert.ok(execution);

        // Complete the delivery stop with proofOfDelivery
        execution.stops[1].status = 'completed';
        execution.stops[1].completedAt = new Date();
        execution.stops[1].proofOfDelivery = {
            type: 'otp',
            verificationStatus: 'verified',
            submittedAt: new Date()
        };
        await execution.save();

        const res = await apiFetch(`${baseUrl}/trader/shipment-status/${reqDoc._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });
        assert.equal(res.status, 200);
        assert.equal(res.data.status, 'delivered');
        assert.equal(res.data.statusLabel, 'Delivered to Destination');
        assert.ok(res.data.deliveredAt);
        assert.ok(res.data.proofOfDelivery);
        assert.equal(res.data.proofOfDelivery.type, 'otp');
        assert.equal(res.data.proofOfDelivery.verificationStatus, 'verified');

        // Check milestones progression
        assert.ok(res.data.milestones.length >= 3);
        const deliveryMilestone = res.data.milestones.find(m => m.stopType === 'delivery');
        assert.ok(deliveryMilestone);
        assert.equal(deliveryMilestone.completed, true);
        assert.equal(deliveryMilestone.status, 'completed');
    });

    test('37. Trader Lifecycle: Delivery exception transitions to delivery_failed with failure reason', async () => {
        // Create an exception scenario request
        const reqException = await TraderRequest.create({
            traderId: traderUser._id,
            source: 'ProtTraderCity-Exception-Origin',
            destination: 'ProtTraderCity-Exception-Dest',
            stops: ['ProtTraderCity-Exception-Origin', 'ProtTraderCity-Exception-Dest'],
            load: [1200, 1200],
            requiredCapacity: 1200
        });

        await TripStopExecution.create({
            tripId: routeB._id.toString(),
            tripType: 'Route',
            truckId: truckB._id,
            truckLicensePlate: 'TEST-PROT-TRK-B',
            companyId: companyB._id,
            lifecycleStatus: 'in_transit',
            currentLoadOnBoard: 1200,
            totalDeliveredWeight: 0,
            stops: [
                {
                    stopIndex: 0,
                    stopName: 'ProtTraderCity-Exception-Origin',
                    stopType: 'pickup',
                    status: 'completed',
                    completedAt: new Date(),
                    shipments: [
                        {
                            shipmentId: reqException._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqException._id.toString().slice(-6)}`,
                            weightKg: 1200,
                            operation: 'pickup',
                            status: 'picked_up'
                        }
                    ]
                },
                {
                    stopIndex: 1,
                    stopName: 'ProtTraderCity-Exception-Dest',
                    stopType: 'delivery',
                    status: 'failed',
                    failureReason: 'Consignee warehouse closed and recipient unreachable',
                    shipments: [
                        {
                            shipmentId: reqException._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqException._id.toString().slice(-6)}`,
                            weightKg: 1200,
                            operation: 'delivery',
                            status: 'failed',
                            failureReason: 'Consignee warehouse closed and recipient unreachable'
                        }
                    ]
                }
            ]
        });

        const res = await apiFetch(`${baseUrl}/trader/shipment-status/${reqException._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });

        assert.equal(res.status, 200);
        assert.equal(res.data.status, 'delivery_failed');
        assert.equal(res.data.statusLabel, 'Delivery Attempt Failed');
        const failedMilestone = res.data.milestones.find(m => m.stopType === 'delivery');
        assert.ok(failedMilestone);
        assert.equal(failedMilestone.completed, false);
        assert.match(failedMilestone.error, /Consignee warehouse closed/i);
    });

    test('38. Trader Lifecycle: Partial delivery progress tracking accurately reflects delivered & outstanding weight', async () => {
        // Create a consignment for partial delivery test
        const reqPartial = await TraderRequest.create({
            traderId: traderUser._id,
            source: 'ProtTraderCity-Partial-Origin',
            destination: 'ProtTraderCity-Partial-Dest',
            stops: ['ProtTraderCity-Partial-Origin', 'ProtTraderCity-Partial-Dest'],
            load: [2500, 2500],
            requiredCapacity: 2500
        });

        // Seed an execution where 1500 kg is delivered, leaving 1000 kg outstanding
        await TripStopExecution.create({
            tripId: routeA._id.toString(),
            tripType: 'Route',
            truckId: truckA._id,
            truckLicensePlate: 'TEST-PROT-TRK-A',
            companyId: companyA._id,
            lifecycleStatus: 'in_transit',
            currentLoadOnBoard: 1000,
            totalDeliveredWeight: 1500,
            stops: [
                {
                    stopIndex: 0,
                    stopName: 'ProtTraderCity-Partial-Origin',
                    stopType: 'pickup',
                    status: 'completed',
                    completedAt: new Date(),
                    shipments: [
                        {
                            shipmentId: reqPartial._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqPartial._id.toString().slice(-6)}`,
                            weightKg: 2500,
                            operation: 'pickup',
                            status: 'picked_up'
                        }
                    ]
                },
                {
                    stopIndex: 1,
                    stopName: 'ProtTraderCity-Partial-Dest',
                    stopType: 'delivery',
                    status: 'in_progress',
                    shipments: [
                        {
                            shipmentId: reqPartial._id.toString(),
                            shipmentType: 'trader_request',
                            reference: `REQ-${reqPartial._id.toString().slice(-6)}`,
                            weightKg: 2500,
                            deliveredWeightKg: 1500,
                            outstandingWeightKg: 1000,
                            operation: 'delivery',
                            status: 'partial',
                            failureReason: 'Customer warehouse could only receive first 1,500 kg batch today'
                        }
                    ]
                }
            ]
        });

        // 1. Check live shipment status endpoint
        const resStatus = await apiFetch(`${baseUrl}/trader/shipment-status/${reqPartial._id}`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });

        assert.equal(resStatus.status, 200);
        assert.equal(resStatus.data.status, 'partially_delivered');
        assert.match(resStatus.data.statusLabel, /Partially Delivered/i);
        assert.equal(resStatus.data.deliveredWeightKg, 1500);
        assert.equal(resStatus.data.outstandingWeightKg, 1000);

        // 2. Check trader consignments dashboard endpoint
        const resDashboard = await apiFetch(`${baseUrl}/trader/my-requests`, {
            headers: { Authorization: `Bearer ${traderToken}` }
        });

        assert.equal(resDashboard.status, 200);
        const myPartial = resDashboard.data.requests.find(r => r._id === reqPartial._id.toString());
        assert.ok(myPartial, 'Partial request present in trader requests list');
        assert.equal(myPartial.status, 'partially_delivered');
        assert.equal(myPartial.deliveredWeight, 1500);
        assert.equal(myPartial.outstandingWeight, 1000);
    });

    test('39. Existing consolidated schedules and shipment records remain intact and unchanged', async () => {
        // Verify mockMergedSchedule created in setup has not been modified or removed
        const sched = await MergedSchedule.findById(mockMergedSchedule._id);
        assert.ok(sched, 'MergedSchedule must remain in database');
        assert.equal(sched.status, 'accepted');
        assert.equal(sched.totalCapacity, 12000);
        assert.equal(sched.transportationTruckLicensePlate, 'TEST-PROT-TRK-A');
        assert.equal(sched.finalSource, 'ProtCity-Mumbai');
        assert.equal(sched.finalDestination, 'ProtCity-Surat');

        // Verify initial truck and route records remain intact
        const trk = await Truck.findById(truckA._id);
        assert.ok(trk, 'Truck record must remain in database');
        assert.equal(trk.licensePlate, 'TEST-PROT-TRK-A');

        const rt = await Route.findById(routeA._id);
        assert.ok(rt, 'Route record must remain in database');
        assert.equal(rt.source, 'ProtCity-Mumbai');
    });
});
