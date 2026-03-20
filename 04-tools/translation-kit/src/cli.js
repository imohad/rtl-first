#!/usr/bin/env node

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { compareLocales, autoDetect, generateMissingKeysFile } from './index.js';

const args = process.argv.slice(2);
let source = null;
let target = null;
let projectPath = null;
let outputFile = null;
let format = 'terminal';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--source' || args[i] === '-s') && args[i + 1]) {
    source = args[++i];
  } else if ((args[i] === '--target' || args[i] === '-t') && args[i + 1]) {
    target = args[++i];
  } else if ((args[i] === '--project' || args[i] === '-p') && args[i + 1]) {
    projectPath = args[++i];
  } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
    outputFile = args[++i];
  } else if (args[i] === '--format' && args[i + 1]) {
    format = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--version') {
    console.log('0.1.0');
    process.exit(0);
  } else if (!args[i].startsWith('-') && !projectPath) {
    projectPath = args[i];
  }
}

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

// ── Mode 1: Compare source vs target ────────────────────────────────────────

if (source) {
  const sourcePath = resolve(source);
  const targetPath = target ? resolve(target) : null;

  if (!existsSync(sourcePath)) {
    console.error(`Error: source "${sourcePath}" does not exist.`);
    process.exit(1);
  }

  const report = compareLocales(sourcePath, targetPath || sourcePath.replace(/en/i, 'ar'));

  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  if (outputFile && report.totalMissing > 0) {
    const result = generateMissingKeysFile(report, resolve(outputFile));
    console.log(`\n  ${green('✓')} Missing keys exported to ${cyan(result.path)} (${result.keyCount} keys)`);
  }

  process.exit(0);
}

// ── Mode 2: Auto-detect in project ──────────────────────────────────────────

if (projectPath) {
  const resolved = resolve(projectPath);
  if (!existsSync(resolved)) {
    console.error(`Error: path "${resolved}" does not exist.`);
    process.exit(1);
  }

  console.log('');
  console.log(bold('  Translation Kit — Auto Detect'));
  console.log(dim(`  Scanning ${resolved} for locale files`));
  console.log('');

  const results = autoDetect(resolved);

  if (results.length === 0) {
    console.log(yellow('  No i18n files detected.'));
    console.log(dim('  Use --source and --target to compare specific files.'));
    process.exit(0);
  }

  for (const report of results) {
    printReport(report);
    console.log('');
  }

  process.exit(0);
}

// ── No arguments ────────────────────────────────────────────────────────────

printHelp();
process.exit(1);

// ── Output functions ────────────────────────────────────────────────────────

function printReport(report) {
  console.log('');
  console.log(bold('  Translation Gap Report'));
  console.log(dim('  ─'.repeat(25)));
  console.log('');

  if (report.source) {
    console.log(`  Source: ${cyan(report.source)}`);
    console.log(`  Target: ${report.target ? cyan(report.target) : red('not found')}`);
    console.log('');
  }

  console.log(`  Total keys:   ${bold(String(report.totalSourceKeys))}`);
  console.log(`  Translated:   ${report.totalTargetKeys > 0 ? green(String(report.totalTargetKeys)) : red('0')}`);
  console.log(`  Missing:      ${report.totalMissing > 0 ? red(String(report.totalMissing)) : green('0')}`);
  console.log(`  Coverage:     ${colorCoverage(report.coverage)}`);

  // Per-file breakdown
  const filesWithGaps = report.files || [];
  if (filesWithGaps.length > 0) {
    console.log('');
    console.log(`  ${bold('Files with gaps:')}`);
    for (const f of filesWithGaps.slice(0, 15)) {
      const bar = coverageBar(f.sourceKeys, f.targetKeys);
      console.log(`  ${bar} ${dim(f.file)} ${dim(`(${f.missing} missing)`)}`);
    }
    if (filesWithGaps.length > 15) {
      console.log(dim(`  ... and ${filesWithGaps.length - 15} more files`));
    }
  }

  // Sample missing keys
  const missingKeys = report.allMissingKeys || report.missingKeys || [];
  if (missingKeys.length > 0) {
    console.log('');
    console.log(`  ${bold('Sample missing keys:')}`);
    for (const mk of missingKeys.slice(0, 10)) {
      const fileTag = mk.file ? dim(` [${mk.file}]`) : '';
      console.log(`  ${red('−')} ${mk.key}${fileTag}`);
      if (mk.value && typeof mk.value === 'string') {
        console.log(dim(`    "${mk.value.length > 60 ? mk.value.substring(0, 60) + '...' : mk.value}"`));
      }
    }
    if (missingKeys.length > 10) {
      console.log(dim(`  ... and ${missingKeys.length - 10} more`));
    }
  }
}

function colorCoverage(pct) {
  const str = `${pct}%`;
  if (pct >= 95) return green(str);
  if (pct >= 75) return yellow(str);
  return red(str);
}

function coverageBar(total, done) {
  const pct = total > 0 ? done / total : 0;
  const filled = Math.round(pct * 15);
  const empty = 15 - filled;
  const bar = green('█'.repeat(filled)) + dim('░'.repeat(empty));
  return `  ${bar}`;
}

function printHelp() {
  console.log(`
  @rtl-first/translation-kit — Find missing translation keys

  Usage:
    rtl-translation-kit --source <path> --target <path> [options]
    rtl-translation-kit <project-path>                   (auto-detect)

  Compare mode:
    -s, --source <path>   Source locale file or folder (e.g. en.json or i18n/en-US/)
    -t, --target <path>   Target locale file or folder (e.g. ar.json or i18n/ar-TN/)
    -o, --output <file>   Export missing keys as JSON (ready for translators)

  Auto-detect mode:
    <project-path>        Scan a project for locale files and report gaps

  Options:
    --format <type>       Output: terminal (default) or json
    -h, --help            Show this help
    --version             Show version

  Examples:
    rtl-translation-kit --source i18n/en-US --target i18n/ar-TN
    rtl-translation-kit --source en.json --target ar.json -o missing.json
    rtl-translation-kit ./my-project
  `);
}
