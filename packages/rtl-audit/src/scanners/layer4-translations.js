import { readFileSync } from 'fs';
import { findFiles } from '../utils/walker.js';

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];

/**
 * Scan for translation file completeness.
 */
export function scanLayer4(projectPath) {
  // Find all JSON locale files
  const allJson = findFiles(projectPath, 'en.json', 8);

  // Also search common i18n directory patterns
  const localePatterns = ['locales', 'i18n', 'lang', 'languages', 'translations', 'resources'];
  let enFiles = [];
  let arFiles = [];

  // Find en.json files
  for (const pattern of localePatterns) {
    enFiles.push(...findFiles(projectPath, 'en.json', 8));
  }
  enFiles.push(...allJson);
  enFiles = [...new Set(enFiles)];

  // Find ar.json files
  for (const locale of RTL_LOCALES) {
    const found = findFiles(projectPath, `${locale}.json`, 8);
    if (locale === 'ar') arFiles = found;
  }

  // Also check for en.ts, en.js patterns (some projects use these)
  const enTsFiles = findFiles(projectPath, 'en.ts', 8);
  const arTsFiles = findFiles(projectPath, 'ar.ts', 8);

  if (enFiles.length === 0 && enTsFiles.length === 0) {
    return {
      status: 'warn',
      summary: 'No i18n files detected',
      detail: 'Could not find en.json or similar locale files. The project may not use i18n, or may use a non-standard file structure.',
      sourceFiles: [],
      targetFiles: [],
      gaps: [],
    };
  }

  // Parse and compare keys
  const results = [];

  for (const enPath of enFiles) {
    try {
      const enContent = JSON.parse(readFileSync(enPath, 'utf-8'));
      const enKeys = flattenKeys(enContent);
      const enDir = enPath.substring(0, enPath.lastIndexOf('/'));

      // Look for ar.json in the same directory
      const arPath = enPath.replace(/\/en\.json$/, '/ar.json');
      let arKeys = [];
      let arExists = false;

      try {
        const arContent = JSON.parse(readFileSync(arPath, 'utf-8'));
        arKeys = flattenKeys(arContent);
        arExists = true;
      } catch {
        // ar.json doesn't exist in this directory
      }

      const missing = enKeys.filter(k => !arKeys.includes(k));

      results.push({
        sourcePath: enPath,
        targetPath: arExists ? arPath : null,
        sourceKeyCount: enKeys.length,
        targetKeyCount: arKeys.length,
        missingKeys: missing.length,
        missingKeysSample: missing.slice(0, 10),
        complete: missing.length === 0 && arExists,
      });
    } catch {
      // Skip unparseable JSON
    }
  }

  if (results.length === 0) {
    return {
      status: 'warn',
      summary: 'Found locale files but could not parse them',
      detail: 'The en.json files were found but could not be parsed as valid JSON.',
      sourceFiles: enFiles,
      targetFiles: arFiles,
      gaps: [],
    };
  }

  const totalSourceKeys = results.reduce((s, r) => s + r.sourceKeyCount, 0);
  const totalTargetKeys = results.reduce((s, r) => s + r.targetKeyCount, 0);
  const totalMissing = results.reduce((s, r) => s + r.missingKeys, 0);
  const hasArabic = results.some(r => r.targetPath !== null);

  if (hasArabic && totalMissing === 0) {
    return {
      status: 'pass',
      summary: `Arabic translations complete (${totalTargetKeys} keys)`,
      detail: 'ar.json exists and covers all keys from en.json.',
      sourceFiles: enFiles,
      targetFiles: arFiles,
      gaps: results,
    };
  }

  if (hasArabic && totalMissing > 0) {
    return {
      status: 'warn',
      summary: `Arabic translations incomplete — ${totalMissing} keys missing`,
      detail: `en.json has ${totalSourceKeys} keys, ar.json has ${totalTargetKeys} keys.`,
      sourceFiles: enFiles,
      targetFiles: arFiles,
      gaps: results,
      fix: `npx @rtl-first/translation-kit --source en.json --target ar.json`,
    };
  }

  return {
    status: 'fail',
    summary: `No Arabic translation found (en.json has ${totalSourceKeys} keys)`,
    detail: 'ar.json does not exist. Create it with all keys from en.json.',
    sourceFiles: enFiles,
    targetFiles: [],
    gaps: results,
    fix: 'Create ar.json in the same directory as en.json with translated strings.',
  };
}

/**
 * Flatten a nested JSON object into dot-notation keys.
 */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}
