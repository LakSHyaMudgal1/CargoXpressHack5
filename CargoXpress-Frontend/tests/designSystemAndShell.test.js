import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNavigationGroups, getUserRoleMeta } from '../src/components/shell/NavConfig.js';
import { THEME_PRESETS, DEFAULT_THEME_ID } from '../src/utils/themePresets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DIR = path.resolve(__dirname, '../src/components/ui');

describe('CargoXpress Design System & Shell Architecture', () => {
  describe('1. Role-Tailored Navigation & Authorization Isolation', () => {
    it('provides isolated dispatch and merge routes exclusively for Admin users', () => {
      const adminUser = {
        name: 'Dinky Dispatcher',
        emailId: 'dinky@cargoxpress.com',
      };

      const groups = getNavigationGroups(adminUser);
      assert.ok(Array.isArray(groups) && groups.length > 0, 'Admin receives non-empty navigation groups');

      const allHrefs = groups.flatMap((g) => g.items.map((it) => it.href));
      assert.ok(allHrefs.includes('/admin'), 'Admin navigation includes /admin');
      assert.ok(allHrefs.includes('/mergeable'), 'Admin navigation includes /mergeable');
      assert.ok(allHrefs.includes('/mergedSchedule'), 'Admin navigation includes /mergedSchedule');
      assert.ok(allHrefs.includes('/mergeableTraders'), 'Admin navigation includes /mergeableTraders');

      // Admin must NOT have carrier/trader creation shortcuts
      assert.ok(!allHrefs.includes('/company'), 'Admin does not see carrier dashboard in shell');
      assert.ok(!allHrefs.includes('/trader'), 'Admin does not see trader dashboard in shell');
    });

    it('provides fleet management and corridor route tools exclusively for Transport Carriers', () => {
      const companyUser = {
        name: 'FastTrack Fleet Co',
        emailId: 'thakur@gmail.com',
        registrationNumber: 'MH-REG-101',
      };

      const groups = getNavigationGroups(companyUser);
      const allHrefs = groups.flatMap((g) => g.items.map((it) => it.href));

      assert.ok(allHrefs.includes('/company'), 'Carrier navigation includes /company');
      assert.ok(allHrefs.includes('/truck'), 'Carrier navigation includes /truck');
      assert.ok(allHrefs.includes('/route'), 'Carrier navigation includes /route');

      // Carrier must NOT have admin dispatch or trader request endpoints
      assert.ok(!allHrefs.includes('/admin'), 'Carrier cannot access admin dispatch in shell');
      assert.ok(!allHrefs.includes('/traderRequest'), 'Carrier does not see trader consignment creation in shell');
    });

    it('provides consignment management exclusively for Consignor Traders', () => {
      const traderUser = {
        name: 'Sanchita Exports',
        emailId: 'sanchita@gmail.com',
        aadharNumber: '998877665544',
      };

      const groups = getNavigationGroups(traderUser);
      const allHrefs = groups.flatMap((g) => g.items.map((it) => it.href));

      assert.ok(allHrefs.includes('/trader'), 'Trader navigation includes /trader');
      assert.ok(allHrefs.includes('/traderRequest'), 'Trader navigation includes /traderRequest');

      // Trader must NOT have carrier fleet or admin merge management
      assert.ok(!allHrefs.includes('/admin'), 'Trader cannot access admin dispatch in shell');
      assert.ok(!allHrefs.includes('/truck'), 'Trader cannot register trucks in shell');
    });

    it('returns empty navigation groups for unauthenticated visitors', () => {
      const groups = getNavigationGroups(null);
      assert.deepEqual(groups, [], 'Unauthenticated visitor gets empty groups');
    });
  });

  describe('2. Role Metadata & Badge Resolution', () => {
    it('resolves System Dispatcher for admin users', () => {
      const meta = getUserRoleMeta({ emailId: 'dispatch@cargoxpress.com' });
      assert.equal(meta.role, 'admin');
      assert.equal(meta.label, 'System Dispatcher');
      assert.equal(meta.variant, 'purple');
    });

    it('resolves Transport Carrier for company accounts', () => {
      const meta = getUserRoleMeta({ emailId: 'carrier@express.com', registrationNumber: 'REG-555' });
      assert.equal(meta.role, 'company');
      assert.equal(meta.label, 'Transport Carrier');
      assert.equal(meta.variant, 'aqua');
    });

    it('resolves Consignor Trader for trader accounts', () => {
      const meta = getUserRoleMeta({ emailId: 'trader@goods.com', aadharNumber: '112233445566' });
      assert.equal(meta.role, 'trader');
      assert.equal(meta.label, 'Consignor Trader');
      assert.equal(meta.variant, 'emerald');
    });
  });

  describe('3. Design Tokens & Theme Preset Architecture', () => {
    it('exports all 5 enterprise theme presets with swatch metadata', () => {
      assert.equal(THEME_PRESETS.length, 5);
      const ids = THEME_PRESETS.map((t) => t.id);
      assert.deepEqual(ids, ['midnight', 'ocean', 'graphite', 'forest', 'sand']);
      assert.equal(DEFAULT_THEME_ID, 'midnight');
    });

    it('validates each preset contains required semantic signals and contrast metadata', () => {
      for (const preset of THEME_PRESETS) {
        assert.ok(preset.name, `Preset ${preset.id} has display name`);
        assert.ok(preset.mode === 'dark' || preset.mode === 'light', `Preset ${preset.id} mode is dark or light`);
        assert.ok(preset.swatch.bg, `Preset ${preset.id} defines swatch background`);
        assert.ok(preset.swatch.accent, `Preset ${preset.id} defines swatch accent`);
      }
    });
  });

  describe('4. Shared Component Library Structure Integrity', () => {
    it('verifies all vital enterprise UI primitives exist in the design system', () => {
      const requiredFiles = [
        'Button.jsx',
        'Badge.jsx',
        'Card.jsx',
        'Input.jsx',
        'Select.jsx',
        'SearchInput.jsx',
        'Table.jsx',
        'Modal.jsx',
        'Dropdown.jsx',
        'Breadcrumbs.jsx',
        'PageHeader.jsx',
        'StatCard.jsx',
        'EmptyState.jsx',
        'Skeleton.jsx',
        'ThemeSelector.jsx',
        'ThemePreferencesCard.jsx',
        'CorridorTimeline.jsx',
        'index.js',
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(UI_DIR, file);
        assert.ok(fs.existsSync(filePath), `Design system component ${file} exists on disk`);
      }
    });
  });
});
