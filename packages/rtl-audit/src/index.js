import { basename } from 'path';
import { scanLayer1 } from './scanners/layer1-text-engine.js';
import { scanLayer2 } from './scanners/layer2-direction.js';
import { scanLayer3 } from './scanners/layer3-css.js';
import { scanLayer4 } from './scanners/layer4-translations.js';
import { scanLayer5 } from './scanners/layer5-hardcoded.js';
import { computeScore } from './score.js';

/**
 * Run a full RTL audit on a project directory.
 * @param {string} projectPath - Absolute path to the project root
 * @returns {object} Complete audit report
 */
export function runAudit(projectPath) {
  const projectName = basename(projectPath);

  const layer1 = scanLayer1(projectPath);
  const layer2 = scanLayer2(projectPath);
  const layer3 = scanLayer3(projectPath);
  const layer4 = scanLayer4(projectPath);
  const layer5 = scanLayer5(projectPath);

  const layers = { layer1, layer2, layer3, layer4, layer5 };
  const score = computeScore(layers);

  return {
    version: '0.1.0',
    projectName,
    projectPath,
    timestamp: new Date().toISOString(),
    score,
    layers,
    priority: computePriority(layers),
  };
}

/**
 * Determine which layers to fix first based on current state.
 */
function computePriority(layers) {
  const order = [];

  // Layer 2 is almost always the first thing to fix
  if (layers.layer2.status !== 'pass') order.push('Layer 2 — Direction logic');

  // Layer 4 next — translations are safe and welcome
  if (layers.layer4.status !== 'pass') order.push('Layer 4 — Translations');

  // Layer 5 — hardcoded strings
  if (layers.layer5.status !== 'pass') order.push('Layer 5 — Hardcoded text');

  // Layer 3 — CSS, best done with codemod
  if (layers.layer3.status !== 'pass') order.push('Layer 3 — CSS layout');

  // Layer 1 — text engine, only if detected
  if (layers.layer1.status === 'warn' || layers.layer1.status === 'fail') {
    order.push('Layer 1 — Text engine (requires proposal)');
  }

  return order;
}
