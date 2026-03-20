import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { findFiles } from '../utils/walker.js';

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];
const I18N_DIR_NAMES = ['i18n', 'locales', 'lang', 'languages', 'translations', 'resources', 'messages'];

/**
 * Scan for translation file completeness.
 * Supports two patterns:
 *   1. Flat files: locales/en.json, locales/ar.json
 *   2. Locale folders: i18n/en-US/*.json, i18n/ar-TN/*.json (Dify, Next.js style)
 */
export function scanLayer4(projectPath) {
  // Strategy 1: Look for locale folder pattern (en-US/, ar-TN/, etc.)
  const folderResult = scanLocaleFolders(projectPath);
  if (folderResult) return folderResult;

  // Strategy 2: Look for flat file pattern (en.json, ar.json)
  const flatResult = scanFlatFiles(projectPath);
  if (flatResult) return flatResult;

  return {
    status: 'warn',
    summary: 'No i18n files detected',
    detail: 'Could not find locale files. The project may not use i18n, or may use a non-standard file structure.',
    sourceFiles: [],
    targetFiles: [],
    gaps: [],
  };
}

/**
 * Strategy 1: Locale folders like i18n/en-US/*.json, i18n/ar-TN/*.json
 */
function scanLocaleFolders(projectPath) {
  // Find directories that contain locale subdirectories
  for (const dirName of I18N_DIR_NAMES) {
    const candidates = findI18nDirs(projectPath, dirName, 5);

    for (const i18nDir of candidates) {
      let entries;
      try { entries = readdirSync(i18nDir, { withFileTypes: true }); } catch { continue; }

      const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      // Find English source directory
      const enDir = subdirs.find(d => d.startsWith('en'));
      if (!enDir) continue;

      // Find Arabic/RTL target directory
      const arDir = subdirs.find(d => RTL_LOCALES.some(loc => d.startsWith(loc)));

      const enPath = join(i18nDir, enDir);
      const arPath = arDir ? join(i18nDir, arDir) : null;

      // Count keys across all JSON files in the locale folder
      const enKeys = countKeysInFolder(enPath);
      const arKeys = arPath ? countKeysInFolder(arPath) : { total: 0, files: [] };

      if (enKeys.total === 0) continue;

      // Build per-file gap report
      const gaps = [];
      for (const fileInfo of enKeys.files) {
        const arFile = arKeys.files.find(f => f.name === fileInfo.name);
        const arCount = arFile ? arFile.count : 0;
        gaps.push({
          sourcePath: fileInfo.path,
          targetPath: arFile ? arFile.path : null,
          sourceKeyCount: fileInfo.count,
          targetKeyCount: arCount,
          missingKeys: fileInfo.count - arCount,
        });
      }

      const totalMissing = enKeys.total - arKeys.total;
      const coverage = ((arKeys.total / enKeys.total) * 100).toFixed(1);

      if (arPath && totalMissing === 0) {
        return {
          status: 'pass',
          summary: `Arabic translations complete — ${arDir} (${arKeys.total} keys)`,
          detail: `${enDir} and ${arDir} have matching key counts across ${enKeys.files.length} files.`,
          sourceLocale: enDir,
          targetLocale: arDir,
          sourceFiles: enKeys.files.map(f => f.path),
          targetFiles: arKeys.files.map(f => f.path),
          gaps,
        };
      }

      if (arPath && totalMissing > 0) {
        return {
          status: 'warn',
          summary: `Arabic ${coverage}% complete — ${totalMissing} keys missing (${arDir})`,
          detail: `${enDir}: ${enKeys.total} keys → ${arDir}: ${arKeys.total} keys across ${enKeys.files.length} files.`,
          sourceLocale: enDir,
          targetLocale: arDir,
          sourceFiles: enKeys.files.map(f => f.path),
          targetFiles: arKeys.files.map(f => f.path),
          gaps: gaps.filter(g => g.missingKeys > 0),
        };
      }

      return {
        status: 'fail',
        summary: `No Arabic translation folder (${enDir} has ${enKeys.total} keys)`,
        detail: `Found ${enDir} with ${enKeys.files.length} locale files but no Arabic locale folder.`,
        sourceLocale: enDir,
        targetLocale: null,
        sourceFiles: enKeys.files.map(f => f.path),
        targetFiles: [],
        gaps,
        fix: `Create ${i18nDir}/ar/ directory with translated JSON files matching ${enDir}/.`,
      };
    }
  }

  return null; // No locale folders found
}

/**
 * Strategy 2: Flat files like locales/en.json, locales/ar.json
 */
function scanFlatFiles(projectPath) {
  const enFiles = findFiles(projectPath, 'en.json', 8);
  if (enFiles.length === 0) return null;

  const results = [];

  for (const enPath of enFiles) {
    try {
      const enContent = JSON.parse(readFileSync(enPath, 'utf-8'));
      const enKeys = flattenKeys(enContent);

      // Look for ar.json in the same directory
      const arPath = enPath.replace(/\/en\.json$/, '/ar.json');
      let arKeys = [];
      let arExists = false;

      try {
        const arContent = JSON.parse(readFileSync(arPath, 'utf-8'));
        arKeys = flattenKeys(arContent);
        arExists = true;
      } catch {
        // ar.json doesn't exist
      }

      results.push({
        sourcePath: enPath,
        targetPath: arExists ? arPath : null,
        sourceKeyCount: enKeys.length,
        targetKeyCount: arKeys.length,
        missingKeys: enKeys.length - arKeys.length,
      });
    } catch {
      // Skip unparseable JSON
    }
  }

  if (results.length === 0) return null;

  const totalSource = results.reduce((s, r) => s + r.sourceKeyCount, 0);
  const totalTarget = results.reduce((s, r) => s + r.targetKeyCount, 0);
  const totalMissing = totalSource - totalTarget;
  const hasArabic = results.some(r => r.targetPath !== null);

  if (hasArabic && totalMissing === 0) {
    return {
      status: 'pass',
      summary: `Arabic translations complete (${totalTarget} keys)`,
      detail: 'ar.json exists and covers all keys from en.json.',
      gaps: results,
    };
  }

  if (hasArabic && totalMissing > 0) {
    const coverage = ((totalTarget / totalSource) * 100).toFixed(1);
    return {
      status: 'warn',
      summary: `Arabic ${coverage}% complete — ${totalMissing} keys missing`,
      detail: `en.json: ${totalSource} keys → ar.json: ${totalTarget} keys.`,
      gaps: results,
    };
  }

  return {
    status: 'fail',
    summary: `No Arabic translation found (en.json has ${totalSource} keys)`,
    detail: 'ar.json does not exist.',
    gaps: results,
    fix: 'Create ar.json in the same directory as en.json with translated strings.',
  };
}

/**
 * Find i18n directories by name within the project.
 */
function findI18nDirs(dir, targetName, maxDepth, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;

  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', 'coverage']);

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP.has(entry.name)) continue;
      if (entry.name === targetName) {
        results.push(join(dir, entry.name));
      }
      results.push(...findI18nDirs(join(dir, entry.name), targetName, maxDepth, depth + 1));
    }
  } catch {
    // Skip unreadable dirs
  }

  return results;
}

/**
 * Count translation keys across all JSON files in a locale folder.
 */
function countKeysInFolder(folderPath) {
  const files = [];
  let total = 0;

  try {
    for (const entry of readdirSync(folderPath)) {
      if (!entry.endsWith('.json')) continue;
      const filePath = join(folderPath, entry);
      try {
        const content = JSON.parse(readFileSync(filePath, 'utf-8'));
        const count = countKeysDeep(content);
        files.push({ name: entry, path: filePath, count });
        total += count;
      } catch {
        // Skip invalid JSON
      }
    }
  } catch {
    // Folder unreadable
  }

  return { total, files };
}

function countKeysDeep(obj) {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      count += countKeysDeep(value);
    } else {
      count++;
    }
  }
  return count;
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
