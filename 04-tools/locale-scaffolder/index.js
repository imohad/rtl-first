/**
 * @rtl-first/locale-scaffolder
 * Scaffold a new locale and wire it into any i18n system with one command.
 *
 * Part of the rtl-first framework: https://github.com/imohad/rtl-first
 */

const path = require('path');
const fs = require('fs');
const { findLocaleFiles, detectI18nLibrary, findI18nConfig } = require('./lib/detect');
const { scaffoldLocaleFiles, updateI18nConfig, generateLocaleSwitcher } = require('./lib/scaffold');
const { generateReport, generateJSONReport } = require('./lib/report');

/**
 * Run the locale scaffolder on a project directory
 * @param {string} dir - Path to the project directory
 * @param {object} options
 * @param {string} options.lang - Target language code (default: 'ar')
 * @param {boolean} options.dryRun - Don't write changes (default: false)
 * @param {boolean} options.force - Overwrite existing locale (default: false)
 * @param {string} options.stubMode - How to handle values: 'copy' | 'empty' | 'prefix' (default: 'copy')
 * @param {boolean} options.noSwitcher - Don't generate LocaleSwitcher component (default: false)
 * @param {boolean} options.json - Return JSON (default: false)
 */
function run(dir, options = {}) {
  const {
    lang = 'ar',
    dryRun = false,
    force = false,
    stubMode = 'copy',
    noSwitcher = false,
    json = false
  } = options;

  const absDir = path.resolve(dir);

  if (!fs.existsSync(absDir)) {
    const msg = `Directory not found: ${absDir}`;
    return { success: false, report: json ? { error: msg } : `\n  Error: ${msg}\n` };
  }

  // Step 1: Detect
  const i18nLib = detectI18nLibrary(absDir);
  const localeInfo = findLocaleFiles(absDir);
  const configFiles = findI18nConfig(absDir);

  const detection = { i18nLib, localeInfo, configFiles };

  if (!localeInfo.sourceLocale) {
    const msg = 'No source locale files found. Make sure your project has i18n set up with at least an English locale.';
    return {
      success: false,
      detection,
      report: json ? { error: msg } : `\n  ${msg}\n`
    };
  }

  // Step 2: Scaffold locale files
  const scaffoldResult = scaffoldLocaleFiles(absDir, localeInfo, lang, { dryRun, force, stubMode });

  // Step 3: Update i18n config
  const configResult = updateI18nConfig(configFiles, lang, i18nLib, { dryRun });

  // Step 4: Generate LocaleSwitcher
  let switcherResult = null;
  if (!noSwitcher && !scaffoldResult.alreadyExists) {
    const switcher = generateLocaleSwitcher(i18nLib, lang);
    const switcherDir = path.join(absDir, 'rtl-overrides', 'components');
    const switcherPath = path.join(switcherDir, switcher.fileName);

    if (!dryRun) {
      fs.mkdirSync(switcherDir, { recursive: true });
      fs.writeFileSync(switcherPath, switcher.content, 'utf8');
    }
    switcherResult = switcher;
    scaffoldResult.changes.push(`Generated rtl-overrides/components/${switcher.fileName}`);
  }

  // Step 5: Report
  const report = json
    ? generateJSONReport(detection, scaffoldResult, configResult, switcherResult)
    : generateReport(detection, scaffoldResult, configResult, switcherResult, { dryRun });

  return {
    success: scaffoldResult.errors.length === 0,
    detection,
    scaffold: scaffoldResult,
    config: configResult,
    switcher: switcherResult,
    report
  };
}

module.exports = { run, findLocaleFiles, detectI18nLibrary };
