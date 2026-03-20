#!/usr/bin/env node

import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { processFile } from './index.js';
import { walkFiles } from './walker.js';

// ── Parse arguments ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetPath = null;
let dryRun = false;
let extensions = ['.css', '.scss', '.less', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
let verbose = false;
let noCamelCase = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run' || args[i] === '-d') {
    dryRun = true;
  } else if (args[i] === '--ext' && args[i + 1]) {
    extensions = args[++i].split(',').map(e => e.startsWith('.') ? e : `.${e}`);
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    verbose = true;
  } else if (args[i] === '--no-camel') {
    noCamelCase = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--version') {
    console.log('0.1.0');
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    targetPath = args[i];
  }
}

if (!targetPath) {
  console.error('Error: provide a path to transform.\n');
  printHelp();
  process.exit(1);
}

const resolvedPath = resolve(targetPath);
if (!existsSync(resolvedPath)) {
  console.error(`Error: path "${resolvedPath}" does not exist.`);
  process.exit(1);
}

// ── Run ─────────────────────────────────────────────────────────────────────

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

console.log('');
console.log(bold(`  RTL Codemod${dryRun ? dim(' (dry run)') : ''}`));
console.log(dim(`  Converting physical CSS properties → logical properties`));
console.log('');

const files = walkFiles(resolvedPath, extensions);
let totalChanges = 0;
let totalWarnings = 0;
let filesModified = 0;

for (const filePath of files) {
  const result = processFile(filePath, resolvedPath, {
    dryRun,
    camelCase: !noCamelCase,
  });

  if (result.error) {
    console.log(`  ${yellow('⚠')}  ${result.file}: ${result.error}`);
    continue;
  }

  if (result.changes.length === 0) continue;

  filesModified++;
  const changeCount = result.changes.reduce((s, c) => s + c.count, 0);
  totalChanges += changeCount;

  if (dryRun) {
    console.log(`  ${cyan('→')}  ${result.file} ${dim(`(${changeCount} changes)`)}`);
  } else {
    console.log(`  ${green('✓')}  ${result.file} ${dim(`(${changeCount} changes)`)}`);
  }

  if (verbose) {
    for (const change of result.changes) {
      console.log(dim(`     ${change.rule} (${change.count}×)`));
    }
  }

  if (result.warnings.length > 0) {
    totalWarnings += result.warnings.length;
    for (const warn of result.warnings) {
      console.log(`     ${yellow('⚠')} ${warn.rule} — ${yellow('may be intentional')}`);
    }
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('');
console.log(dim('  ─'.repeat(25)));
console.log('');

if (filesModified === 0) {
  console.log(green('  No physical CSS properties found. Already RTL-ready!'));
} else if (dryRun) {
  console.log(`  ${bold('Dry run complete:')}`);
  console.log(`  ${cyan(`${filesModified}`)} files would be modified (${cyan(`${totalChanges}`)} changes)`);
  if (totalWarnings > 0) {
    console.log(`  ${yellow(`${totalWarnings}`)} warnings (text-align changes that may be intentional)`);
  }
  console.log('');
  console.log(dim('  Run without --dry-run to apply changes.'));
} else {
  console.log(`  ${bold('Done:')}`);
  console.log(`  ${green(`${filesModified}`)} files modified (${green(`${totalChanges}`)} changes)`);
  if (totalWarnings > 0) {
    console.log(`  ${yellow(`${totalWarnings}`)} warnings — review text-align changes manually`);
  }
}

console.log('');

// ── Help ────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
  @rtl-first/codemod — Convert CSS physical properties to logical

  Usage:
    rtl-codemod [options] <path>

  Arguments:
    path                  Path to source directory

  Options:
    -d, --dry-run         Preview changes without modifying files
    --ext <extensions>    File extensions to process (default: .css,.scss,.less,.ts,.tsx,.js,.jsx,.vue,.svelte)
    --no-camel            Skip camelCase conversions (CSS-in-JS)
    -v, --verbose         Show detailed rule-by-rule changes
    -h, --help            Show this help
    --version             Show version

  Examples:
    rtl-codemod --dry-run ./src
    rtl-codemod ./src
    rtl-codemod ./src --ext .css,.tsx --verbose
    rtl-codemod ./src --no-camel
  `);
}
