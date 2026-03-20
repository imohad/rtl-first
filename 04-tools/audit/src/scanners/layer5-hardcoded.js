import { readFileSync } from 'fs';
import { relative } from 'path';
import { walkFiles } from '../utils/walker.js';

// Strings that are NOT hardcoded user-facing text
const IGNORE_PATTERNS = [
  /^[a-z][a-zA-Z0-9]*$/, // camelCase identifiers
  /^[A-Z][A-Z0-9_]*$/, // CONSTANT_CASE
  /^[a-z-]+$/, // kebab-case (CSS classes, data attributes)
  /^(https?:\/\/|mailto:|tel:)/, // URLs
  /^[./#]/, // Paths
  /^\d+/, // Numbers
  /^(true|false|null|undefined)$/, // Literals
  /^(div|span|button|input|form|label|img|svg|path|a|p|h[1-6])$/, // HTML tags
  /^(GET|POST|PUT|DELETE|PATCH)$/, // HTTP methods
  /^(string|number|boolean|object|function)$/, // Types
  /^(px|rem|em|vh|vw|%|auto|none|inherit|flex|grid|block|inline)$/, // CSS values
  /^(onClick|onChange|onSubmit|className|style|key|ref|id|type|name|value|placeholder)$/, // React props
  /^data-/, // Data attributes
  /^aria-/, // ARIA attributes
  /^[{}<>()\[\]|&=+\-*\/\\;:,.'"`~!@#$%^?]+$/, // Symbols only
];

// Minimum word count to consider a string as user-facing text
const MIN_WORDS = 2;
const MAX_RESULTS = 50;

/**
 * Scan JSX/TSX files for hardcoded English strings.
 */
export function scanLayer5(projectPath) {
  const files = walkFiles(projectPath, ['.tsx', '.jsx']);
  const findings = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip imports, comments, and type definitions
        if (isSkippableLine(line)) continue;

        // Find string literals in JSX context
        const strings = extractJSXStrings(line);

        for (const str of strings) {
          if (isLikelyUserFacing(str)) {
            findings.push({
              file: relative(projectPath, filePath),
              line: i + 1,
              text: str.length > 60 ? str.substring(0, 60) + '...' : str,
            });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }

    // Cap results for performance
    if (findings.length >= MAX_RESULTS * 2) break;
  }

  const limited = findings.slice(0, MAX_RESULTS);

  if (findings.length === 0) {
    return {
      status: 'pass',
      summary: 'No hardcoded English strings detected in JSX',
      detail: 'All user-facing text appears to use i18n keys.',
      count: 0,
      findings: [],
    };
  }

  return {
    status: findings.length > 20 ? 'fail' : 'warn',
    summary: `${findings.length} hardcoded English strings found in JSX`,
    detail: 'These strings should be replaced with i18n translation keys.',
    count: findings.length,
    findings: limited,
    fix: 'Replace hardcoded strings with t() or equivalent i18n function calls.',
  };
}

/**
 * Extract string literals that appear in JSX context (between > and <, or in attributes).
 */
function extractJSXStrings(line) {
  const strings = [];

  // Match strings between JSX tags: >Some text<
  const jsxTextPattern = />\s*([A-Z][^<>{]*?)\s*</g;
  let match;
  while ((match = jsxTextPattern.exec(line)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) strings.push(text);
  }

  // Match string literals in JSX: {"Some text"} or {'Some text'}
  const jsxExprPattern = /\{["']([A-Z][^"']*?)["']\}/g;
  while ((match = jsxExprPattern.exec(line)) !== null) {
    strings.push(match[1].trim());
  }

  // Match title="Some text", placeholder="Some text", alt="Some text" etc.
  const attrPattern = /(?:title|placeholder|alt|label|aria-label|description)\s*=\s*["']([A-Z][^"']*?)["']/g;
  while ((match = attrPattern.exec(line)) !== null) {
    strings.push(match[1].trim());
  }

  return strings;
}

/**
 * Check if a string looks like user-facing text that should be translated.
 */
function isLikelyUserFacing(str) {
  if (!str || str.length < 3) return false;

  // Check against ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(str)) return false;
  }

  // Count words
  const words = str.split(/\s+/).filter(w => w.length > 0);
  if (words.length < MIN_WORDS) return false;

  // Must contain at least one ASCII letter
  if (!/[a-zA-Z]/.test(str)) return false;

  // Must start with uppercase (user-facing text convention)
  if (!/^[A-Z]/.test(str)) return false;

  return true;
}

/**
 * Check if a line should be skipped entirely.
 */
function isSkippableLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('import ') ||
    trimmed.startsWith('export type') ||
    trimmed.startsWith('export interface') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('console.') ||
    trimmed.startsWith('throw ') ||
    trimmed.includes('.test(') ||
    trimmed.includes('.spec(') ||
    trimmed.includes('describe(') ||
    trimmed.includes('it(') ||
    trimmed.includes('expect(')
  );
}
