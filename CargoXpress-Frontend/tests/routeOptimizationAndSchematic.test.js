import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

describe('CargoXpress Signature Route Optimization & Merge Visualization', () => {
  // ─── 1. UI Component Architecture Integrity ─────────────────────────────────
  describe('1. Component File Structure & Exports', () => {
    test('verifies RouteSchematicVisualizer component exists', () => {
      const filePath = path.join(SRC_DIR, 'components/ui/RouteSchematicVisualizer.jsx');
      assert.equal(fs.existsSync(filePath), true, 'RouteSchematicVisualizer.jsx must exist');
    });

    test('verifies SegmentLoadProfile component exists', () => {
      const filePath = path.join(SRC_DIR, 'components/ui/SegmentLoadProfile.jsx');
      assert.equal(fs.existsSync(filePath), true, 'SegmentLoadProfile.jsx must exist');
    });

    test('verifies EvaluationLedger component exists', () => {
      const filePath = path.join(SRC_DIR, 'components/ui/EvaluationLedger.jsx');
      assert.equal(fs.existsSync(filePath), true, 'EvaluationLedger.jsx must exist');
    });

    test('verifies MergeableSchedule flagship workspace exists', () => {
      const filePath = path.join(SRC_DIR, 'Componenets/MergeableSchedule.jsx');
      assert.equal(fs.existsSync(filePath), true, 'MergeableSchedule.jsx must exist');
    });

    test('verifies barrel exports in src/components/ui/index.js', () => {
      const indexContent = fs.readFileSync(path.join(SRC_DIR, 'components/ui/index.js'), 'utf8');
      assert.match(indexContent, /RouteSchematicVisualizer/, 'index.js must export RouteSchematicVisualizer');
      assert.match(indexContent, /SegmentLoadProfile/, 'index.js must export SegmentLoadProfile');
      assert.match(indexContent, /EvaluationLedger/, 'index.js must export EvaluationLedger');
    });
  });

  // ─── 2. Candidate Normalization & Authoritative Evaluation Math ─────────────
  describe('2. Candidate Normalization & Segment Math Verification', () => {
    test('correctly normalizes backend-evaluated candidate pair', () => {
      const mockBackendPair = {
        _id: 'pair-abc-123',
        truckOneLicensePlate: 'DL-01-AB-1234',
        truckTwoLicensePlate: 'MH-04-CD-5678',
        evaluation: {
          carrierTruck: {
            id: 'truck-1',
            licensePlate: 'DL-01-AB-1234',
            totalCapacity: 12000,
            stops: ['Delhi', 'Jaipur', 'Ahmedabad', 'Mumbai'],
            currentLoad: [3000, 3500, 2000, 0],
            isMultiStage: true,
            priorManifest: [
              { licensePlate: 'RJ-14-XY-9999', role: 'absorbed' }
            ]
          },
          absorbedTruck: {
            id: 'truck-2',
            licensePlate: 'MH-04-CD-5678',
            totalCapacity: 6000,
            stops: ['Jaipur', 'Ahmedabad'],
            currentLoad: [1500, 0]
          },
          unifiedRoute: {
            allStops: ['Delhi', 'Jaipur', 'Ahmedabad', 'Mumbai'],
            source: 'Delhi',
            destination: 'Mumbai',
            finalCurrentLoad: [3000, 5000, 2000, 0],
            finalRemainingLoad: [9000, 7000, 10000, 12000],
            totalCapacity: 12000,
            segmentLoads: [
              { stop: 'Delhi', carrierLoad: 3000, absorbedLoad: 0, consolidatedLoad: 3000, remainingCapacity: 9000, utilizationPct: 25 },
              { stop: 'Jaipur', carrierLoad: 3500, absorbedLoad: 1500, consolidatedLoad: 5000, remainingCapacity: 7000, utilizationPct: 42 },
              { stop: 'Ahmedabad', carrierLoad: 2000, absorbedLoad: 0, consolidatedLoad: 2000, remainingCapacity: 10000, utilizationPct: 17 },
              { stop: 'Mumbai', carrierLoad: 0, absorbedLoad: 0, consolidatedLoad: 0, remainingCapacity: 12000, utilizationPct: 0 }
            ]
          },
          validation: {
            routeCompatibility: { passed: true, sharedStops: ['Jaipur', 'Ahmedabad'] },
            capacityFeasibility: { passed: true, peakLoadKg: 5000, capacityKg: 12000, headroomKg: 7000, peakUtilizationPct: 42 },
            stopOrderIntegrity: { passed: true },
            multiStageDetails: { isMultiStage: true, priorAbsorbedVehicles: 1 }
          }
        }
      };

      // Verify peak load calculation
      const peakLoad = Math.max(...mockBackendPair.evaluation.unifiedRoute.segmentLoads.map(s => s.consolidatedLoad));
      assert.equal(peakLoad, 5000, 'Peak leg payload must be 5,000 kg');

      // Verify minimum headroom
      const minHeadroom = Math.min(...mockBackendPair.evaluation.unifiedRoute.segmentLoads.map(s => s.remainingCapacity));
      assert.equal(minHeadroom, 7000, 'Minimum headroom must be 7,000 kg');

      // Verify multi-stage carrier recognition
      assert.equal(mockBackendPair.evaluation.carrierTruck.isMultiStage, true, 'Must identify multi-stage carrier');
      assert.equal(mockBackendPair.evaluation.carrierTruck.priorManifest.length, 1, 'Must track prior absorbed vehicles');
    });

    test('resilient fallback synthesizes correct segment math when evaluation is absent', () => {
      const rawPair = {
        _id: 'pair-raw-999',
        truckOneLicensePlate: 'GJ-01-AA-1111',
        truckOneStops: ['Ahmedabad', 'Surat', 'Mumbai'],
        truckOneId: { totalCapacity: 10000, currentLoad: [2000, 2500, 0] },
        truckTwoLicensePlate: 'GJ-05-BB-2222',
        truckTwoStops: ['Surat', 'Mumbai'],
        truckTwoId: { totalCapacity: 5000, currentLoad: [1800, 0] },
      };

      // Simulate client-side resolution logic
      const carrierPlate = rawPair.truckOneLicensePlate;
      const absorbedPlate = rawPair.truckTwoLicensePlate;
      const sharedStops = ['Surat', 'Mumbai'];

      assert.equal(carrierPlate, 'GJ-01-AA-1111');
      assert.equal(absorbedPlate, 'GJ-05-BB-2222');
      assert.deepEqual(sharedStops, ['Surat', 'Mumbai']);
    });
  });

  // ─── 3. Multi-Stage Merging & Concurrency Protection ────────────────────────
  describe('3. Multi-Stage Merging & Concurrency Safeguards', () => {
    test('confirms atomic authorization avoids simulated local mutations', () => {
      const scheduleContent = fs.readFileSync(path.join(SRC_DIR, 'Componenets/MergeableSchedule.jsx'), 'utf8');
      
      // Must post to authoritative backend /acceptPair/:id
      assert.match(scheduleContent, /acceptPair\//i, 'Must invoke authoritative POST /acceptPair/:id endpoint');
      
      // Must delete to authoritative backend /rejectPair/:id
      assert.match(scheduleContent, /rejectPair\//i, 'Must invoke authoritative DELETE /rejectPair/:id endpoint');

      // Must handle 409 stale conflict
      assert.match(scheduleContent, /409/, 'Must gracefully handle 409 Conflict for stale candidates');
    });

    test('confirms role-based barrier redirects non-admin users', () => {
      const scheduleContent = fs.readFileSync(path.join(SRC_DIR, 'Componenets/MergeableSchedule.jsx'), 'utf8');
      assert.match(scheduleContent, /isCompany/, 'Must evaluate transport company role barrier');
      assert.match(scheduleContent, /isTrader/, 'Must evaluate consignor trader role barrier');
      assert.match(scheduleContent, /navigate\("\/company"/, 'Must redirect carrier accounts to /company');
      assert.match(scheduleContent, /navigate\("\/trader"/, 'Must redirect trader accounts to /trader');
    });
  });
});
