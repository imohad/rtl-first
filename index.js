import { readFileSync, writeFileSync } from 'fs';
import { relative } from 'path';

/**
 * CSS physical → logical property conversion rules.
 *
 * Built from real-world experience contributing to AFFiNE (65k+ stars).
 * Lessons learned:
 *   - border-left\s*: needs \s* because some code writes "border-left : 1px"
 *   - text-align: left may be intentional (e.g. code blocks) — flag as warning
 *   - camelCase in CSS-in-JS needs word boundary context
 */

// ── kebab-case rules (CSS files, template strings) ──────────────────────────

const KEBAB_RULES = [
  // Border width (must come before border shorthand to avoid double-matching)
  { find: /border-left-width(\s*:\s*)/g,  replace: 'border-inline-start-width$1', label: 'border-left-width → border-inline-start-width' },
  { find: /border-right-width(\s*:\s*)/g, replace: 'border-inline-end-width$1',   label: 'border-right-width → border-inline-end-width' },

  // Border color
  { find: /border-left-color(\s*:\s*)/g,  replace: 'border-inline-start-color$1', label: 'border-left-color → border-inline-start-color' },
  { find: /border-right-color(\s*:\s*)/g, replace: 'border-inline-end-color$1',   label: 'border-right-color → border-inline-end-color' },

  // Border style
  { find: /border-left-style(\s*:\s*)/g,  replace: 'border-inline-start-style$1', label: 'border-left-style → border-inline-start-style' },
  { find: /border-right-style(\s*:\s*)/g, replace: 'border-inline-end-style$1',   label: 'border-right-style → border-inline-end-style' },

  // Border shorthand (after width/color/style to avoid false matches)
  { find: /border-left(\s*:\s*)/g,  replace: 'border-inline-start$1', label: 'border-left → border-inline-start' },
  { find: /border-right(\s*:\s*)/g, replace: 'border-inline-end$1',   label: 'border-right → border-inline-end' },

  // Margin
  { find: /margin-left(\s*:\s*)/g,  replace: 'margin-inline-start$1', label: 'margin-left → margin-inline-start' },
  { find: /margin-right(\s*:\s*)/g, replace: 'margin-inline-end$1',   label: 'margin-right → margin-inline-end' },

  // Padding
  { find: /padding-left(\s*:\s*)/g,  replace: 'padding-inline-start$1', label: 'padding-left → padding-inline-start' },
  { find: /padding-right(\s*:\s*)/g, replace: 'padding-inline-end$1',   label: 'padding-right → padding-inline-end' },

  // Positional (careful: only match CSS property context, not JS variables)
  { find: /(?<=^|[{;\s])left(\s*:\s*)/gm,  replace: 'inset-inline-start$1', label: 'left → inset-inline-start' },
  { find: /(?<=^|[{;\s])right(\s*:\s*)/gm, replace: 'inset-inline-end$1',   label: 'right → inset-inline-end' },

  // Border-radius
  { find: /border-top-left-radius/g,    replace: 'border-start-start-radius', label: 'border-top-left-radius → border-start-start-radius' },
  { find: /border-top-right-radius/g,   replace: 'border-start-end-radius',   label: 'border-top-right-radius → border-start-end-radius' },
  { find: /border-bottom-left-radius/g, replace: 'border-end-start-radius',   label: 'border-bottom-left-radius → border-end-start-radius' },
  { find: /border-bottom-right-radius/g,replace: 'border-end-end-radius',     label: 'border-bottom-right-radius → border-end-end-radius' },

  // Text align (flagged as warning — may be intentional)
  { find: /text-align(\s*:\s*)left/g,  replace: 'text-align$1start', label: 'text-align: left → text-align: start', warn: true },
  { find: /text-align(\s*:\s*)right/g, replace: 'text-align$1end',   label: 'text-align: right → text-align: end', warn: true },
];

// ── camelCase rules (CSS-in-JS, vanilla-extract, styled-components) ─────────

const CAMEL_RULES = [
  { find: /\bmarginLeft(\s*[=:])/g,       replace: 'marginInlineStart$1',      label: 'marginLeft → marginInlineStart' },
  { find: /\bmarginRight(\s*[=:])/g,      replace: 'marginInlineEnd$1',        label: 'marginRight → marginInlineEnd' },
  { find: /\bpaddingLeft(\s*[=:])/g,      replace: 'paddingInlineStart$1',     label: 'paddingLeft → paddingInlineStart' },
  { find: /\bpaddingRight(\s*[=:])/g,     replace: 'paddingInlineEnd$1',       label: 'paddingRight → paddingInlineEnd' },
  { find: /\bborderLeft(\s*[=:])/g,       replace: 'borderInlineStart$1',      label: 'borderLeft → borderInlineStart' },
  { find: /\bborderRight(\s*[=:])/g,      replace: 'borderInlineEnd$1',        label: 'borderRight → borderInlineEnd' },
  { find: /\bborderLeftWidth(\s*[=:])/g,  replace: 'borderInlineStartWidth$1', label: 'borderLeftWidth → borderInlineStartWidth' },
  { find: /\bborderRightWidth(\s*[=:])/g, replace: 'borderInlineEndWidth$1',   label: 'borderRightWidth → borderInlineEndWidth' },
  { find: /\bborderLeftColor(\s*[=:])/g,  replace: 'borderInlineStartColor$1', label: 'borderLeftColor → borderInlineStartColor' },
  { find: /\bborderRightColor(\s*[=:])/g, replace: 'borderInlineEndColor$1',   label: 'borderRightColor → borderInlineEndColor' },
  { find: /\bborderTopLeftRadius(\s*[=:])/g,     replace: 'borderStartStartRadius$1', label: 'borderTopLeftRadius → borderStartStartRadius' },
  { find: /\bborderTopRightRadius(\s*[=:])/g,    replace: 'borderStartEndRadius$1',   label: 'borderTopRightRadius → borderStartEndRadius' },
  { find: /\bborderBottomLeftRadius(\s*[=:])/g,  replace: 'borderEndStartRadius$1',   label: 'borderBottomLeftRadius → borderEndStartRadius' },
  { find: /\bborderBottomRightRadius(\s*[=:])/g, replace: 'borderEndEndRadius$1',     label: 'borderBottomRightRadius → borderEndEndRadius' },
];

/**
 * Transform a single file's content from physical to logical CSS properties.
 *
 * @param {string} content - File content
 * @param {string} filePath - File path (for reporting)
 * @param {object} options - { camelCase: boolean }
 * @returns {{ transformed: string, changes: object[], warnings: object[] }}
 */
export function transformContent(content, filePath, options = {}) {
  const { camelCase = true } = options;
  let transformed = content;
  const changes = [];
  const warnings = [];

  // Apply kebab-case rules
  for (const rule of KEBAB_RULES) {
    // Reset regex state
    rule.find.lastIndex = 0;
    const before = transformed;
    transformed = transformed.replace(rule.find, rule.replace);
    if (transformed !== before) {
      const count = countDiff(before, transformed);
      const entry = { rule: rule.label, count };
      if (rule.warn) {
        warnings.push(entry);
      }
      changes.push(entry);
    }
  }

  // Apply camelCase rules (for JS/TS files)
  if (camelCase) {
    for (const rule of CAMEL_RULES) {
      rule.find.lastIndex = 0;
      const before = transformed;
      transformed = transformed.replace(rule.find, rule.replace);
      if (transformed !== before) {
        const count = countDiff(before, transformed);
        changes.push({ rule: rule.label, count });
      }
    }
  }

  return { transformed, changes, warnings };
}

/**
 * Process a file: read, transform, optionally write.
 *
 * @param {string} filePath - Absolute path to file
 * @param {string} projectPath - Project root for relative paths
 * @param {object} options - { dryRun: boolean, camelCase: boolean }
 * @returns {object} Result with changes and warnings
 */
export function processFile(filePath, projectPath, options = {}) {
  const { dryRun = false, camelCase = true } = options;
  const relPath = relative(projectPath, filePath);

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { file: relPath, error: `Could not read: ${err.message}`, changes: [], warnings: [] };
  }

  const { transformed, changes, warnings } = transformContent(content, filePath, { camelCase });

  if (changes.length === 0) {
    return { file: relPath, changes: [], warnings: [], modified: false };
  }

  if (!dryRun) {
    try {
      writeFileSync(filePath, transformed, 'utf-8');
    } catch (err) {
      return { file: relPath, error: `Could not write: ${err.message}`, changes, warnings };
    }
  }

  return { file: relPath, changes, warnings, modified: changes.length > 0, dryRun };
}

/**
 * Count the number of differences between two strings (rough line-based).
 */
function countDiff(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  let count = 0;
  const len = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < len; i++) {
    if (aLines[i] !== bLines[i]) count++;
  }
  return count;
}
