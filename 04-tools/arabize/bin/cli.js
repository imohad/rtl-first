#!/usr/bin/env node

/**
 * @rtl-first/arabize CLI
 * The master script — arabize any platform with one command.
 */

const { run } = require('../index');

const HELP = `
  ${'\x1b[35m'}@rtl-first/arabize${'\x1b[0m'}

  Arabize any open-source platform with one command.
  Detects your framework, injects RTL direction, scaffolds locale files,
  and generates rebaseable CSS patches.

  Usage:
    npx @rtl-first/arabize <directory> [options]

  Options:
    --lang <code>      Target language (default: ar)
    --dry-run          Preview all changes without modifying files
    --stub <mode>      Locale stub mode: copy, empty, prefix (default: copy)
    --skip-css         Skip CSS patch generation
    --skip-locale      Skip locale scaffolding
    --skip-direction   Skip direction injection
    --json             Output as JSON
    --help             Show this help message
    --version          Show version

  What it does (in order):
    1. Injects dir="rtl" and lang="ar" on your root HTML element
    2. Copies en.json → ar.json and updates i18n config
    3. Generates a LocaleSwitcher component (React/Vue)
    4. Generates CSS codemod patches in .rtl-patches/

  Examples:
    npx @rtl-first/arabize ./my-dify-fork
    npx @rtl-first/arabize ./my-fork --dry-run
    npx @rtl-first/arabize ./my-fork --lang he
    npx @rtl-first/arabize ./my-fork --stub prefix

  After upstream rebase:
    git rebase upstream/main
    bash .rtl-patches/apply-all.sh

  Part of rtl-first: https://github.com/imohad/rtl-first
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    dir: null,
    lang: 'ar',
    dryRun: false,
    stubMode: 'copy',
    skipCSS: false,
    skipLocale: false,
    skipDirection: false,
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
    else if (arg === '--skip-css') options.skipCSS = true;
    else if (arg === '--skip-locale') options.skipLocale = true;
    else if (arg === '--skip-direction') options.skipDirection = true;
    else if (arg === '--lang' && i + 1 < args.length) options.lang = args[++i];
    else if (arg === '--stub' && i + 1 < args.length) options.stubMode = args[++i];
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
    console.error('  Usage: npx @rtl-first/arabize <directory>\n');
    process.exit(1);
  }

  const result = run(options.dir, {
    lang: options.lang,
    dryRun: options.dryRun,
    stubMode: options.stubMode,
    skipCSS: options.skipCSS,
    skipLocale: options.skipLocale,
    skipDirection: options.skipDirection,
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
