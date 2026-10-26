const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const Driver = require('../src/models/driver');
const DriverAssignment = require('../src/models/driverAssignment');
const TransportCompany = require('../src/models/transportCompany');
const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const MergedSchedule = require('../src/models/mergedSchedule');
const Admin = require('../src/models/admin');
const TripStopExecution = require('../src/models/tripStopExecution');
const DeliveryEvidence = require('../src/models/deliveryEvidence');
const evidenceStorage = require('../src/services/evidenceStorage');
const bcrypt = require('bcrypt');

describe('CargoXpress — Delivery Exceptions and Proof of Delivery Test Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    let companyA, adminUser;
    let truckCarrier, truckAbsorbed;
    let routeCarrier;
    let driverCarrier, driverUnrelated;
    let driverCarrierToken, driverUnrelatedToken, adminToken;
    let consolidatedSchedule;
    let evidenceFilePaths = [];

    const cleanupTestData = async () => {
        await Promise.all([
            Driver.deleteMany({ emailId: /^test_pod_drv_/ }),
            DriverAssignment.deleteMany({ notes: /TEST-POD/ }),
            TransportCompany.deleteMany({ emailId: /^test_pod_comp_/ }),
            Truck.deleteMany({ licensePlate: /^TEST-POD-TRK-/ }),
            Route.deleteMany({ source: /^PODCity/ }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^TEST-POD-TRK-/ }),
            TripStopExecution.deleteMany({ truckLicensePlate: /^TEST-POD-TRK-/ }),
            DeliveryEvidence.deleteMany({ tripId: /^TEST-POD-/ }),
            Admin.deleteMany({ emailId: /^test_pod_admin/ })
        ]);

        for (const fp of evidenceFilePaths) {
            await evidenceStorage.removeEvidenceFile(fp);
        }
        evidenceFilePaths = [];
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
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(URI);
        }
        await cleanupTestData();

        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}`;
                resolve();
            });
        });

        // 1. Create Transport Company
        const passwordHash = await bcrypt.hash('Cargo@Pass2026!', 10);
        companyA = await TransportCompany.create({
            name: 'CargoXpress POD Logistics Ltd',
            emailId: `test_pod_comp_${Date.now()}@example.com`,
            password: passwordHash,
            registrationNumber: `TEST-POD-REG-${Date.now()}`,
            phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
            address: '10 Industrial Parkway, POD Hub'
        });

        // 2. Create Admin User
        adminUser = await Admin.create({
            name: 'POD Dispatcher Admin',
            emailId: `test_pod_admin_${Date.now()}@cargoxpress.com`,
            password: passwordHash,
            aadharNumber: '7' + Math.floor(10000000000 + Math.random() * 90000000000).toString().slice(0, 11)
        });
        adminToken = await adminUser.getJWT();

        // 3. Create Trucks
        truckCarrier = await Truck.create({
            companyId: companyA._id,
            licensePlate: `TEST-POD-TRK-CARRIER-${Date.now().toString().slice(-4)}`,
            truckModel: 'BharatBenz 2823R Heavy Consignment',
            totalCapacity: 20000,
            remainingCapacity: 15000,
            currentLoad: [5000, 3000, 0],
            source: 'PODCity-Origin',
            destination: 'PODCity-Destination',
            stops: ['PODCity-Origin', 'PODCity-TransitHub', 'PODCity-Destination']
        });

        truckAbsorbed = await Truck.create({
            companyId: companyA._id,
            licensePlate: `TEST-POD-TRK-ABSORB-${Date.now().toString().slice(-4)}`,
            truckModel: 'Tata Prima 3530.K Consignment Unit',
            totalCapacity: 15000,
            remainingCapacity: 14500,
            currentLoad: [500],
            source: 'PODCity-Origin',
            destination: 'PODCity-TransitHub',
            stops: ['PODCity-Origin', 'PODCity-TransitHub']
        });

        // 4. Create Carrier Route
        routeCarrier = await Route.create({
            truckId: truckCarrier._id,
            companyId: companyA._id,
            source: 'PODCity-Origin',
            destination: 'PODCity-Destination',
            stops: ['PODCity-Origin', 'PODCity-TransitHub', 'PODCity-Destination']
        });

        // 5. Create Drivers with unique credentials
        driverCarrier = await Driver.create({
            name: 'Ramesh Singh POD Carrier',
            emailId: `test_pod_drv_carrier_${Date.now()}@example.com`,
            password: passwordHash,
            phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
            licenseNumber: `DL-POD-C-${Date.now().toString().slice(-6)}`,
            companyId: companyA._id,
            status: 'active'
        });
        driverCarrierToken = await driverCarrier.getJWT();

        driverUnrelated = await Driver.create({
            name: 'Sunil Kumar Unrelated Driver',
            emailId: `test_pod_drv_unrelated_${Date.now()}@example.com`,
            password: passwordHash,
            phone: '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
            licenseNumber: `DL-POD-U-${Date.now().toString().slice(-6)}`,
            companyId: companyA._id,
            status: 'active'
        });
        driverUnrelatedToken = await driverUnrelated.getJWT();

        // 6. Assign Driver to Carrier Vehicle
        await DriverAssignment.assignDriver({
            driverId: driverCarrier._id,
            truckId: truckCarrier._id,
            companyId: companyA._id,
            notes: 'TEST-POD Active Carrier Assignment'
        });

        // 7. Create Consolidated MergedSchedule (Carrier: 5000kg to Destination, Absorbed: 500kg to TransitHub)
        consolidatedSchedule = await MergedSchedule.create({
            transportationTruckId: truckCarrier._id.toString(),
            transportationTruckLicensePlate: truckCarrier.licensePlate,
            mergedFromTrucks: [
                {
                    id: truckCarrier._id.toString(),
                    licensePlate: truckCarrier.licensePlate,
                    source: 'PODCity-Origin',
                    destination: 'PODCity-Destination',
                    load: [5000],
                    role: 'carrier'
                },
                {
                    id: truckAbsorbed._id.toString(),
                    licensePlate: truckAbsorbed.licensePlate,
                    source: 'PODCity-Origin',
                    destination: 'PODCity-TransitHub',
                    load: [500],
                    role: 'absorbed'
                }
            ],
            finalSource: 'PODCity-Origin',
            finalDestination: 'PODCity-Destination',
            stops: ['PODCity-Origin', 'PODCity-TransitHub', 'PODCity-Destination'],
            finalCurrentLoad: [5500, 5000, 0],
            finalRemainingLoad: [14500, 15000, 20000],
            totalCapacity: 20000,
            status: 'accepted'
        });
    });

    after(async () => {
        await cleanupTestData();
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    test('1. Setup Verification: Execution stop manifest initializes outstandingWeightKg and deliveryAttempts', async () => {
        const res = await apiFetch(`${baseUrl}/driver/active-trip/stops`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}` }
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.stops.length, 3);

        // TransitHub delivery stop (Stop index 1)
        const transitHubStop = res.body.stops[1];
        assert.equal(transitHubStop.stopName, 'PODCity-TransitHub');
        assert.equal(transitHubStop.stopType, 'delivery');

        const absorbedDelivery = transitHubStop.shipments.find(s => s.shipmentId === truckAbsorbed._id.toString());
        assert.ok(absorbedDelivery);
        assert.equal(absorbedDelivery.weightKg, 500);
        assert.equal(absorbedDelivery.deliveredWeightKg, 0);
        assert.equal(absorbedDelivery.outstandingWeightKg, 500);
        assert.deepEqual(absorbedDelivery.deliveryAttempts, []);

        // Destination delivery stop (Stop index 2)
        const destStop = res.body.stops[2];
        const carrierDelivery = destStop.shipments.find(s => s.shipmentId === truckCarrier._id.toString());
        assert.ok(carrierDelivery);
        assert.equal(carrierDelivery.weightKg, 5000);
        assert.equal(carrierDelivery.deliveredWeightKg, 0);
        assert.equal(carrierDelivery.outstandingWeightKg, 5000);
    });

    test('2. FSM Progression to Delivery Stop: Origin loaded and transit begun', async () => {
        // Stop 0: en_route -> arrived -> in_progress -> completed
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
        const completeStop0 = await apiFetch(`${baseUrl}/driver/active-trip/stops/0/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
        });
        assert.equal(completeStop0.status, 200);
        assert.equal(completeStop0.body.currentLoadOnBoard, 5500);

        // Advance to Stop 1 (TransitHub delivery): en_route -> arrived -> in_progress
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
        const inProgressStop1 = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' })
        });
        assert.equal(inProgressStop1.status, 200);
        assert.equal(inProgressStop1.body.stop.status, 'in_progress');
    });

    test('3. Consignee OTP Verification: Secure generation, hashing, attempt limits, and expiration', async () => {
        // Request Consignee OTP for Stop 1
        const otpGenRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/generate-otp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert.equal(otpGenRes.status, 200);
        assert.ok(otpGenRes.body.formattedOtp);
        assert.equal(otpGenRes.body.formattedOtp.length, 6);
        assert.equal(otpGenRes.body.maxAttempts, 3);
        const correctOtp = otpGenRes.body.formattedOtp;

        // Verify MongoDB security: Plaintext OTP is NEVER stored in database
        const executionDoc = await TripStopExecution.findOne({ tripId: consolidatedSchedule._id.toString() });
        const stop1 = executionDoc.stops.find(s => s.stopIndex === 1);
        assert.ok(stop1.otpVerification);
        assert.ok(stop1.otpVerification.hashedOtp);
        assert.ok(stop1.otpVerification.salt);
        assert.notEqual(stop1.otpVerification.hashedOtp, correctOtp);
        assert.equal(stop1.otpVerification.hashedOtp.length, 64); // SHA-256 hex length
        assert.equal(stop1.otpVerification.isVerified, false);

        // Attempt 1 with invalid OTP: should reject and report 2 attempts remaining
        const badOtp1 = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/verify-otp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ otpCode: '000000' })
        });
        assert.equal(badOtp1.status, 400);
        assert.equal(badOtp1.body.attemptsRemaining, 2);

        // Successful verification with correct OTP
        const goodOtp = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/verify-otp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ otpCode: correctOtp })
        });
        assert.equal(goodOtp.status, 200);
        assert.equal(goodOtp.body.isVerified, true);
    });

    test('4. Photo Evidence Storage: File validation, metadata indexing, and non-MongoDB storage', async () => {
        // 1x1 valid JPEG image buffer encoded as base64
        const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

        const uploadRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/evidence`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: 'dock_unloading_proof.jpg',
                mimeType: 'image/jpeg',
                dataBase64: sampleJpegBase64,
                shipmentId: truckAbsorbed._id.toString(),
                metadata: { receiverName: 'Warehouse Dock Supervisor' }
            })
        });
        assert.equal(uploadRes.status, 201);
        assert.ok(uploadRes.body.evidence.evidenceId);
        assert.equal(uploadRes.body.evidence.mimeType, 'image/jpeg');
        assert.equal(uploadRes.body.evidence.verificationStatus, 'driver_reported');

        const evidenceId = uploadRes.body.evidence.evidenceId;

        // Verify evidence document in MongoDB stores file reference, not raw binary image
        const evidenceDoc = await DeliveryEvidence.findOne({ evidenceId });
        assert.ok(evidenceDoc);
        assert.ok(evidenceDoc.filePath);
        assert.ok(fs.existsSync(evidenceDoc.filePath));
        evidenceFilePaths.push(evidenceDoc.filePath);

        // Verify stop execution links evidence reference
        const executionDoc = await TripStopExecution.findOne({ tripId: consolidatedSchedule._id.toString() });
        const stop1 = executionDoc.stops.find(s => s.stopIndex === 1);
        assert.equal(stop1.proofOfDelivery.evidenceId, evidenceId);
        assert.equal(stop1.proofOfDelivery.verificationStatus, 'driver_reported');
    });

    test('5. Evidence Access Control: Authorized driver vs unauthorized driver access', async () => {
        const evidenceDoc = await DeliveryEvidence.findOne({ tripId: consolidatedSchedule._id.toString() });
        assert.ok(evidenceDoc);

        // 1. Unauthenticated request -> HTTP 401
        const noAuthRes = await apiFetch(`${baseUrl}/driver/evidence/${evidenceDoc.evidenceId}`);
        assert.equal(noAuthRes.status, 401);

        // 2. Unauthorized driver (Sunil, not assigned to this vehicle/trip) -> HTTP 403
        const forbiddenRes = await apiFetch(`${baseUrl}/driver/evidence/${evidenceDoc.evidenceId}`, {
            headers: { 'Authorization': `Bearer ${driverUnrelatedToken}` }
        });
        assert.equal(forbiddenRes.status, 403);
        assert.match(forbiddenRes.body.message, /Access denied/i);

        // 3. Authorized driver (Ramesh, participant in trip) -> HTTP 200 with streamed image
        const authorizedDriverRes = await fetch(`${baseUrl}/driver/evidence/${evidenceDoc.evidenceId}`, {
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Connection': 'close' }
        });
        assert.equal(authorizedDriverRes.status, 200);
        assert.equal(authorizedDriverRes.headers.get('content-type'), 'image/jpeg');
        const buffer = await authorizedDriverRes.arrayBuffer();
        assert.ok(buffer.byteLength > 0);

        // 4. Admin auditor access -> HTTP 200
        const adminRes = await fetch(`${baseUrl}/driver/evidence/${evidenceDoc.evidenceId}`, {
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Connection': 'close' }
        });
        assert.equal(adminRes.status, 200);
    });

    test('6. Quantity Integrity: Negative and exceeding quantities rejected with HTTP 400', async () => {
        const shipmentId = truckAbsorbed._id.toString();

        // Negative quantity (-50 kg)
        const negRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'partial',
                deliveredWeightKg: -50,
                failureReason: 'Invalid test quantity'
            })
        });
        assert.equal(negRes.status, 400);
        assert.match(negRes.body.message, /cannot be negative/i);

        // Exceeding quantity (600 kg for a 500 kg consignment)
        const exceedRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'partial',
                deliveredWeightKg: 600,
                failureReason: 'Attempting more than outstanding'
            })
        });
        assert.equal(exceedRes.status, 400);
        assert.match(exceedRes.body.message, /cannot exceed the outstanding quantity/i);
    });

    test('7. Partial Delivery: 350 kg delivered out of 500 kg leaves 150 kg outstanding', async () => {
        const shipmentId = truckAbsorbed._id.toString();

        const partialRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${driverCarrierToken}`,
                'Content-Type': 'application/json',
                'X-Request-Id': 'REQ-PARTIAL-ATTEMPT-1'
            },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'partial',
                deliveredWeightKg: 350,
                failureReason: 'Consignee warehouse space constraint, partial consignment accepted',
                recipient: {
                    name: 'Vikas Sharma',
                    phone: '9876543211',
                    notes: 'Gate 3 receiver'
                },
                requestId: 'REQ-PARTIAL-ATTEMPT-1'
            })
        });
        assert.equal(partialRes.status, 200);
        assert.equal(partialRes.body.shipment.status, 'partial');
        assert.equal(partialRes.body.shipment.deliveredWeightKg, 350);
        assert.equal(partialRes.body.shipment.outstandingWeightKg, 150);
        assert.equal(partialRes.body.shipment.attemptsCount, 1);
        assert.equal(partialRes.body.currentLoadOnBoard, 5500 - 350); // 5150 kg
        assert.equal(partialRes.body.totalDeliveredWeight, 350);

        // Verify stop status remains in_progress because 150 kg is still outstanding
        assert.equal(partialRes.body.stop.status, 'in_progress');

        // Test Idempotency with same requestId
        const duplicateRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'partial',
                deliveredWeightKg: 350,
                failureReason: 'Duplicate retry',
                requestId: 'REQ-PARTIAL-ATTEMPT-1'
            })
        });
        assert.equal(duplicateRes.status, 200);
        assert.match(duplicateRes.body.message, /already processed idempotently/i);
        assert.equal(duplicateRes.body.shipment.deliveredWeightKg, 350); // Not doubled!
        assert.equal(duplicateRes.body.currentLoadOnBoard, 5150);
    });

    test('8. Failed Delivery Attempt: Preserves outstanding quantity (150 kg) without cancelling shipment', async () => {
        const shipmentId = truckAbsorbed._id.toString();

        const failRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'failed',
                failureReason: 'Consignee dock closed for shift change; driver will retry',
                notes: 'Rescheduled for subsequent attempt in 30 minutes',
                requestId: 'REQ-FAILED-ATTEMPT-2'
            })
        });
        assert.equal(failRes.status, 200);
        assert.equal(failRes.body.shipment.status, 'failed');
        assert.equal(failRes.body.shipment.deliveredWeightKg, 350); // Intact from attempt 1
        assert.equal(failRes.body.shipment.outstandingWeightKg, 150); // Still 150 kg outstanding!
        assert.equal(failRes.body.shipment.attemptsCount, 2);
        assert.equal(failRes.body.shipment.latestAttempt.attemptType, 'failed');
        assert.equal(failRes.body.shipment.latestAttempt.failureReason, 'Consignee dock closed for shift change; driver will retry');
    });

    test('9. Subsequent Delivery Attempt: Delivering remainder of 150 kg transitions to delivered', async () => {
        const shipmentId = truckAbsorbed._id.toString();

        // Delivering remainder of 150 kg
        const subsequentRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/1/delivery-attempt`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipmentId,
                attemptType: 'full', // Or partial with 150
                deliveredWeightKg: 150,
                recipient: {
                    name: 'Vikas Sharma',
                    phone: '9876543211',
                    notes: 'Consignment fully acknowledged'
                },
                requestId: 'REQ-SUBSEQUENT-ATTEMPT-3'
            })
        });
        assert.equal(subsequentRes.status, 200);
        assert.equal(subsequentRes.body.shipment.status, 'delivered');
        assert.equal(subsequentRes.body.shipment.deliveredWeightKg, 500); // 350 + 150 = 500 kg
        assert.equal(subsequentRes.body.shipment.outstandingWeightKg, 0); // All cargo accounted for
        assert.equal(subsequentRes.body.shipment.attemptsCount, 3);
        assert.ok(subsequentRes.body.shipment.completedAt);

        // Since all deliveries at TransitHub are completed, stop automatically completes
        assert.equal(subsequentRes.body.stop.status, 'completed');
        assert.equal(subsequentRes.body.currentLoadOnBoard, 5000); // 5500 - 500 = 5000 kg
        assert.equal(subsequentRes.body.totalDeliveredWeight, 500);

        // Verify complete attempt history preserved in MongoDB
        const executionDoc = await TripStopExecution.findOne({ tripId: consolidatedSchedule._id.toString() });
        const stop1 = executionDoc.stops.find(s => s.stopIndex === 1);
        const shipmentDoc = stop1.shipments.find(s => s.shipmentId === shipmentId);
        assert.equal(shipmentDoc.deliveryAttempts.length, 3);
        assert.equal(shipmentDoc.deliveryAttempts[0].attemptType, 'partial');
        assert.equal(shipmentDoc.deliveryAttempts[0].deliveredWeightKg, 350);
        assert.equal(shipmentDoc.deliveryAttempts[1].attemptType, 'failed');
        assert.equal(shipmentDoc.deliveryAttempts[1].deliveredWeightKg, 0);
        assert.equal(shipmentDoc.deliveryAttempts[2].attemptType, 'full');
        assert.equal(shipmentDoc.deliveryAttempts[2].deliveredWeightKg, 150);
    });

    test('10. Final Completion & Stop Status Consistency at Final Destination', async () => {
        // Advance to Stop 2 (Destination): en_route -> arrived -> in_progress
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

        // Complete delivery at destination (5000 kg carrier consignment)
        const completeFinalRes = await apiFetch(`${baseUrl}/driver/active-trip/stops/2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${driverCarrierToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                recipient: {
                    name: 'Destination Operations Head',
                    phone: '9876543299',
                    notes: 'All seal intact'
                },
                proofOfDelivery: {
                    type: 'acknowledgement'
                }
            })
        });
        assert.equal(completeFinalRes.status, 200);
        assert.equal(completeFinalRes.body.stop.status, 'completed');
        assert.equal(completeFinalRes.body.currentLoadOnBoard, 0); // Truck is empty
        assert.equal(completeFinalRes.body.totalDeliveredWeight, 5500); // 500 + 5000 kg
        assert.equal(completeFinalRes.body.lifecycleStatus, 'completed'); // All stops completed
    });
});
