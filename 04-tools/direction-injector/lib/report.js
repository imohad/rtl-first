/**
 * Report Generator
 * Formats detection and injection results into a readable report.
 * Zero dependencies.
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Generate detection-only report
 */
function generateDetectReport(detection) {
  const lines = [];

  lines.push('');
  lines.push(c('cyan', '  Direction Injector — Detection Report'));
  lines.push(c('dim', '  ═══════════════════════════════════════'));
  lines.push('');

  if (detection.error) {
    lines.push(`  ${c('red', '✗')}  ${detection.error}`);
    return lines.join('\n');
  }

  // Framework
  if (detection.framework) {
    lines.push(`  ${c('green', '✓')}  Framework: ${c('bold', detection.label)}`);
  } else {
    lines.push(`  ${c('yellow', '⚠')}  Framework: ${c('dim', 'Not detected')}`);
  }

  // Root file
  if (detection.rootFile) {
    lines.push(`  ${c('green', '✓')}  Root file: ${c('bold', detection.rootFile)}`);
  } else {
    lines.push(`  ${c('red', '✗')}  Root file: ${c('dim', 'Not found')}`);
  }

  // i18n
  if (detection.i18n) {
    lines.push(`  ${c('green', '✓')}  i18n: ${detection.i18n.label}`);
  } else {
    lines.push(`  ${c('dim', '○')}  i18n: None detected`);
  }

  // UI Libraries
  if (detection.uiLibraries && detection.uiLibraries.length > 0) {
    lines.push('');
    lines.push(c('cyan', '  UI Libraries with RTL support:'));
    for (const lib of detection.uiLibraries) {
      lines.push(`  ${c('yellow', '⚠')}  ${lib.label} detected`);
      lines.push(`     ${c('dim', '→')} ${lib.hint}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate full injection report
 */
function generateReport(detection, injectionResult, options = {}) {
  const lines = [];

  lines.push('');
  lines.push(c('cyan', '  Direction Injector Report'));
  lines.push(c('dim', '  ════════════════════════════'));
  lines.push('');

  // Framework info
  if (detection.framework) {
    let label = detection.label;
    if (detection.monorepo) {
      label += ` ${c('dim', `(monorepo: ${detection.monorepoSubdir}/)`)}`;
    }
    lines.push(`  Framework:  ${c('bold', detection.label)}${detection.monorepo ? '  ' + c('dim', `← detected in ${detection.monorepoSubdir}/`) : ''}`);
  } else {
    lines.push(`  Framework:  ${c('yellow', 'Unknown')}`);
  }

  if (detection.rootFile) {
    lines.push(`  Root file:  ${c('bold', detection.rootFile)}`);
  }

  lines.push('');

  // Injection results
  if (injectionResult.error) {
    lines.push(`  ${c('red', '✗')}  Error: ${injectionResult.error}`);
  } else if (injectionResult.alreadyDone) {
    lines.push(`  ${c('green', '✓')}  dir="rtl" and lang already present — no changes needed`);
  } else if (injectionResult.changes && injectionResult.changes.length > 0) {
    lines.push(c('cyan', '  Changes:'));
    for (const change of injectionResult.changes) {
      const prefix = injectionResult.dryRun ? c('yellow', '~') : c('green', '✓');
      lines.push(`  ${prefix}  ${change}`);
    }

    if (injectionResult.dryRun) {
      lines.push('');
      lines.push(`  ${c('yellow', '⚠')}  Dry run — no files were modified`);
      lines.push(`     Run without ${c('bold', '--dry-run')} to apply changes`);
    }
  } else {
    lines.push(`  ${c('dim', '○')}  No changes made`);
  }

  // UI Library warnings
  if (detection.uiLibraries && detection.uiLibraries.length > 0) {
    lines.push('');
    lines.push(c('cyan', '  UI Library Integration:'));
    for (const lib of detection.uiLibraries) {
      lines.push(`  ${c('yellow', '⚠')}  ${lib.label} detected — needs ${lib.provider}`);
      lines.push(`     ${c('dim', '→')} ${lib.hint}`);
      lines.push(`     ${c('dim', '→')} ${lib.import}`);
    }
  }

  // Next steps
  lines.push('');
  lines.push(c('cyan', '  Next steps:'));

  let step = 1;

  if (detection.uiLibraries && detection.uiLibraries.length > 0) {
    lines.push(`  ${step}. Add ${detection.uiLibraries.map(l => l.provider).join(' + ')} wrapper to your root component`);
    step++;
  }

  if (!detection.i18n) {
    lines.push(`  ${step}. Set up an i18n library (i18next, next-intl, vue-i18n)`);
    step++;
  }

  lines.push(`  ${step}. Run: npx @rtl-first/locale-scaffolder ./ --lang ar`);
  step++;
  lines.push(`  ${step}. Run: npx @rtl-first/audit ./ to check all RTL layers`);

  // Files modified count
  lines.push('');
  if (injectionResult.changes && injectionResult.changes.length > 0 && !injectionResult.dryRun) {
    lines.push(`  Files modified: ${c('bold', '1')}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate JSON report (for programmatic use)
 */
function generateJSONReport(detection, injectionResult) {
  return {
    framework: detection.framework,
    frameworkLabel: detection.label,
    rootFile: detection.rootFile,
    type: detection.type,
    i18n: detection.i18n,
    uiLibraries: detection.uiLibraries,
    injection: {
      error: injectionResult.error || null,
      alreadyDone: !!injectionResult.alreadyDone,
      changes: injectionResult.changes || [],
      dryRun: !!injectionResult.dryRun,
      filePath: injectionResult.filePath || null
    }
  };
}

module.exports = { generateReport, generateDetectReport, generateJSONReport };
