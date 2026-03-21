/**
 * Transform engine — routes between AST and regex modes.
 *
 * Mode selection:
 *   --quick   → always regex (fast, zero deps)
 *   --strict  → always AST (fails if deps not installed)
 *   default   → best available engine per file type
 *
 * Engine routing:
 *   .css/.scss/.less → PostCSS AST (if available) or regex
 *   .js/.ts/.jsx/.tsx → jscodeshift AST (if available) + Tailwind AST, or regex
 *   .vue/.svelte/.html → regex + Tailwind regex
 */

import { extname } from 'path';
import { transformCSSWithRegex } from './transforms/css-regex.js';

const CSS_EXTENSIONS = new Set(['.css', '.scss', '.less']);
const JS_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx']);
const TEMPLATE_EXTENSIONS = new Set(['.vue', '.svelte', '.html']);

let _postcssAvailable = null;
let _jscodeAvailable = null;

async function isPostCSSAvailable() {
  if (_postcssAvailable !== null) return _postcssAvailable;
  try {
    await import('postcss');
    _postcssAvailable = true;
  } catch {
    _postcssAvailable = false;
  }
  return _postcssAvailable;
}

async function isJscodeAvailable() {
  if (_jscodeAvailable !== null) return _jscodeAvailable;
  try {
    await import('jscodeshift');
    _jscodeAvailable = true;
  } catch {
    _jscodeAvailable = false;
  }
  return _jscodeAvailable;
}

/**
 * Transform file content — picks the best engine for the file type.
 *
 * @param {string} content - File content
 * @param {string} filePath - Full path (used for extension detection + parser)
 * @param {object} options
 * @param {'auto'|'ast'|'regex'} options.mode
 * @param {boolean} options.camelCase
 * @param {boolean} options.shorthand - Decompose shorthand (AST only)
 * @param {boolean} options.tailwind - Enable Tailwind transforms (default true)
 * @returns {Promise<{ transformed: string, changes: Array, warnings: Array, engine: string, note?: string }>}
 */
export async function transform(content, filePath, options = {}) {
  const { mode = 'auto', camelCase = true, shorthand = true, tailwind = true } = options;
  const ext = extname(filePath).toLowerCase();

  // ── CSS files ────────────────────────────────────────────────────────────
  if (CSS_EXTENSIONS.has(ext)) {
    if (mode === 'regex') {
      const result = transformCSSWithRegex(content, filePath, { camelCase: false, cssOnly: true });
      return { ...result, engine: 'regex' };
    }

    const postcss = await isPostCSSAvailable();
    if (postcss) {
      const { transformCSSWithPostCSS } = await import('./transforms/css-postcss.js');
      const result = await transformCSSWithPostCSS(content, filePath, { shorthand });
      return { ...result, engine: 'postcss' };
    }

    if (mode === 'ast') {
      return {
        transformed: content,
        changes: [],
        warnings: [{ rule: 'PostCSS not installed — run: npm install postcss', count: 1 }],
        engine: 'none',
        note: 'Install postcss for AST mode: npm install postcss',
      };
    }

    // auto fallback
    const result = transformCSSWithRegex(content, filePath, { camelCase: false, cssOnly: true });
    return { ...result, engine: 'regex', note: 'Install postcss for safer AST transforms' };
  }

  // ── JS/TS/JSX/TSX files ──────────────────────────────────────────────────
  if (JS_EXTENSIONS.has(ext)) {
    if (mode === 'regex') {
      const result = transformCSSWithRegex(content, filePath, { camelCase });
      return { ...result, engine: 'regex' };
    }

    const jscode = await isJscodeAvailable();
    if (jscode) {
      // Run jscodeshift for CSS-in-JS
      const { transformJSWithAST } = await import('./transforms/js-jscodeshift.js');
      const jsResult = await transformJSWithAST(content, filePath);

      // Also run Tailwind transform on the result
      let finalContent = jsResult.transformed;
      let allChanges = [...jsResult.changes];
      let allWarnings = [...jsResult.warnings];

      if (tailwind) {
        const { transformTailwindWithAST } = await import('./transforms/tailwind.js');
        const twResult = await transformTailwindWithAST(finalContent, filePath);
        finalContent = twResult.transformed;
        allChanges = [...allChanges, ...twResult.changes];
        allWarnings = [...allWarnings, ...twResult.warnings];
      }

      return {
        transformed: finalContent,
        changes: allChanges,
        warnings: allWarnings,
        engine: 'jscodeshift',
      };
    }

    if (mode === 'ast') {
      return {
        transformed: content,
        changes: [],
        warnings: [{ rule: 'jscodeshift not installed — run: npm install jscodeshift', count: 1 }],
        engine: 'none',
        note: 'Install jscodeshift for AST mode: npm install jscodeshift',
      };
    }

    // auto fallback to regex
    const result = transformCSSWithRegex(content, filePath, { camelCase });
    return { ...result, engine: 'regex', note: 'Install jscodeshift for safer AST transforms' };
  }

  // ── Template files (Vue/Svelte/HTML) ─────────────────────────────────────
  if (TEMPLATE_EXTENSIONS.has(ext)) {
    const regexResult = transformCSSWithRegex(content, filePath, { camelCase, cssOnly: false });
    let finalContent = regexResult.transformed;
    let allChanges = [...regexResult.changes];

    if (tailwind) {
      const { transformTailwindWithRegex } = await import('./transforms/tailwind.js');
      const twResult = transformTailwindWithRegex(finalContent, filePath);
      finalContent = twResult.transformed;
      allChanges = [...allChanges, ...twResult.changes];
    }

    return {
      transformed: finalContent,
      changes: allChanges,
      warnings: regexResult.warnings,
      engine: 'regex',
    };
  }

  // ── Unknown extension — try regex ────────────────────────────────────────
  const result = transformCSSWithRegex(content, filePath, { camelCase });
  return { ...result, engine: 'regex' };
}

/**
 * Get engine availability info.
 */
export async function getEngineInfo() {
  const postcss = await isPostCSSAvailable();
  const jscode = await isJscodeAvailable();
  return {
    postcss,
    jscodeshift: jscode,
    regex: true,
    recommended: postcss && jscode ? 'auto' : 'regex',
  };
}
