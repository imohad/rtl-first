/**
 * PostCSS plugin: physical → logical CSS property transformation.
 *
 * Operates on the parsed AST — every Declaration node has a typed `prop`
 * and `value`. No false matches, no broken shorthand.
 *
 * Handles:
 *   - Simple properties (margin-left → margin-inline-start)
 *   - Shorthand decomposition (margin: T R B L → margin-block + margin-inline)
 *   - Border-radius shorthand (4-value)
 *   - text-align left/right → start/end
 *   - Positional left/right → inset-inline-start/end
 */

// ── Property mapping (simple 1:1) ────────────────────────────────────────────

const PROP_MAP = {
  'margin-left':  'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left':  'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left':  'border-inline-start',
  'border-right': 'border-inline-end',
  'border-left-width':  'border-inline-start-width',
  'border-right-width': 'border-inline-end-width',
  'border-left-color':  'border-inline-start-color',
  'border-right-color': 'border-inline-end-color',
  'border-left-style':  'border-inline-start-style',
  'border-right-style': 'border-inline-end-style',
  'border-top-left-radius':     'border-start-start-radius',
  'border-top-right-radius':    'border-start-end-radius',
  'border-bottom-left-radius':  'border-end-start-radius',
  'border-bottom-right-radius': 'border-end-end-radius',
  'left':  'inset-inline-start',
  'right': 'inset-inline-end',
};

// ── Shorthand decomposition ──────────────────────────────────────────────────

function splitValue(value) {
  const tokens = [];
  let current = '';
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ' ' && depth === 0) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function decomposeBoxShorthand(prop, value) {
  const tokens = splitValue(value.trim());
  if (tokens.length !== 4) return null;
  const [top, right, bottom, left] = tokens;
  if (left === right) return null;
  return [
    { prop: `${prop}-block`, value: top === bottom ? top : `${top} ${bottom}` },
    { prop: `${prop}-inline`, value: `${left} ${right}` },
  ];
}

function decomposeBorderRadius(value) {
  if (value.includes('/')) return null;
  const tokens = splitValue(value.trim());
  if (tokens.length !== 4) return null;
  const [tl, tr, br, bl] = tokens;
  if (tl === tr && tr === br && br === bl) return null;
  return [
    { prop: 'border-start-start-radius', value: tl },
    { prop: 'border-start-end-radius',   value: tr },
    { prop: 'border-end-end-radius',     value: br },
    { prop: 'border-end-start-radius',   value: bl },
  ];
}

function decomposeInset(value) {
  const tokens = splitValue(value.trim());
  if (tokens.length !== 4) return null;
  const [top, right, bottom, left] = tokens;
  if (left === right) return null;
  return [
    { prop: 'inset-block', value: top === bottom ? top : `${top} ${bottom}` },
    { prop: 'inset-inline', value: `${left} ${right}` },
  ];
}

// ── Main transform function ──────────────────────────────────────────────────

/**
 * Transform CSS content using PostCSS AST.
 *
 * @param {string} css - CSS source content
 * @param {string} filePath - For reporting
 * @param {object} options - { shorthand: boolean }
 * @returns {Promise<{ transformed: string, changes: Array, warnings: Array }>}
 */
export async function transformCSSWithPostCSS(css, filePath, options = {}) {
  const { shorthand = true } = options;
  const postcss = (await import('postcss')).default;

  const changes = [];
  const warnings = [];

  const plugin = () => ({
    postcssPlugin: 'rtl-first-logical',
    Declaration(decl) {
      const prop = decl.prop.toLowerCase();

      // 1. Simple 1:1 property mapping
      if (PROP_MAP[prop]) {
        const oldProp = decl.prop;
        decl.prop = PROP_MAP[prop];
        changes.push({ rule: `${oldProp} → ${PROP_MAP[prop]}`, count: 1 });
        return;
      }

      // 2. text-align value conversion
      if (prop === 'text-align') {
        if (decl.value === 'left') {
          decl.value = 'start';
          changes.push({ rule: 'text-align: left → start', count: 1 });
          warnings.push({ rule: 'text-align: left → start (may be intentional)', count: 1 });
        } else if (decl.value === 'right') {
          decl.value = 'end';
          changes.push({ rule: 'text-align: right → end', count: 1 });
          warnings.push({ rule: 'text-align: right → end (may be intentional)', count: 1 });
        }
        return;
      }

      // 3. Shorthand decomposition
      if (!shorthand) return;

      if (prop === 'margin' || prop === 'padding') {
        const result = decomposeBoxShorthand(prop, decl.value);
        if (result) {
          for (const { prop: newProp, value: newValue } of result) {
            decl.cloneBefore({ prop: newProp, value: newValue });
          }
          const oldDecl = `${decl.prop}: ${decl.value}`;
          decl.remove();
          changes.push({ rule: `${oldDecl} → decomposed to block+inline`, count: 1 });
          return;
        }
      }

      if (prop === 'border-radius') {
        const result = decomposeBorderRadius(decl.value);
        if (result) {
          for (const { prop: newProp, value: newValue } of result) {
            decl.cloneBefore({ prop: newProp, value: newValue });
          }
          const oldDecl = `${decl.prop}: ${decl.value}`;
          decl.remove();
          changes.push({ rule: `${oldDecl} → decomposed to logical radius`, count: 1 });
          return;
        }
        if (decl.value.includes('/')) {
          warnings.push({ rule: `border-radius slash syntax needs manual review: ${decl.value}`, count: 1 });
        }
      }

      if (prop === 'inset') {
        const result = decomposeInset(decl.value);
        if (result) {
          for (const { prop: newProp, value: newValue } of result) {
            decl.cloneBefore({ prop: newProp, value: newValue });
          }
          const oldDecl = `${decl.prop}: ${decl.value}`;
          decl.remove();
          changes.push({ rule: `${oldDecl} → decomposed to block+inline`, count: 1 });
        }
      }
    },
  });
  plugin.postcss = true;

  const result = await postcss([plugin]).process(css, { from: filePath });

  return {
    transformed: result.css,
    changes,
    warnings,
  };
}
