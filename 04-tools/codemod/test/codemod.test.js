import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { transformCSSWithRegex } from '../src/transforms/css-regex.js';
import { transform, getEngineInfo } from '../src/engine.js';

// ── Regex engine tests ────────────────────────────────────────────────────────

describe('CSS regex engine', () => {
  test('transforms simple physical properties', () => {
    const input = '.box { margin-left: 8px; padding-right: 4px; }';
    const result = transformCSSWithRegex(input, 'test.css');
    assert.ok(result.transformed.includes('margin-inline-start'));
    assert.ok(result.transformed.includes('padding-inline-end'));
    assert.ok(result.changes.length >= 2);
  });

  test('transforms border properties', () => {
    const input = '.box { border-left: 1px solid; border-right-width: 2px; }';
    const result = transformCSSWithRegex(input, 'test.css');
    assert.ok(result.transformed.includes('border-inline-start'));
    assert.ok(result.transformed.includes('border-inline-end-width'));
  });

  test('transforms border-radius', () => {
    const input = '.box { border-top-left-radius: 4px; border-bottom-right-radius: 8px; }';
    const result = transformCSSWithRegex(input, 'test.css');
    assert.ok(result.transformed.includes('border-start-start-radius'));
    assert.ok(result.transformed.includes('border-end-end-radius'));
  });

  test('warns on text-align', () => {
    const input = '.box { text-align: left; }';
    const result = transformCSSWithRegex(input, 'test.css');
    assert.ok(result.transformed.includes('text-align: start'));
    assert.ok(result.warnings.length > 0);
  });

  test('transforms left/right in CSS context with cssOnly', () => {
    const input = '.box { left: 0; right: 10px; }';
    const result = transformCSSWithRegex(input, 'test.css', { cssOnly: true });
    assert.ok(result.transformed.includes('inset-inline-start'));
    assert.ok(result.transformed.includes('inset-inline-end'));
  });

  test('does NOT transform left/right without cssOnly in JS', () => {
    const input = 'const left = 10; const right = 20;';
    const result = transformCSSWithRegex(input, 'test.js', { cssOnly: false });
    // Without cssOnly, left/right positional rules are not applied
    assert.ok(!result.transformed.includes('inset-inline'));
  });
});

// ── PostCSS AST tests ─────────────────────────────────────────────────────────

describe('PostCSS AST engine', async () => {
  let hasPostCSS = false;
  try {
    await import('postcss');
    hasPostCSS = true;
  } catch {}

  if (!hasPostCSS) {
    test('skipped — postcss not installed', () => {
      console.log('  ℹ Install postcss to run AST tests');
    });
    return;
  }

  const { transformCSSWithPostCSS } = await import('../src/transforms/css-postcss.js');

  test('transforms simple properties', async () => {
    const input = '.box { margin-left: 8px; padding-right: 4px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.ok(result.transformed.includes('margin-inline-start'));
    assert.ok(result.transformed.includes('padding-inline-end'));
  });

  test('decomposes margin shorthand', async () => {
    const input = '.box { margin: 0 16px 0 24px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.ok(result.transformed.includes('margin-block'));
    assert.ok(result.transformed.includes('margin-inline'));
    assert.ok(!result.transformed.includes('margin: 0 16px 0 24px'));
  });

  test('decomposes border-radius shorthand', async () => {
    const input = '.box { border-radius: 4px 8px 12px 16px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.ok(result.transformed.includes('border-start-start-radius'));
    assert.ok(result.transformed.includes('border-start-end-radius'));
    assert.ok(result.transformed.includes('border-end-end-radius'));
    assert.ok(result.transformed.includes('border-end-start-radius'));
  });

  test('decomposes inset shorthand', async () => {
    const input = '.box { inset: 0 10px 0 20px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.ok(result.transformed.includes('inset-block'));
    assert.ok(result.transformed.includes('inset-inline'));
  });

  test('skips symmetric shorthand', async () => {
    const input = '.box { margin: 0 16px 0 16px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    // Left === right, so no decomposition needed
    assert.equal(result.changes.length, 0);
  });

  test('preserves non-directional properties', async () => {
    const input = '.box { display: flex; color: red; margin-top: 8px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.equal(result.changes.length, 0);
    assert.ok(result.transformed.includes('display: flex'));
  });

  test('handles left/right positional', async () => {
    const input = '.box { left: 0; right: 10px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css');
    assert.ok(result.transformed.includes('inset-inline-start'));
    assert.ok(result.transformed.includes('inset-inline-end'));
  });

  test('respects --no-shorthand option', async () => {
    const input = '.box { margin: 0 16px 0 24px; margin-left: 8px; }';
    const result = await transformCSSWithPostCSS(input, 'test.css', { shorthand: false });
    // Should transform simple property but NOT decompose shorthand
    assert.ok(result.transformed.includes('margin-inline-start'));
    assert.ok(result.transformed.includes('margin: 0 16px 0 24px'));
  });
});

// ── jscodeshift CSS-in-JS tests ───────────────────────────────────────────────

describe('jscodeshift CSS-in-JS engine', async () => {
  let hasJscodeshift = false;
  try {
    await import('jscodeshift');
    hasJscodeshift = true;
  } catch {}

  if (!hasJscodeshift) {
    test('skipped — jscodeshift not installed', () => {
      console.log('  ℹ Install jscodeshift to run JS AST tests');
    });
    return;
  }

  const { transformJSWithAST } = await import('../src/transforms/js-jscodeshift.js');

  test('transforms style object properties', async () => {
    const input = `const s = { marginLeft: '8px', paddingRight: '4px' };`;
    const result = await transformJSWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('marginInlineStart'));
    assert.ok(result.transformed.includes('paddingInlineEnd'));
    assert.equal(result.changes.length, 2);
  });

  test('transforms JSX inline style', async () => {
    const input = `<div style={{ marginLeft: '4px', left: '0' }} />`;
    const result = await transformJSWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('marginInlineStart'));
    assert.ok(result.transformed.includes('insetInlineStart'));
  });

  test('transforms border radius properties', async () => {
    const input = `const s = { borderTopLeftRadius: '4px' };`;
    const result = await transformJSWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('borderStartStartRadius'));
  });

  test('transforms member expressions', async () => {
    const input = `const x = styles.marginLeft;`;
    const result = await transformJSWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('styles.marginInlineStart'));
  });

  test('converts textAlign string values', async () => {
    const input = `const s = { textAlign: 'left' };`;
    const result = await transformJSWithAST(input, 'test.tsx');
    // jscodeshift may normalize quotes — check for both
    assert.ok(
      result.transformed.includes("'start'") || result.transformed.includes('"start"'),
      'Should convert textAlign left to start'
    );
    assert.ok(result.warnings.length > 0);
  });

  test('does not crash on conditional values', async () => {
    const input = `const s = { marginRight: isCompact ? '4px' : '16px' };`;
    const result = await transformJSWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('marginInlineEnd'));
    assert.ok(result.warnings.some(w => w.rule.includes('conditional')));
  });
});

// ── Tailwind class mapping tests ──────────────────────────────────────────────

describe('Tailwind class mapper', async () => {
  const { mapClass, transformClassString } = await import('../src/transforms/tailwind.js');

  test('maps simple directional classes', () => {
    assert.equal(mapClass('ml-4'), 'ms-4');
    assert.equal(mapClass('mr-2'), 'me-2');
    assert.equal(mapClass('pl-4'), 'ps-4');
    assert.equal(mapClass('pr-2'), 'pe-2');
  });

  test('maps positional classes', () => {
    assert.equal(mapClass('left-0'), 'start-0');
    assert.equal(mapClass('right-4'), 'end-4');
  });

  test('maps text alignment', () => {
    assert.equal(mapClass('text-left'), 'text-start');
    assert.equal(mapClass('text-right'), 'text-end');
  });

  test('maps border classes', () => {
    assert.equal(mapClass('border-l-2'), 'border-s-2');
    assert.equal(mapClass('border-r-4'), 'border-e-4');
  });

  test('maps rounded classes', () => {
    assert.equal(mapClass('rounded-tl-lg'), 'rounded-ss-lg');
    assert.equal(mapClass('rounded-br-md'), 'rounded-ee-md');
  });

  test('preserves responsive prefixes', () => {
    assert.equal(mapClass('sm:ml-4'), 'sm:ms-4');
    assert.equal(mapClass('lg:pr-2'), 'lg:pe-2');
  });

  test('preserves negative values', () => {
    assert.equal(mapClass('-ml-4'), '-ms-4');
  });

  test('preserves important prefix', () => {
    assert.equal(mapClass('!ml-4'), '!ms-4');
  });

  test('does not map non-directional classes', () => {
    assert.equal(mapClass('mt-4'), null);
    assert.equal(mapClass('pb-2'), null);
    assert.equal(mapClass('flex'), null);
    assert.equal(mapClass('text-red-500'), null);
  });

  test('transforms class string', () => {
    const result = transformClassString('ml-4 mt-2 pr-2 flex text-left');
    assert.equal(result.result, 'ms-4 mt-2 pe-2 flex text-start');
    assert.equal(result.changes.length, 3);
  });
});

// ── Tailwind AST tests ────────────────────────────────────────────────────────

describe('Tailwind AST transform', async () => {
  let hasJscodeshift = false;
  try {
    await import('jscodeshift');
    hasJscodeshift = true;
  } catch {}

  if (!hasJscodeshift) {
    test('skipped — jscodeshift not installed', () => {});
    return;
  }

  const { transformTailwindWithAST } = await import('../src/transforms/tailwind.js');

  test('transforms className string attribute', async () => {
    const input = `<div className="ml-4 pr-2 border-l-2" />`;
    const result = await transformTailwindWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('ms-4'));
    assert.ok(result.transformed.includes('pe-2'));
    assert.ok(result.transformed.includes('border-s-2'));
  });

  test('transforms cn() call arguments', async () => {
    const input = `<div className={cn('ml-4', active && 'mr-2')} />`;
    const result = await transformTailwindWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('ms-4'));
    assert.ok(result.transformed.includes('me-2'));
  });

  test('transforms template literals', async () => {
    const input = '<div className={`ml-4 ${x}`} />';
    const result = await transformTailwindWithAST(input, 'test.tsx');
    assert.ok(result.transformed.includes('ms-4'));
  });
});

// ── Engine routing tests ──────────────────────────────────────────────────────

describe('Engine routing', () => {
  test('uses best available engine for CSS files', async () => {
    const input = '.box { margin-left: 8px; }';
    const result = await transform(input, 'style.css', { mode: 'auto' });
    assert.ok(['postcss', 'regex'].includes(result.engine));
    assert.ok(result.transformed.includes('margin-inline-start'));
  });

  test('uses best available engine for JS files', async () => {
    const input = 'const s = { marginLeft: "8px" };';
    const result = await transform(input, 'comp.tsx', { mode: 'auto', tailwind: false });
    assert.ok(['jscodeshift', 'regex'].includes(result.engine));
    assert.ok(result.transformed.includes('marginInlineStart'));
  });

  test('forces regex with mode=regex', async () => {
    const input = '.box { margin-left: 8px; }';
    const result = await transform(input, 'style.css', { mode: 'regex' });
    assert.equal(result.engine, 'regex');
    assert.ok(result.transformed.includes('margin-inline-start'));
  });

  test('getEngineInfo returns availability', async () => {
    const info = await getEngineInfo();
    assert.equal(info.regex, true);
    assert.equal(typeof info.postcss, 'boolean');
    assert.equal(typeof info.jscodeshift, 'boolean');
  });
});
