import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CargoXpress Motion, Micro-Interactions, and Interaction Feedback Suite', () => {
  const srcPath = path.join(__dirname, '../src');

  test('1. Tooltip component provides accessible hover & focus inspection', () => {
    const tooltipFile = path.join(srcPath, 'components/ui/Tooltip.jsx');
    assert.ok(fs.existsSync(tooltipFile), 'Tooltip.jsx must exist');
    const content = fs.readFileSync(tooltipFile, 'utf8');
    assert.match(content, /role="tooltip"/, 'Tooltip must provide role="tooltip"');
    assert.match(content, /aria-describedby/, 'Must link trigger element to tooltip via aria-describedby');
    assert.match(content, /onMouseEnter/, 'Must support hover trigger');
    assert.match(content, /onFocus/, 'Must support keyboard focus trigger');
    assert.match(content, /motion-reduce:transition-none/, 'Must respect prefers-reduced-motion');
  });

  test('2. Button component provides tactile feedback, loading state, and success state', () => {
    const buttonFile = path.join(srcPath, 'components/ui/Button.jsx');
    const content = fs.readFileSync(buttonFile, 'utf8');
    assert.match(content, /aria-busy=\{isLoading\}/, 'Button must declare aria-busy when loading');
    assert.match(content, /isSuccess/, 'Button must support isSuccess feedback state');
    assert.match(content, /animate-cx-pop/, 'Success state must show pop checkmark animation');
    assert.match(content, /disabledReason/, 'Button must support disabledReason tooltip');
    assert.match(content, /active:scale-\[0\.98\]/, 'Must provide tactile active press scale');
    assert.match(content, /motion-reduce:active:scale-100/, 'Must respect reduced motion for tactile scale');
  });

  test('3. Modal component implements focus trapping and accessible backdrop motion', () => {
    const modalFile = path.join(srcPath, 'components/ui/Modal.jsx');
    const content = fs.readFileSync(modalFile, 'utf8');
    assert.match(content, /role="dialog"/, 'Modal must have role="dialog"');
    assert.match(content, /aria-modal="true"/, 'Modal must have aria-modal="true"');
    assert.match(content, /e\.key === 'Tab'/, 'Modal must trap keyboard Tab navigation');
    assert.match(content, /previousActiveElement/, 'Modal must restore focus on dismissal');
    assert.match(content, /motion-reduce:transition-none/, 'Must respect prefers-reduced-motion');
  });

  test('4. Input component applies validation shake animation on error', () => {
    const inputFile = path.join(srcPath, 'components/ui/Input.jsx');
    const content = fs.readFileSync(inputFile, 'utf8');
    assert.match(content, /animate-cx-shake/, 'Input must apply animate-cx-shake when error occurs');
    assert.match(content, /motion-reduce:animate-none/, 'Must disable shake animation under reduced motion');
    assert.match(content, /aria-invalid/, 'Input must declare aria-invalid state');
  });

  test('5. RouteSchematicVisualizer provides controlled corridor merging animation and confirmed state', () => {
    const visualizerFile = path.join(srcPath, 'components/ui/RouteSchematicVisualizer.jsx');
    assert.ok(fs.existsSync(visualizerFile), 'RouteSchematicVisualizer.jsx must exist');
    const content = fs.readFileSync(visualizerFile, 'utf8');
    assert.match(content, /viewMode/, 'Visualizer must track viewMode');
    assert.match(content, /handleSimulateAlignment/, 'Visualizer must provide corridor simulation action');
    assert.match(content, /isConfirmed/, 'Visualizer must support confirmed state transition');
    assert.match(content, /Simulating candidate route alignment/, 'Visualizer must clearly disclose uncommitted simulation');
    assert.match(content, /motion-reduce:transition-none/, 'Must respect prefers-reduced-motion');
  });

  test('6. Global CSS enforces prefers-reduced-motion across all animation primitives', () => {
    const cssFile = path.join(srcPath, 'index.css');
    const content = fs.readFileSync(cssFile, 'utf8');
    assert.match(content, /prefers-reduced-motion:\s*reduce/, 'CSS must declare prefers-reduced-motion query');
    assert.match(content, /animation-duration:\s*0\.01ms\s*!important/, 'Must nullify animation durations for reduced motion');
    assert.match(content, /transition-duration:\s*0\.01ms\s*!important/, 'Must nullify transition durations for reduced motion');
    assert.match(content, /@keyframes cx-shake/, 'Must define cx-shake keyframe');
    assert.match(content, /@keyframes cx-pop/, 'Must define cx-pop keyframe');
  });

  test('7. MergeableSchedule connects confirmed consolidation state with RouteSchematicVisualizer', () => {
    const mergeScheduleFile = path.join(srcPath, 'Componenets/MergeableSchedule.jsx');
    const content = fs.readFileSync(mergeScheduleFile, 'utf8');
    assert.match(content, /confirmedPairId/, 'Must maintain confirmedPairId state');
    assert.match(content, /isConfirmed=\{confirmedPairId === activeCandidate\.pairId\}/, 'Must bind confirmed state to schematic visualizer');
    assert.match(content, /isSuccess=\{confirmedPairId === activeCandidate\.pairId\}/, 'Must bind isSuccess to approve button');
  });

  test('8. Driver mobile Button provides accessible state and tactile touch feedback', () => {
    const driverButtonFile = path.join(__dirname, '../../CargoXpress-Driver/src/components/Button.tsx');
    assert.ok(fs.existsSync(driverButtonFile), 'Driver Button.tsx must exist');
    const content = fs.readFileSync(driverButtonFile, 'utf8');
    assert.match(content, /accessibilityRole="button"/, 'Driver button must declare accessibilityRole="button"');
    assert.match(content, /accessibilityState=\{\{\s*disabled.*busy:\s*loading\s*\}\}/, 'Driver button must declare disabled & busy accessibilityState');
  });
});

