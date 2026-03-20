#!/usr/bin/env node

/**
 * @rtl-first/patch-generator CLI
 */

const { run } = require('../index');

const HELP = `
  @rtl-first/patch-generator

  Generate rebaseable RTL patches organized by layer.
  Apply after every upstream rebase to maintain RTL support.

  Usage:
    npx @rtl-first/patch-generator <directory> [options]

  Options:
    --layers <list>    Comma-separated layers to patch: 2,3,4 (default: 2,3,4)
    --audit <file>     Path to rtl-audit JSON output (optional)
    --lang <code>      Target language code (default: ar)
    --output <dir>     Output directory (default: .rtl-patches)
    --dry-run          Show what would be generated
    --json             Output as JSON
    --help             Show this help message
    --version          Show version

  Layers:
    2    Direction — inject dir="rtl" on root element
    3    CSS       — convert physical to logical properties
    4    Locale    — scaffold Arabic translation files

  Examples:
    npx @rtl-first/patch-generator ./my-fork
    npx @rtl-first/patch-generator ./my-fork --layers 2,3
    npx @rtl-first/patch-generator ./my-fork --audit audit.json
    npx @rtl-first/patch-generator ./my-fork --dry-run

  After upstream rebase:
    git rebase upstream/main
    bash .rtl-patches/apply-all.sh

  Part of rtl-first: https://github.com/imohad/rtl-first
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    dir: null,
    layers: [2, 3, 4],
    auditFile: null,
    lang: 'ar',
    output: '.rtl-patches',
    dryRun: false,
    json: false,
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--layers' && i + 1 < args.length) {
      options.layers = args[++i].split(',').map(Number).filter(n => [2, 3, 4, 5].includes(n));
    }
    else if (arg === '--audit' && i + 1 < args.length) options.auditFile = args[++i];
    else if (arg === '--lang' && i + 1 < args.length) options.lang = args[++i];
    else if (arg === '--output' && i + 1 < args.length) options.output = args[++i];
    else if (!arg.startsWith('-')) options.dir = arg;
    else {
      console.error(`  Unknown option: ${arg}`);
      console.error('  Run with --help for usage information');
      process.exit(1);
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv);

  if (options.help) { console.log(HELP); process.exit(0); }
  if (options.version) {
    const pkg = require('../package.json');
    console.log(pkg.version);
    process.exit(0);
  }

  if (!options.dir) {
    console.error('\n  Error: Please specify a directory');
    console.error('  Usage: npx @rtl-first/patch-generator <directory>\n');
    process.exit(1);
  }

  const result = run(options.dir, {
    auditFile: options.auditFile,
    layers: options.layers,
    lang: options.lang,
    output: options.output,
    dryRun: options.dryRun,
    json: options.json
  });

  if (options.json) {
    console.log(JSON.stringify(result.report, null, 2));
  } else {
    console.log(result.report);
  }

  process.exit(result.success ? 0 : 1);
}

main();
