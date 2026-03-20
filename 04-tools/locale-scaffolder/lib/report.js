/**
 * Report Generator for Locale Scaffolder
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function generateReport(detection, scaffoldResult, configResult, switcherResult, options = {}) {
  const lines = [];

  lines.push('');
  lines.push(c('cyan', '  Locale Scaffolder Report'));
  lines.push(c('dim', '  ═══════════════════════════'));
  lines.push('');

  // Detection
  if (detection.i18nLib) {
    lines.push(`  i18n system:    ${c('bold', detection.i18nLib.label)}`);
  } else {
    lines.push(`  i18n system:    ${c('yellow', 'None detected')}`);
  }

  if (detection.localeInfo.sourceLocale) {
    const totalKeys = detection.localeInfo.sourceFiles.reduce((sum, f) => sum + f.keys, 0);
    lines.push(`  Source locale:  ${c('bold', detection.localeInfo.sourceLocale)} (${totalKeys} keys across ${detection.localeInfo.sourceFiles.length} file${detection.localeInfo.sourceFiles.length > 1 ? 's' : ''})`);
  } else {
    lines.push(`  Source locale:  ${c('red', 'Not found')}`);
  }

  if (detection.localeInfo.structure) {
    lines.push(`  Structure:      ${c('dim', detection.localeInfo.structure)}`);
  }

  if (detection.localeInfo.existingLocales.length > 0) {
    lines.push(`  Locales found:  ${c('dim', detection.localeInfo.existingLocales.join(', '))}`);
  }

  lines.push('');

  // Already exists
  if (scaffoldResult.alreadyExists) {
    lines.push(`  ${c('green', '✓')}  Target locale already exists — use --force to overwrite`);
    lines.push('');
    return lines.join('\n');
  }

  // Scaffold results
  if (scaffoldResult.changes.length > 0) {
    lines.push(c('cyan', '  Created:'));
    for (const change of scaffoldResult.changes) {
      const prefix = options.dryRun ? c('yellow', '~') : c('green', '✓');
      lines.push(`  ${prefix}  ${change}`);
    }
  }

  // Config results
  if (configResult.changes.length > 0) {
    for (const change of configResult.changes) {
      const prefix = options.dryRun ? c('yellow', '~') : c('green', '✓');
      lines.push(`  ${prefix}  ${change}`);
    }
  }

  // Switcher
  if (switcherResult) {
    const prefix = options.dryRun ? c('yellow', '~') : c('green', '✓');
    lines.push(`  ${prefix}  Generated ${switcherResult.fileName}`);
  }

  // Errors
  if (scaffoldResult.errors.length > 0 || configResult.errors.length > 0) {
    lines.push('');
    lines.push(c('red', '  Errors:'));
    for (const err of [...scaffoldResult.errors, ...configResult.errors]) {
      lines.push(`  ${c('red', '✗')}  ${err}`);
    }
  }

  // Warnings
  if (configResult.warnings && configResult.warnings.length > 0) {
    lines.push('');
    lines.push(c('yellow', '  Warnings:'));
    for (const warn of configResult.warnings) {
      lines.push(`  ${c('yellow', '⚠')}  ${warn}`);
    }
  }

  // Dry run notice
  if (options.dryRun) {
    lines.push('');
    lines.push(`  ${c('yellow', '⚠')}  Dry run — no files were modified`);
    lines.push(`     Run without ${c('bold', '--dry-run')} to apply changes`);
  }

  // Next steps
  lines.push('');
  lines.push(c('cyan', '  Next steps:'));
  let step = 1;

  const totalKeys = detection.localeInfo.sourceFiles.reduce((sum, f) => sum + f.keys, 0);
  if (totalKeys > 0) {
    lines.push(`  ${step}. Translate ${totalKeys} keys in the new locale files`);
    step++;
  }

  if (switcherResult) {
    lines.push(`  ${step}. Add <LocaleSwitcher /> to your header/navigation`);
    step++;
  }

  lines.push(`  ${step}. Run: npx @rtl-first/direction-injector ./ to add dir="rtl"`);
  step++;
  lines.push(`  ${step}. Run: npx @rtl-first/audit ./ to check all RTL layers`);

  lines.push('');
  return lines.join('\n');
}

function generateJSONReport(detection, scaffoldResult, configResult, switcherResult) {
  return {
    i18nLibrary: detection.i18nLib ? detection.i18nLib.name : null,
    localeInfo: {
      sourceLocale: detection.localeInfo.sourceLocale,
      structure: detection.localeInfo.structure,
      localeDir: detection.localeInfo.localeDir,
      existingLocales: detection.localeInfo.existingLocales,
      sourceFiles: detection.localeInfo.sourceFiles
    },
    scaffold: {
      alreadyExists: !!scaffoldResult.alreadyExists,
      changes: scaffoldResult.changes,
      errors: scaffoldResult.errors
    },
    config: {
      changes: configResult.changes,
      errors: configResult.errors,
      warnings: configResult.warnings || []
    },
    switcher: switcherResult ? { fileName: switcherResult.fileName } : null
  };
}

module.exports = { generateReport, generateJSONReport };
