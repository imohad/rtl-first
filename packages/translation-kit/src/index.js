import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, relative, extname, basename } from 'path';

/**
 * Compare two locale files or folders and find missing translation keys.
 *
 * Supports:
 *   - Flat files: en.json vs ar.json
 *   - Locale folders: en-US/*.json vs ar-TN/*.json
 *   - Nested JSON keys (dot-notation flattening)
 *
 * @param {string} sourcePath - Path to source locale (file or folder)
 * @param {string} targetPath - Path to target locale (file or folder)
 * @returns {object} Gap report
 */
export function compareLocales(sourcePath, targetPath) {
  const sourceIsDir = existsSync(sourcePath) && isDirectory(sourcePath);
  const targetIsDir = existsSync(targetPath) && isDirectory(targetPath);
  const targetExists = existsSync(targetPath);

  if (sourceIsDir) {
    return compareFolders(sourcePath, targetPath, targetExists && targetIsDir);
  }
  return compareFiles(sourcePath, targetPath, targetExists);
}

/**
 * Compare two locale folders (e.g. en-US/ vs ar-TN/).
 */
function compareFolders(sourceDir, targetDir, targetExists) {
  const sourceFiles = getJsonFiles(sourceDir);
  const results = [];
  let totalSource = 0;
  let totalTarget = 0;
  let totalMissing = 0;
  const allMissingKeys = [];

  for (const fileName of sourceFiles) {
    const sourcePath = join(sourceDir, fileName);
    const targetPath = targetExists ? join(targetDir, fileName) : null;
    const targetFileExists = targetPath && existsSync(targetPath);

    const sourceKeys = flattenJson(sourcePath);
    const targetKeys = targetFileExists ? flattenJson(targetPath) : {};

    const sourceCount = Object.keys(sourceKeys).length;
    const targetCount = Object.keys(targetKeys).length;

    const missing = [];
    for (const key of Object.keys(sourceKeys)) {
      if (!(key in targetKeys)) {
        missing.push({ key, value: sourceKeys[key], file: fileName });
      }
    }

    // Also find keys in target that don't exist in source (extra keys)
    const extra = [];
    for (const key of Object.keys(targetKeys)) {
      if (!(key in sourceKeys)) {
        extra.push({ key, value: targetKeys[key], file: fileName });
      }
    }

    totalSource += sourceCount;
    totalTarget += targetCount;
    totalMissing += missing.length;
    allMissingKeys.push(...missing);

    results.push({
      file: fileName,
      sourceKeys: sourceCount,
      targetKeys: targetCount,
      missing: missing.length,
      extra: extra.length,
      missingKeys: missing,
      extraKeys: extra,
    });
  }

  // Check for files in target that don't exist in source
  const extraFiles = [];
  if (targetExists) {
    const targetFiles = getJsonFiles(targetDir);
    for (const f of targetFiles) {
      if (!sourceFiles.includes(f)) {
        extraFiles.push(f);
      }
    }
  }

  const coverage = totalSource > 0 ? ((totalTarget / totalSource) * 100).toFixed(1) : '0.0';

  return {
    type: 'folder',
    sourceDir: basename(sourceDir),
    targetDir: targetExists ? basename(targetDir) : null,
    targetExists,
    totalSourceKeys: totalSource,
    totalTargetKeys: totalTarget,
    totalMissing,
    coverage: parseFloat(coverage),
    files: results.filter(r => r.missing > 0 || r.extra > 0),
    allFiles: results,
    allMissingKeys,
    extraFiles,
  };
}

/**
 * Compare two locale files (e.g. en.json vs ar.json).
 */
function compareFiles(sourcePath, targetPath, targetExists) {
  const sourceKeys = flattenJson(sourcePath);
  const targetKeys = targetExists ? flattenJson(targetPath) : {};

  const missing = [];
  for (const key of Object.keys(sourceKeys)) {
    if (!(key in targetKeys)) {
      missing.push({ key, value: sourceKeys[key] });
    }
  }

  const extra = [];
  for (const key of Object.keys(targetKeys)) {
    if (!(key in sourceKeys)) {
      extra.push({ key, value: targetKeys[key] });
    }
  }

  const sourceCount = Object.keys(sourceKeys).length;
  const targetCount = Object.keys(targetKeys).length;
  const coverage = sourceCount > 0 ? ((targetCount / sourceCount) * 100).toFixed(1) : '0.0';

  return {
    type: 'file',
    sourceFile: basename(sourcePath),
    targetFile: targetExists ? basename(targetPath) : null,
    targetExists,
    totalSourceKeys: sourceCount,
    totalTargetKeys: targetCount,
    totalMissing: missing.length,
    coverage: parseFloat(coverage),
    missingKeys: missing,
    extraKeys: extra,
  };
}

/**
 * Generate a JSON file with all missing keys pre-filled with source values.
 * This can be used as a starting point for translators.
 */
export function generateMissingKeysFile(report, outputPath) {
  const keys = report.allMissingKeys || report.missingKeys || [];
  const result = {};

  for (const { key, value } of keys) {
    setNestedValue(result, key, value);
  }

  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  return { path: outputPath, keyCount: keys.length };
}

/**
 * Auto-detect locale folders in a project and compare source vs RTL targets.
 */
export function autoDetect(projectPath) {
  const I18N_DIRS = ['i18n', 'locales', 'lang', 'languages', 'translations', 'resources', 'messages'];
  const RTL_PREFIXES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];

  const results = [];

  for (const dirName of I18N_DIRS) {
    const found = findDirs(projectPath, dirName, 5);
    for (const i18nDir of found) {
      const subdirs = getSubdirs(i18nDir);
      const enDir = subdirs.find(d => d.startsWith('en'));
      if (!enDir) continue;

      for (const sub of subdirs) {
        if (RTL_PREFIXES.some(p => sub.startsWith(p))) {
          const report = compareFolders(
            join(i18nDir, enDir),
            join(i18nDir, sub),
            true
          );
          results.push({ source: enDir, target: sub, i18nDir, ...report });
        }
      }

      // If no RTL folder found, report it
      if (!subdirs.some(d => RTL_PREFIXES.some(p => d.startsWith(p)))) {
        const sourceKeys = countKeysInDir(join(i18nDir, enDir));
        results.push({
          source: enDir,
          target: null,
          i18nDir,
          type: 'folder',
          targetExists: false,
          totalSourceKeys: sourceKeys,
          totalTargetKeys: 0,
          totalMissing: sourceKeys,
          coverage: 0,
          files: [],
          allMissingKeys: [],
        });
      }
    }
  }

  // Also check for flat files
  const flatEnFiles = findFilesRecursive(projectPath, 'en.json', 5);
  for (const enPath of flatEnFiles) {
    const dir = join(enPath, '..');
    const arPath = join(dir, 'ar.json');
    if (existsSync(arPath)) {
      results.push({ source: 'en.json', target: 'ar.json', ...compareFiles(enPath, arPath, true) });
    }
  }

  return results;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function flattenJson(filePath) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return flatten(data);
  } catch {
    return {};
  }
}

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function setNestedValue(obj, dotKey, value) {
  const parts = dotKey.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function getJsonFiles(dir) {
  try {
    return readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

function getSubdirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

function isDirectory(p) {
  try {
    const stats = readdirSync(p);
    return true;
  } catch {
    return false;
  }
}

function countKeysInDir(dir) {
  let total = 0;
  for (const f of getJsonFiles(dir)) {
    total += Object.keys(flattenJson(join(dir, f))).length;
  }
  return total;
}

function findDirs(root, name, maxDepth, depth = 0) {
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
  const results = [];
  if (depth > maxDepth) return results;
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
      if (entry.name === name) results.push(join(root, entry.name));
      results.push(...findDirs(join(root, entry.name), name, maxDepth, depth + 1));
    }
  } catch {}
  return results;
}

function findFilesRecursive(root, fileName, maxDepth, depth = 0) {
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
  const results = [];
  if (depth > maxDepth) return results;
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const fullPath = join(root, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFilesRecursive(fullPath, fileName, maxDepth, depth + 1));
      } else if (entry.name === fileName) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}
