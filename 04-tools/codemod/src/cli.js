#!/usr/bin/env node

import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { processFile } from './index.js';
import { walkFiles } from './walker.js';
import { getEngineInfo } from './engine.js';

// ── ANSI colors ─────────────────────────────────────────────────────────────
const bold  = s => `\x1b[1m${s}\x1b[0m`;
const dim   = s => `\x1b[2m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow= s => `\x1b[33m${s}\x1b[0m`;
const cyan  = s => `\x1b[36m${s}\x1b[0m`;
const red   = s => `\x1b[31m${s}\x1b[0m`;

// ── Parse arguments ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetPath = null;
let dryRun = false;
let extensions = ['.css', '.scss', '.less', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
let verbose = false;
let noCamelCase = false;
let mode = 'auto';     // auto | ast | regex
let shorthand = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run' || args[i] === '-d') {
    dryRun = true;
  } else if (args[i] === '--ext' && args[i + 1]) {
    extensions = args[++i].split(',').map(e => e.startsWith('.') ? e : `.${e}`);
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    verbose = true;
  } else if (args[i] === '--no-camel') {
    noCamelCase = true;
  } else if (args[i] === '--quick') {
    mode = 'regex';
  } else if (args[i] === '--strict') {
    mode = 'ast';
  } else if (args[i] === '--no-shorthand') {
    shorthand = false;
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--version') {
    console.log('0.2.0');
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    targetPath = args[i];
  }
}

if (!targetPath) {
  console.error('\n  Error: Please provide a path to process.\n');
  printHelp();
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const projectPath = resolve(targetPath);

  if (!existsSync(projectPath)) {
    throw new Error(`Path does not exist: ${projectPath}`);
  }

  console.log('');
  console.log(bold(`  RTL Codemod v0.2.0${dryRun ? dim(' (dry run)') : ''}`));
  console.log(`  ${dim('Converting physical → logical CSS properties')}`);

  // Show engine info
  const engines = await getEngineInfo();
  if (verbose) {
    console.log(`  ${dim('Engines:')} PostCSS ${engines.postcss ? green('✓') : red('✗')} | jscodeshift ${engines.jscodeshift ? green('✓') : red('✗')} | regex ${green('✓')}`);
    console.log(`  ${dim('Mode:')} ${mode}`);
  }

  console.log('');

  const extSet = new Set(extensions);
  const files = walkFiles(projectPath, extSet);

  if (files.length === 0) {
    console.log(`  No files found matching: ${extensions.join(', ')}\n`);
    return;
  }

  console.log(`  ${dim(`Scanning ${files.length} files...`)}\n`);

  let filesModified = 0;
  let totalChanges = 0;
  let totalWarnings = 0;
  const enginesUsed = new Set();
  const errors = [];

  for (const file of files) {
    const result = await processFile(file, projectPath, {
      dryRun,
      camelCase: !noCamelCase,
      mode,
      shorthand,
    });

    if (result.error) {
      errors.push({ file: result.file, error: result.error });
      continue;
    }

    if (result.engine) enginesUsed.add(result.engine);

    if (result.changes.length > 0) {
      filesModified++;
      const changeCount = result.changes.reduce((sum, c) => sum + c.count, 0);
      totalChanges += changeCount;
      totalWarnings += result.warnings.length;

      if (verbose) {
        const engineTag = result.engine ? dim(` [${result.engine}]`) : '';
        console.log(`  ${cyan(result.file)}${engineTag}`);
        for (const c of result.changes) {
          const prefix = result.warnings.some(w => w.rule === c.rule) ? yellow('⚠') : green('✓');
          console.log(`    ${prefix} ${c.rule} (${c.count})`);
        }
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('');

  if (errors.length > 0) {
    console.log(`  ${red(`${errors.length} errors:`)}`);
    for (const e of errors) {
      console.log(`    ${red('✗')} ${e.file}: ${e.error}`);
    }
    console.log('');
  }

  if (filesModified === 0) {
    console.log(green('  Already RTL-ready!'));
  } else if (dryRun) {
    console.log(`  ${bold('Dry run complete:')}`);
    console.log(`  ${cyan(`${filesModified}`)} files would be modified (${cyan(`${totalChanges}`)} changes)`);
    if (totalWarnings > 0) {
      console.log(`  ${yellow(`${totalWarnings}`)} warnings (text-align changes that may be intentional)`);
    }
    if (enginesUsed.size > 0) {
      console.log(`  Engines: ${[...enginesUsed].join(', ')}`);
    }
    console.log('');
    console.log(dim('  Run without --dry-run to apply changes.'));
  } else {
    console.log(`  ${bold('Done:')}`);
    console.log(`  ${green(`${filesModified}`)} files modified (${green(`${totalChanges}`)} changes)`);
    if (totalWarnings > 0) {
      console.log(`  ${yellow(`${totalWarnings}`)} warnings — review text-align changes manually`);
    }
    if (enginesUsed.size > 0) {
      console.log(`  Engines: ${[...enginesUsed].join(', ')}`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});

// ── Help ────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
  @rtl-first/codemod v0.2.0 — Convert CSS physical properties to logical

  Usage:
    rtl-codemod [options] <path>

  Arguments:
    path                  Path to source directory

  Options:
    -d, --dry-run         Preview changes without modifying files
    --quick               Use regex engine only (fast, no dependencies)
    --strict              Use AST only (requires: npm install postcss jscodeshift)
    --no-shorthand        Skip shorthand decomposition (margin/padding/border-radius)
    --ext <extensions>    File extensions (default: .css,.scss,.less,.ts,.tsx,.js,.jsx,.vue,.svelte)
    --no-camel            Skip camelCase conversions (CSS-in-JS)
    -v, --verbose         Show detailed changes and engine per file
    -h, --help            Show this help
    --version             Show version

  Engine modes:
    Default (auto)        Best available engine per file type.
    --quick               Always regex — fast, zero dependencies.
    --strict              Always AST — fails if postcss/jscodeshift not installed.

  Examples:
    rtl-codemod --dry-run ./src
    rtl-codemod ./src --strict --verbose
    rtl-codemod ./src --quick --ext .css,.tsx
  `);
}
