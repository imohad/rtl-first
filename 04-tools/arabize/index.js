/**
 * @rtl-first/arabize
 * Arabize any open-source platform with one command.
 *
 * This is the master script that orchestrates:
 *   1. Direction injection (dir="rtl" + lang="ar")
 *   2. Locale scaffolding (ar.json + config + LocaleSwitcher)
 *   3. Patch generation (CSS codemod scripts for rebase)
 *
 * Part of the rtl-first framework: https://github.com/imohad/rtl-first
 */

const { runPipeline } = require('./lib/pipeline');
const { generateReport, generateJSONReport } = require('./lib/report');

/**
 * Arabize a project
 * @param {string} dir - Project directory
 * @param {object} options
 * @param {string} options.lang - Target language (default: 'ar')
 * @param {boolean} options.dryRun - Preview changes (default: false)
 * @param {boolean} options.skipCSS - Skip CSS patch generation (default: false)
 * @param {boolean} options.skipLocale - Skip locale scaffolding (default: false)
 * @param {boolean} options.skipDirection - Skip direction injection (default: false)
 * @param {string} options.stubMode - Locale stub mode: copy|empty|prefix (default: 'copy')
 * @param {boolean} options.json - Return JSON (default: false)
 */
function run(dir, options = {}) {
  const result = runPipeline(dir, options);

  if (result.error) {
    return {
      success: false,
      report: options.json ? { error: result.error } : `\n  Error: ${result.error}\n`
    };
  }

  const report = options.json
    ? generateJSONReport(result)
    : generateReport(result);

  return {
    success: result.success,
    result,
    report
  };
}

module.exports = { run };
