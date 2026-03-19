/**
 * Compute RTL Readiness Score (0-100) from layer results.
 *
 * Weight distribution:
 *   Layer 1 — Text engine:     30 points
 *   Layer 2 — Direction logic:  25 points
 *   Layer 3 — CSS layout:       20 points
 *   Layer 4 — Translations:     15 points
 *   Layer 5 — Hardcoded text:   10 points
 *
 * Total: 100 points
 */
export function computeScore(layers) {
  const scores = {
    layer1: scoreLayer1(layers.layer1),
    layer2: scoreLayer2(layers.layer2),
    layer3: scoreLayer3(layers.layer3),
    layer4: scoreLayer4(layers.layer4),
    layer5: scoreLayer5(layers.layer5),
  };

  const total = scores.layer1 + scores.layer2 + scores.layer3 + scores.layer4 + scores.layer5;

  return {
    total: Math.round(total),
    breakdown: scores,
    grade: getGrade(total),
  };
}

function scoreLayer1(result) {
  const MAX = 30;
  if (result.status === 'pass' && result.engines.length === 0) return MAX; // No editor = no issue
  if (result.status === 'pass') return MAX; // Editor with good BiDi
  if (result.status === 'warn') return MAX * 0.4; // Editor with unknown BiDi
  return 0; // Editor with known BiDi issues
}

function scoreLayer2(result) {
  const MAX = 25;
  if (result.status === 'pass') return MAX;
  if (result.status === 'warn') return MAX * 0.5;
  return 0;
}

function scoreLayer3(result) {
  const MAX = 20;
  if (result.status === 'pass') return MAX;
  if (result.totalOccurrences === 0) return MAX;

  // Gradual degradation based on number of physical properties
  if (result.totalOccurrences < 10) return MAX * 0.8;
  if (result.totalOccurrences < 50) return MAX * 0.5;
  if (result.totalOccurrences < 200) return MAX * 0.2;
  return 0;
}

function scoreLayer4(result) {
  const MAX = 15;
  if (result.status === 'pass') return MAX;

  // If translations exist but incomplete, score proportionally
  if (result.gaps && result.gaps.length > 0) {
    const totalSource = result.gaps.reduce((s, g) => s + g.sourceKeyCount, 0);
    const totalTarget = result.gaps.reduce((s, g) => s + g.targetKeyCount, 0);
    if (totalSource > 0) {
      return MAX * (totalTarget / totalSource);
    }
  }

  if (result.status === 'warn') return MAX * 0.3;
  return 0;
}

function scoreLayer5(result) {
  const MAX = 10;
  if (result.status === 'pass') return MAX;
  if (result.count < 5) return MAX * 0.7;
  if (result.count < 20) return MAX * 0.4;
  return 0;
}

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}
