#!/usr/bin/env node

/**
 * @rtl-first/locale-scaffolder CLI
 */

const { run } = require('../index');

const HELP = `
  @rtl-first/locale-scaffolder

  Scaffold a new locale (e.g. Arabic) and wire it into your i18n system.
  Detects your i18n library, copies source locale files, updates config,
  and generates a LocaleSwitcher component.

  Usage:
    npx @rtl-first/locale-scaffolder <directory> [options]

  Options:
    --lang <code>      Target language code (default: ar)
    --dry-run          Show changes without modifying files
    --force            Overwrite if target locale already exists
    --stub <mode>      How to handle values: copy, empty, prefix (default: copy)
    --no-switcher      Don't generate LocaleSwitcher component
    --json             Output as JSON
    --help             Show this help message
    --version          Show version

  Stub modes:
    copy     Keep English values as placeholders (default)
    empty    Set all values to empty strings
    prefix   Prefix values with [AR] for easy spotting

  Supported i18n libraries:
    i18next / react-i18next
    next-intl
    vue-i18n
    react-intl / FormatJS
    Angular i18n
    svelte-i18n

  Examples:
    npx @rtl-first/locale-scaffolder ./my-project
    npx @rtl-first/locale-scaffolder ./my-project --lang he
    npx @rtl-first/locale-scaffolder ./my-project --stub prefix --dry-run

  Part of rtl-first: https://github.com/imohad/rtl-first
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    dir: null,
    lang: 'ar',
    dryRun: false,
    force: false,
    stubMode: 'copy',
    noSwitcher: false,
    json: false,
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--no-switcher') options.noSwitcher = true;
    else if (arg === '--json') options.json = true;
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
    console.error('  Usage: npx @rtl-first/locale-scaffolder <directory>\n');
    process.exit(1);
  }

  const result = run(options.dir, {
    lang: options.lang,
    dryRun: options.dryRun,
    force: options.force,
    stubMode: options.stubMode,
    noSwitcher: options.noSwitcher,
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
