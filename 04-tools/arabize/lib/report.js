/**
 * Report Generator for Arabize Master Script
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function generateReport(result) {
  const lines = [];

  lines.push('');
  lines.push(c('magenta', '  ╔══════════════════════════════════════╗'));
  lines.push(c('magenta', '  ║') + c('bold', '   rtl-first / arabize                ') + c('magenta', '║'));
  lines.push(c('magenta', '  ║') + c('dim', '   Arabize any platform — one command  ') + c('magenta', '║'));
  lines.push(c('magenta', '  ╚══════════════════════════════════════╝'));
  lines.push('');

  // Project info
  lines.push(`  Framework:   ${c('bold', result.framework.label)}`);
  lines.push(`  Target:      ${c('bold', result.lang)}`);

  if (result.cssScan.totalFiles > 0) {
    lines.push(`  CSS issues:  ${c('yellow', `${result.cssScan.totalOccurrences} physical properties in ${result.cssScan.totalFiles} files`)}`);
  } else {
    lines.push(`  CSS issues:  ${c('green', 'None found')}`);
  }

  if (result.localeScan.found) {
    if (result.localeScan.hasArabic) {
      lines.push(`  Locale:      ${c('green', 'Arabic already exists')}`);
    } else {
      lines.push(`  Locale:      ${c('yellow', `Found ${result.localeScan.structure} in ${result.localeScan.localeDir}/`)}`);
    }
  } else {
    lines.push(`  Locale:      ${c('red', 'No i18n system detected')}`);
  }

  lines.push('');
  lines.push(c('dim', '  ──────────────────────────────────────'));
  lines.push('');

  // Steps
  for (const step of result.steps) {
    const layerLabel = `Layer ${step.layer}`;

    if (step.error) {
      lines.push(`  ${c('red', '✗')}  ${c('bold', step.label)} ${c('dim', `(${layerLabel})`)}`);
      lines.push(`     ${c('red', step.error)}`);
    } else if (step.alreadyDone) {
      lines.push(`  ${c('green', '✓')}  ${c('bold', step.label)} ${c('dim', `(${layerLabel})`)}`);
      lines.push(`     ${c('dim', 'Already done — skipped')}`);
    } else if (step.changes.length > 0) {
      const prefix = result.dryRun ? c('yellow', '~') : c('green', '✓');
      lines.push(`  ${prefix}  ${c('bold', step.label)} ${c('dim', `(${layerLabel})`)}`);
      for (const change of step.changes) {
        lines.push(`     ${c('dim', '→')} ${change}`);
      }
    } else {
      lines.push(`  ${c('dim', '○')}  ${c('bold', step.label)} ${c('dim', `(${layerLabel})`)}`);
      lines.push(`     ${c('dim', 'No changes needed')}`);
    }

    // Warnings
    if (step.warnings && step.warnings.length > 0) {
      for (const warn of step.warnings) {
        lines.push(`     ${c('yellow', '⚠')} ${warn}`);
      }
    }

    lines.push('');
  }

  // Dry run notice
  if (result.dryRun) {
    lines.push(c('dim', '  ──────────────────────────────────────'));
    lines.push('');
    lines.push(`  ${c('yellow', '⚠')}  Dry run — no files were modified`);
    lines.push(`     Run without ${c('bold', '--dry-run')} to apply changes`);
    lines.push('');
  }

  // Summary
  lines.push(c('dim', '  ──────────────────────────────────────'));
  lines.push('');

  const successCount = result.steps.filter(s => s.success || s.alreadyDone).length;
  const totalCount = result.steps.length;

  if (successCount === totalCount) {
    lines.push(`  ${c('green', '✓')} All ${totalCount} steps completed in ${result.elapsed}s`);
  } else {
    lines.push(`  ${c('yellow', '⚠')} ${successCount}/${totalCount} steps completed in ${result.elapsed}s`);
  }

  // Next steps
  lines.push('');
  lines.push(c('cyan', '  Next steps:'));

  let step = 1;

  if (result.localeScan.found && !result.localeScan.hasArabic) {
    lines.push(`  ${step}. Translate the locale files in ${result.localeScan.localeDir}/`);
    step++;
  }

  if (result.cssScan.totalFiles > 0) {
    lines.push(`  ${step}. Apply CSS patches: ${c('bold', 'bash .rtl-patches/apply-all.sh --layer 3')}`);
    step++;
  }

  lines.push(`  ${step}. Test your app in Arabic`);
  step++;
  lines.push(`  ${step}. Run ${c('bold', 'npx @rtl-first/audit ./')} for detailed report`);

  lines.push('');
  return lines.join('\n');
}

function generateJSONReport(result) {
  return {
    success: result.success,
    framework: result.framework,
    lang: result.lang,
    elapsed: result.elapsed,
    cssScan: result.cssScan,
    localeScan: result.localeScan,
    steps: result.steps.map(s => ({
      name: s.name,
      label: s.label,
      layer: s.layer,
      success: s.success,
      alreadyDone: s.alreadyDone || false,
      changes: s.changes,
      error: s.error || null
    }))
  };
}

module.exports = { generateReport, generateJSONReport };
