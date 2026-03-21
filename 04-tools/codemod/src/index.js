import { readFileSync, writeFileSync } from 'fs';
import { relative } from 'path';
import { transform } from './engine.js';

// Re-export for backward compatibility
export { transformCSSWithRegex as transformContent } from './transforms/css-regex.js';

/**
 * Process a file: read, transform, optionally write.
 *
 * @param {string} filePath - Absolute path to file
 * @param {string} projectPath - Project root for relative paths
 * @param {object} options
 * @param {boolean} options.dryRun - Preview only
 * @param {boolean} options.camelCase - Process camelCase CSS-in-JS
 * @param {'auto'|'ast'|'regex'} options.mode - Transform engine
 * @param {boolean} options.shorthand - Decompose shorthand (AST only)
 * @returns {Promise<object>} Result with changes, warnings, engine used
 */
export async function processFile(filePath, projectPath, options = {}) {
  const { dryRun = false, camelCase = true, mode = 'auto', shorthand = true } = options;
  const relPath = relative(projectPath, filePath);

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { file: relPath, error: `Could not read: ${err.message}`, changes: [], warnings: [] };
  }

  let result;
  try {
    result = await transform(content, filePath, { mode, camelCase, shorthand });
  } catch (err) {
    return { file: relPath, error: err.message, changes: [], warnings: [] };
  }

  if (result.changes.length === 0) {
    return { file: relPath, changes: [], warnings: [], modified: false, engine: result.engine };
  }

  if (!dryRun) {
    try {
      writeFileSync(filePath, result.transformed, 'utf-8');
    } catch (err) {
      return { file: relPath, error: `Could not write: ${err.message}`, changes: result.changes, warnings: result.warnings };
    }
  }

  return {
    file: relPath,
    changes: result.changes,
    warnings: result.warnings,
    modified: result.changes.length > 0,
    dryRun,
    engine: result.engine,
    note: result.note,
  };
}
