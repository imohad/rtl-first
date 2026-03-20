/**
 * @rtl-first/direction-injector
 * Automatically inject dir="rtl" and lang="ar" into any web project's root element.
 *
 * Part of the rtl-first framework: https://github.com/imohad/rtl-first
 *
 * Usage:
 *   npx @rtl-first/direction-injector ./my-project
 *   npx @rtl-first/direction-injector ./my-project --lang ar --dry-run
 *   npx @rtl-first/direction-injector ./my-project --detect-only
 *
 * Programmatic:
 *   const { run } = require('@rtl-first/direction-injector');
 *   const result = run('./my-project', { lang: 'ar' });
 */

const path = require('path');
const { detectFramework } = require('./lib/detect');
const { inject } = require('./lib/inject');
const { generateReport, generateDetectReport, generateJSONReport } = require('./lib/report');

/**
 * Run the direction injector on a project directory
 * @param {string} dir - Path to the project directory
 * @param {object} options - Options
 * @param {string} options.lang - Language code (default: 'ar')
 * @param {boolean} options.dryRun - Don't write changes (default: false)
 * @param {boolean} options.detectOnly - Only detect framework, don't inject (default: false)
 * @param {boolean} options.json - Return JSON instead of formatted string (default: false)
 * @returns {object} Result object with detection and injection info
 */
function run(dir, options = {}) {
  const {
    lang = 'ar',
    dryRun = false,
    detectOnly = false,
    json = false
  } = options;

  const absDir = path.resolve(dir);

  // Step 1: Detect framework
  const detection = detectFramework(absDir);

  if (detection.error) {
    return {
      success: false,
      detection,
      report: json ? { error: detection.error } : `\n  Error: ${detection.error}\n`
    };
  }

  // Detect-only mode
  if (detectOnly) {
    return {
      success: true,
      detection,
      report: json ? detection : generateDetectReport(detection)
    };
  }

  // Step 2: Check if we can inject
  if (!detection.rootFile && detection.type !== 'nuxt-config') {
    const msg = `Could not find root file for ${detection.label || 'unknown framework'}. ` +
                `Please specify the file manually with --file flag.`;
    return {
      success: false,
      detection,
      injection: { error: msg },
      report: json ? { error: msg } : `\n  Error: ${msg}\n`
    };
  }

  // Step 3: Determine the file to modify
  let targetFile;
  if (detection.type === 'nuxt-config') {
    // For Nuxt, modify the config file
    for (const cf of detection.configFiles) {
      const fullPath = path.join(absDir, cf);
      const fs = require('fs');
      if (fs.existsSync(fullPath)) {
        targetFile = fullPath;
        break;
      }
    }
  } else {
    targetFile = path.join(absDir, detection.rootFile);
  }

  if (!targetFile) {
    return {
      success: false,
      detection,
      injection: { error: 'Could not determine target file for injection' }
    };
  }

  // Step 4: Inject
  const injectionResult = inject(targetFile, detection.type, lang, { dryRun });

  // Step 5: Generate report
  const report = json
    ? generateJSONReport(detection, injectionResult)
    : generateReport(detection, injectionResult, { lang });

  return {
    success: !injectionResult.error,
    detection,
    injection: injectionResult,
    report
  };
}

module.exports = { run, detectFramework, inject };
