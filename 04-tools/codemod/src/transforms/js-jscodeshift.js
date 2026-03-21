/**
 * jscodeshift-based CSS-in-JS physical → logical property transformation.
 *
 * Operates on JavaScript/TypeScript AST — knows the difference between
 * object properties, string literals, and expressions.
 *
 * Handles:
 *   - Style object properties: { marginLeft: '8px' } → { marginInlineStart: '8px' }
 *   - JSX inline styles: style={{ marginLeft: 4 }}
 *   - Member expressions: styles.marginLeft → styles.marginInlineStart
 *   - textAlign value: { textAlign: 'left' } → { textAlign: 'start' }
 *   - Conditional values: flags for manual review
 */

// ── camelCase property map ───────────────────────────────────────────────────

const CAMEL_MAP = {
  marginLeft:             'marginInlineStart',
  marginRight:            'marginInlineEnd',
  paddingLeft:            'paddingInlineStart',
  paddingRight:           'paddingInlineEnd',
  borderLeft:             'borderInlineStart',
  borderRight:            'borderInlineEnd',
  borderLeftWidth:        'borderInlineStartWidth',
  borderRightWidth:       'borderInlineEndWidth',
  borderLeftColor:        'borderInlineStartColor',
  borderRightColor:       'borderInlineEndColor',
  borderLeftStyle:        'borderInlineStartStyle',
  borderRightStyle:       'borderInlineEndStyle',
  borderTopLeftRadius:    'borderStartStartRadius',
  borderTopRightRadius:   'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius:'borderEndEndRadius',
  left:                   'insetInlineStart',
  right:                  'insetInlineEnd',
};

const TEXT_ALIGN_MAP = { left: 'start', right: 'end' };

// ── Main transform function ──────────────────────────────────────────────────

/**
 * Transform JS/TS content using jscodeshift AST.
 *
 * @param {string} source - JS/TS/JSX/TSX source
 * @param {string} filePath - For parser detection
 * @returns {Promise<{ transformed: string, changes: Array, warnings: Array }>}
 */
export async function transformJSWithAST(source, filePath) {
  const jscodeshift = (await import('jscodeshift')).default;

  const changes = [];
  const warnings = [];

  // Detect parser
  const isTSX = /\.tsx$/i.test(filePath);
  const isTS = /\.ts$/i.test(filePath);
  const isJSX = /\.jsx$/i.test(filePath);
  const parser = isTSX ? 'tsx' : isTS ? 'ts' : isJSX ? 'babel' : 'babel';

  const j = jscodeshift.withParser(parser);
  let root;
  try {
    root = j(source);
  } catch (err) {
    return { transformed: source, changes: [], warnings: [{ rule: `Parse error: ${err.message}`, count: 1 }] };
  }

  // 1. Object properties in style objects
  // Babel parser uses Property, tsx/ts parsers use ObjectProperty
  const PropType = j.ObjectProperty || j.Property;
  const propPaths = root.find(PropType);
  // Also try the other type if first found nothing
  const altType = PropType === j.ObjectProperty ? j.Property : j.ObjectProperty;
  const altPaths = altType ? root.find(altType) : { forEach: () => {} };

  function processProperty(path) {
    const key = path.node.key;
    const name = key.name || key.value; // Identifier or StringLiteral
    if (!name) return;

    // textAlign value conversion
    if (name === 'textAlign') {
      const val = path.node.value;
      if (val.type === 'StringLiteral' || (val.type === 'Literal' && typeof val.value === 'string')) {
        const mapped = TEXT_ALIGN_MAP[val.value];
        if (mapped) {
          const original = val.value;
          val.value = mapped;
          changes.push({ rule: `textAlign: '${original}' → '${mapped}'`, count: 1 });
          warnings.push({ rule: `textAlign: '${mapped}' (may be intentional)`, count: 1 });
        }
      } else if (val.type === 'ConditionalExpression') {
        warnings.push({ rule: 'textAlign has conditional value — manual review needed', count: 1 });
      }
      return;
    }

    // Property name mapping
    if (CAMEL_MAP[name]) {
      const newName = CAMEL_MAP[name];
      if (key.type === 'Identifier') {
        key.name = newName;
      } else if (key.type === 'StringLiteral' || key.type === 'Literal') {
        key.value = newName;
      }
      changes.push({ rule: `${name} → ${newName}`, count: 1 });

      // Flag conditional values for review
      const val = path.node.value;
      if (val.type === 'ConditionalExpression') {
        warnings.push({ rule: `${newName} has conditional value — review manually`, count: 1 });
      }
    }
  }

  propPaths.forEach(processProperty);
  altPaths.forEach(processProperty);

  // 2. Member expressions: styles.marginLeft → styles.marginInlineStart
  root.find(j.MemberExpression).forEach(path => {
    const prop = path.node.property;
    if (prop.type === 'Identifier' && CAMEL_MAP[prop.name]) {
      const oldName = prop.name;
      prop.name = CAMEL_MAP[prop.name];
      changes.push({ rule: `*.${oldName} → *.${prop.name}`, count: 1 });
    }
  });

  return {
    transformed: root.toSource(),
    changes,
    warnings,
  };
}
