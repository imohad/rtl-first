/**
 * CSS physical → logical property transformation using regex.
 *
 * This is the v0.1.0 regex engine extracted into its own module.
 * Always available — zero dependencies.
 *
 * For CSS files: prefer PostCSS AST (css-postcss.js) when available.
 * For JS/TS files with CSS-in-JS: this handles camelCase properties.
 *
 * Safety note: Regex left/right rules use CSS-context lookbehind
 * (?<=^|[{;\s]) to avoid matching JS variables like `left` in
 * `const left = 10`. This is ONLY safe for CSS files — use cssOnly
 * option to restrict to CSS context patterns.
 */

// ── kebab-case rules (CSS files, template strings) ──────────────────────────

const KEBAB_RULES = [
  { find: /border-left-width(\s*:\s*)/g,  replace: 'border-inline-start-width$1', label: 'border-left-width → border-inline-start-width' },
  { find: /border-right-width(\s*:\s*)/g, replace: 'border-inline-end-width$1',   label: 'border-right-width → border-inline-end-width' },
  { find: /border-left-color(\s*:\s*)/g,  replace: 'border-inline-start-color$1', label: 'border-left-color → border-inline-start-color' },
  { find: /border-right-color(\s*:\s*)/g, replace: 'border-inline-end-color$1',   label: 'border-right-color → border-inline-end-color' },
  { find: /border-left-style(\s*:\s*)/g,  replace: 'border-inline-start-style$1', label: 'border-left-style → border-inline-start-style' },
  { find: /border-right-style(\s*:\s*)/g, replace: 'border-inline-end-style$1',   label: 'border-right-style → border-inline-end-style' },
  { find: /border-left(\s*:\s*)/g,  replace: 'border-inline-start$1', label: 'border-left → border-inline-start' },
  { find: /border-right(\s*:\s*)/g, replace: 'border-inline-end$1',   label: 'border-right → border-inline-end' },
  { find: /margin-left(\s*:\s*)/g,  replace: 'margin-inline-start$1', label: 'margin-left → margin-inline-start' },
  { find: /margin-right(\s*:\s*)/g, replace: 'margin-inline-end$1',   label: 'margin-right → margin-inline-end' },
  { find: /padding-left(\s*:\s*)/g,  replace: 'padding-inline-start$1', label: 'padding-left → padding-inline-start' },
  { find: /padding-right(\s*:\s*)/g, replace: 'padding-inline-end$1',   label: 'padding-right → padding-inline-end' },
  { find: /border-top-left-radius/g,    replace: 'border-start-start-radius', label: 'border-top-left-radius → border-start-start-radius' },
  { find: /border-top-right-radius/g,   replace: 'border-start-end-radius',   label: 'border-top-right-radius → border-start-end-radius' },
  { find: /border-bottom-left-radius/g, replace: 'border-end-start-radius',   label: 'border-bottom-left-radius → border-end-start-radius' },
  { find: /border-bottom-right-radius/g,replace: 'border-end-end-radius',     label: 'border-bottom-right-radius → border-end-end-radius' },
  { find: /text-align(\s*:\s*)left/g,  replace: 'text-align$1start', label: 'text-align: left → start', warn: true },
  { find: /text-align(\s*:\s*)right/g, replace: 'text-align$1end',   label: 'text-align: right → end', warn: true },
];

// left/right positional — CSS only (lookbehind requires CSS context)
const KEBAB_RULES_CSS_ONLY = [
  { find: /(?<=^|[{;\s])left(\s*:\s*)/gm,  replace: 'inset-inline-start$1', label: 'left → inset-inline-start' },
  { find: /(?<=^|[{;\s])right(\s*:\s*)/gm, replace: 'inset-inline-end$1',   label: 'right → inset-inline-end' },
];

// ── camelCase rules (CSS-in-JS) ─────────────────────────────────────────────

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
 * @param {string} content - File content
 * @param {string} filePath - For reporting
 * @param {object} options - { camelCase, cssOnly }
 * @returns {{ transformed: string, changes: Array, warnings: Array }}
 */
export function transformCSSWithRegex(content, filePath, options = {}) {
  const { camelCase = true, cssOnly = false } = options;
  let transformed = content;
  const changes = [];
  const warnings = [];

  const rules = cssOnly
    ? [...KEBAB_RULES, ...KEBAB_RULES_CSS_ONLY]
    : KEBAB_RULES;

  for (const rule of rules) {
    rule.find.lastIndex = 0;
    const before = transformed;
    transformed = transformed.replace(rule.find, rule.replace);
    if (transformed !== before) {
      const count = countDiff(before, transformed);
      const entry = { rule: rule.label, count };
      if (rule.warn) warnings.push(entry);
      changes.push(entry);
    }
  }

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
