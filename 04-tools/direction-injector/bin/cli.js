#!/usr/bin/env node

/**
 * @rtl-first/direction-injector CLI
 *
 * Usage:
 *   npx @rtl-first/direction-injector ./my-project
 *   npx @rtl-first/direction-injector ./my-project --lang ar
 *   npx @rtl-first/direction-injector ./my-project --dry-run
 *   npx @rtl-first/direction-injector ./my-project --detect-only
 *   npx @rtl-first/direction-injector ./my-project --json
 */

const { run } = require('../index');

const HELP = `
  @rtl-first/direction-injector

  Automatically inject dir="rtl" and lang into your project's root element.
  Detects your framework and modifies the correct file.

  Usage:
    npx @rtl-first/direction-injector <directory> [options]

  Options:
    --lang <code>    Language code (default: ar)
    --dry-run        Show changes without modifying files
    --detect-only    Only detect framework, don't inject
    --json           Output as JSON
    --help           Show this help message
    --version        Show version

  Supported Frameworks:
    Next.js (App Router & Pages Router)
    Nuxt 3
    Remix
    SvelteKit
    Angular
    Vite (React/Vue/Svelte)
    Create React App
    Static HTML

  Examples:
    npx @rtl-first/direction-injector ./my-next-app
    npx @rtl-first/direction-injector ./my-project --lang he --dry-run
    npx @rtl-first/direction-injector . --detect-only

  Part of rtl-first: https://github.com/imohad/rtl-first
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    dir: null,
    lang: 'ar',
    dryRun: false,
    detectOnly: false,
    json: false,
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--detect-only') {
      options.detectOnly = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--lang' && i + 1 < args.length) {
      options.lang = args[++i];
    } else if (!arg.startsWith('-')) {
      options.dir = arg;
    } else {
      console.error(`  Unknown option: ${arg}`);
      console.error('  Run with --help for usage information');
      process.exit(1);
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (options.version) {
    const pkg = require('../package.json');
    console.log(pkg.version);
    process.exit(0);
  }

  if (!options.dir) {
    console.error('\n  Error: Please specify a directory');
    console.error('  Usage: npx @rtl-first/direction-injector <directory>\n');
    process.exit(1);
  }

  const result = run(options.dir, {
    lang: options.lang,
    dryRun: options.dryRun,
    detectOnly: options.detectOnly,
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
