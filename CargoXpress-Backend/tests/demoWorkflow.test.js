const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const Truck = require('../src/models/truck');
const Route = require('../src/models/route');
const Driver = require('../src/models/driver');
const DriverAssignment = require('../src/models/driverAssignment');
const MergedSchedule = require('../src/models/mergedSchedule');
const MergeablePair = require('../src/models/mergeablePair');
const TripStopExecution = require('../src/models/tripStopExecution');

describe('Interactive Product Demo and Showcase Mode API Suite', () => {
    const URI = process.env.MONGODB_STRING;
    let server;
    let baseUrl;

    const apiFetch = async (url, options = {}) => {
        const headers = { Connection: 'close', 'Content-Type': 'application/json', ...(options.headers || {}) };
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
        if (mongoose.connection.readyState === 0 && URI) {
            await mongoose.connect(URI);
        }
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        // Safe prune of any lingering DEMO- records
        await Promise.all([
            Truck.deleteMany({ licensePlate: /^DEMO-/ }),
            Route.deleteMany({ path: { $regex: /DEMO/i } }),
            Driver.deleteMany({ emailId: /^demo-.*@cargoxpress\.com$/ }),
            DriverAssignment.deleteMany({ notes: /DEMO/i }),
            MergeablePair.deleteMany({
                $or: [
                    { truckOneLicensePlate: /^DEMO-/ },
                    { truckTwoLicensePlate: /^DEMO-/ }
                ]
            }),
            MergedSchedule.deleteMany({ transportationTruckLicensePlate: /^DEMO-/ }),
            TripStopExecution.deleteMany({ truckLicensePlate: /^DEMO-/ })
        ]).catch(() => {});

        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    test('1. GET /demo/status returns initialized status and step count', async () => {
        const res = await apiFetch(`${baseUrl}/demo/status`);
        assert.equal(res.status, 200);
        assert.ok(typeof res.data.currentStep === 'number');
        assert.ok(res.data.metrics);
        assert.equal(res.data.isInitialized !== undefined, true);
    });

    test('2. POST /demo/setup initializes isolated DEMO- trucks, driver, and generates candidate pair', async () => {
        const res = await apiFetch(`${baseUrl}/demo/setup`, { method: 'POST' });
        assert.equal(res.status, 200);
        assert.equal(res.data.step, 1);
        assert.ok(res.data.truckA);
        assert.equal(res.data.truckA.licensePlate, 'DEMO-TRUCK-A');
        assert.equal(res.data.truckB.licensePlate, 'DEMO-TRUCK-B');

        // Verify isolation: Trucks created begin with DEMO-
        const demoTrucks = await Truck.find({ licensePlate: /^DEMO-/ });
        assert.equal(demoTrucks.length, 2);
    });

    test('3. POST /demo/first-merge accepts merge between Truck A and Truck B with real backend logic', async () => {
        const res = await apiFetch(`${baseUrl}/demo/first-merge`, { method: 'POST' });
        assert.equal(res.status, 200);
        assert.equal(res.data.step, 2);
        assert.ok(res.data.mergedSchedule);
        assert.equal(res.data.freedTruck, 'DEMO-TRUCK-B');

        // Verify Truck B is now registered in the FreeTruck standby pool
        const FreeTruck = require('../src/models/freeTruck');
        const freedB = await FreeTruck.findOne({ licensePlate: 'DEMO-TRUCK-B' });
        assert.ok(freedB);
        assert.equal(freedB.licensePlate, 'DEMO-TRUCK-B');
    });

    test('4. POST /demo/stage-truck-c registers 3rd truck and generates multi-stage merge pair', async () => {
        const res = await apiFetch(`${baseUrl}/demo/stage-truck-c`, { method: 'POST' });
        assert.equal(res.status, 200);
        assert.equal(res.data.step, 3);
        assert.equal(res.data.truckC.licensePlate, 'DEMO-TRUCK-C');
    });

    test('5. POST /demo/driver-advance progresses driver execution through stops with verified POD', async () => {
        const res = await apiFetch(`${baseUrl}/demo/driver-advance`, { method: 'POST' });
        assert.equal(res.status, 200);
        assert.equal(res.data.step, 5);
        assert.ok(res.data.execution);
        assert.equal(res.data.completedStopName, 'Mumbai');
    });

    test('6. POST /demo/reset safely removes only DEMO- records and resets state', async () => {
        const res = await apiFetch(`${baseUrl}/demo/reset`, { method: 'POST' });
        assert.equal(res.status, 200);
        assert.equal(res.data.isReset, true);

        const remainingDemoTrucks = await Truck.find({ licensePlate: /^DEMO-/ });
        assert.equal(remainingDemoTrucks.length, 0);

        const remainingDemoDrivers = await Driver.find({ emailId: /^demo-.*@cargoxpress\.com$/ });
        assert.equal(remainingDemoDrivers.length, 0);
    });
});
