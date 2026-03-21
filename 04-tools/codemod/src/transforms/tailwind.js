/**
 * Tailwind CSS class mapping: physical → logical.
 *
 * Maps directional utility classes to their logical equivalents:
 *   ml-4 → ms-4, pr-2 → pe-2, left-0 → start-0, text-left → text-start
 *
 * Two modes:
 *   1. AST-aware (via jscodeshift) — only transforms className/class attributes
 *   2. Regex fallback — transforms class/className string values in HTML/Vue/Svelte
 */

// ── Prefix mapping ───────────────────────────────────────────────────────────

const PREFIX_MAP = {
  'ml':           'ms',
  'mr':           'me',
  'pl':           'ps',
  'pr':           'pe',
  'left':         'start',
  'right':        'end',
  'border-l':     'border-s',
  'border-r':     'border-e',
  'rounded-tl':   'rounded-ss',
  'rounded-tr':   'rounded-se',
  'rounded-bl':   'rounded-es',
  'rounded-br':   'rounded-ee',
  'scroll-ml':    'scroll-ms',
  'scroll-mr':    'scroll-me',
  'scroll-pl':    'scroll-ps',
  'scroll-pr':    'scroll-pe',
  'text-left':    'text-start',
  'text-right':   'text-end',
};

// Build regex pattern from prefix map
const TAILWIND_REGEX = new RegExp(
  '(?<![\\w-])' +               // not preceded by word char or hyphen
  '(!?)' +                       // optional important prefix
  '(-?)' +                       // optional negative prefix
  '(?:([a-z]{2,3}):)?' +         // optional responsive prefix (sm:, md:, lg:, xl:, 2xl:)
  '(' +
    Object.keys(PREFIX_MAP)
      .sort((a, b) => b.length - a.length) // longest first to avoid partial matches
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
  ')' +
  '(-[\\w/.\\[\\]]+)?' +         // optional value suffix (-4, -px, -[20px])
  '(?![\\w-])',                   // not followed by word char or hyphen
  'g'
);

/**
 * Map a single Tailwind class to its logical equivalent.
 * Returns null if no mapping applies.
 */
export function mapClass(cls) {
  TAILWIND_REGEX.lastIndex = 0;
  const match = TAILWIND_REGEX.exec(cls);
  if (!match) return null;

  const [fullMatch, important, negative, responsive, prefix, suffix] = match;
  const mapped = PREFIX_MAP[prefix];
  if (!mapped) return null;

  // Reconstruct: !-sm:ms-4
  const parts = [
    important || '',
    negative || '',
    responsive ? `${responsive}:` : '',
    mapped,
    suffix || '',
  ];
  return parts.join('');
}

/**
 * Transform a space-separated class string.
 * @returns {{ result: string, changes: Array<{from: string, to: string}> }}
 */
export function transformClassString(classStr) {
  const classes = classStr.split(/\s+/);
  const changes = [];
  const result = classes.map(cls => {
    const mapped = mapClass(cls);
    if (mapped && mapped !== cls) {
      changes.push({ from: cls, to: mapped });
      return mapped;
    }
    return cls;
  }).join(' ');
  return { result, changes };
}

// ── AST-aware transform (jscodeshift) ────────────────────────────────────────

/**
 * Transform Tailwind classes in JSX/TSX files via AST.
 *
 * Only touches:
 *   - className="..." and class="..." attribute values
 *   - Template literals in className
 *   - cn()/clsx()/classnames() call arguments
 *
 * @param {string} source - JSX/TSX source
 * @param {string} filePath - For parser detection
 * @returns {Promise<{ transformed: string, changes: Array, warnings: Array }>}
 */
export async function transformTailwindWithAST(source, filePath) {
  const jscodeshift = (await import('jscodeshift')).default;

  const changes = [];
  const warnings = [];

  const isTSX = /\.tsx$/i.test(filePath);
  const parser = isTSX ? 'tsx' : 'babel';

  const j = jscodeshift.withParser(parser);
  let root;
  try {
    root = j(source);
  } catch (err) {
    return { transformed: source, changes: [], warnings: [{ rule: `Parse error: ${err.message}`, count: 1 }] };
  }

  // 1. JSX className/class attributes with string values
  root.find(j.JSXAttribute, node => {
    const name = node.name && node.name.name;
    return name === 'className' || name === 'class';
  }).forEach(path => {
    const val = path.node.value;

    // StringLiteral: className="ml-4 pr-2"
    if (val && (val.type === 'StringLiteral' || (val.type === 'Literal' && typeof val.value === 'string'))) {
      const result = transformClassString(val.value);
      if (result.changes.length > 0) {
        for (const c of result.changes) {
          changes.push({ rule: `${c.from} → ${c.to}`, count: 1 });
        }
        val.value = result.result;
      }
    }

    // JSXExpressionContainer with template literal: className={`ml-4 ${x}`}
    if (val && val.type === 'JSXExpressionContainer') {
      const expr = val.expression;
      if (expr.type === 'TemplateLiteral') {
        for (const quasi of expr.quasis) {
          const result = transformClassString(quasi.value.raw);
          if (result.changes.length > 0) {
            for (const c of result.changes) {
              changes.push({ rule: `${c.from} → ${c.to} (template)`, count: 1 });
            }
            quasi.value.raw = result.result;
            quasi.value.cooked = result.result;
          }
        }
      }
    }
  });

  // 2. cn()/clsx()/classnames() calls
  const CN_NAMES = new Set(['cn', 'clsx', 'classnames', 'cx', 'twMerge']);

  root.find(j.CallExpression, node => {
    const callee = node.callee;
    return callee && callee.type === 'Identifier' && CN_NAMES.has(callee.name);
  }).forEach(path => {
    const callName = path.node.callee.name;
    for (const arg of path.node.arguments) {
      findAndTransformStrings(j, arg, changes, callName);
    }
  });

  return {
    transformed: root.toSource(),
    changes,
    warnings,
  };
}

/**
 * Walk LogicalExpression/ConditionalExpression nodes and transform string literals.
 */
function findAndTransformStrings(j, node, changes, callName) {
  if (!node) return;
  if (node.type === 'StringLiteral' || (node.type === 'Literal' && typeof node.value === 'string')) {
    const result = transformClassString(node.value);
    if (result.changes.length > 0) {
      for (const c of result.changes) {
        changes.push({ rule: `${c.from} → ${c.to} (in ${callName}())`, count: 1 });
      }
      node.value = result.result;
    }
  }
  if (node.type === 'LogicalExpression') {
    findAndTransformStrings(j, node.left, changes, callName);
    findAndTransformStrings(j, node.right, changes, callName);
  }
  if (node.type === 'ConditionalExpression') {
    findAndTransformStrings(j, node.consequent, changes, callName);
    findAndTransformStrings(j, node.alternate, changes, callName);
  }
}

// ── Regex fallback (for HTML/Vue/Svelte templates) ───────────────────────────

/**
 * Regex fallback for Tailwind transforms in HTML/Vue/Svelte templates.
 * Less precise — transforms any matching class-like string.
 */
export function transformTailwindWithRegex(content, filePath) {
  const changes = [];
  const warnings = [];
  let transformed = content;

  const classRegex = /(?:class|className)=["']([^"']+)["']/g;
  transformed = transformed.replace(classRegex, (match, classStr) => {
    const result = transformClassString(classStr);
    if (result.changes.length > 0) {
      for (const c of result.changes) {
        changes.push({ rule: `${c.from} → ${c.to}`, count: 1 });
      }
      return match.replace(classStr, result.result);
    }
    return match;
  });

  return { transformed, changes, warnings };
}
