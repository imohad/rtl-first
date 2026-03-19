import { readFileSync } from 'fs';
import { walkFiles } from '../utils/walker.js';

const PHYSICAL_PROPERTIES = [
  { pattern: /margin-left\s*:/g, replacement: 'margin-inline-start', label: 'margin-left' },
  { pattern: /margin-right\s*:/g, replacement: 'margin-inline-end', label: 'margin-right' },
  { pattern: /padding-left\s*:/g, replacement: 'padding-inline-start', label: 'padding-left' },
  { pattern: /padding-right\s*:/g, replacement: 'padding-inline-end', label: 'padding-right' },
  { pattern: /border-left\s*:/g, replacement: 'border-inline-start', label: 'border-left' },
  { pattern: /border-right\s*:/g, replacement: 'border-inline-end', label: 'border-right' },
  { pattern: /border-left-width\s*:/g, replacement: 'border-inline-start-width', label: 'border-left-width' },
  { pattern: /border-right-width\s*:/g, replacement: 'border-inline-end-width', label: 'border-right-width' },
  { pattern: /(?<![a-zA-Z-])left\s*:\s*(?!.*(?:calc|var|env))/g, replacement: 'inset-inline-start', label: 'left (positional)' },
  { pattern: /(?<![a-zA-Z-])right\s*:\s*(?!.*(?:calc|var|env))/g, replacement: 'inset-inline-end', label: 'right (positional)' },
  { pattern: /text-align\s*:\s*left/g, replacement: 'text-align: start', label: 'text-align: left' },
  { pattern: /text-align\s*:\s*right/g, replacement: 'text-align: end', label: 'text-align: right' },
];

// camelCase variants for CSS-in-JS
const CAMELCASE_PROPERTIES = [
  { pattern: /marginLeft\s*:/g, label: 'marginLeft (JS)' },
  { pattern: /marginRight\s*:/g, label: 'marginRight (JS)' },
  { pattern: /paddingLeft\s*:/g, label: 'paddingLeft (JS)' },
  { pattern: /paddingRight\s*:/g, label: 'paddingRight (JS)' },
  { pattern: /borderLeft\s*:/g, label: 'borderLeft (JS)' },
  { pattern: /borderRight\s*:/g, label: 'borderRight (JS)' },
];

/**
 * Scan for physical CSS properties that should be logical.
 */
export function scanLayer3(projectPath) {
  const cssFiles = walkFiles(projectPath, ['.css', '.scss', '.less', '.sass']);
  const codeFiles = walkFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte']);
  const allFiles = [...cssFiles, ...codeFiles];

  const counts = {};
  let totalOccurrences = 0;
  let filesWithIssues = 0;
  const allProperties = [...PHYSICAL_PROPERTIES, ...CAMELCASE_PROPERTIES];

  for (const filePath of allFiles) {
    let fileHasIssues = false;

    try {
      const content = readFileSync(filePath, 'utf-8');

      for (const { pattern, label } of allProperties) {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          counts[label] = (counts[label] || 0) + matches.length;
          totalOccurrences += matches.length;
          fileHasIssues = true;
        }
      }
    } catch {
      // Skip unreadable files
    }

    if (fileHasIssues) filesWithIssues++;
  }

  if (totalOccurrences === 0) {
    return {
      status: 'pass',
      summary: 'No physical CSS properties found',
      detail: 'This project uses logical CSS properties or has no directional styling.',
      filesScanned: allFiles.length,
      filesWithIssues: 0,
      totalOccurrences: 0,
      breakdown: {},
    };
  }

  // Sort by count descending
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

  return {
    status: totalOccurrences > 50 ? 'fail' : 'warn',
    summary: `${filesWithIssues} files use physical CSS properties (${totalOccurrences} occurrences)`,
    detail: `Run @rtl-first/codemod to convert physical properties to logical properties.`,
    filesScanned: allFiles.length,
    filesWithIssues,
    totalOccurrences,
    breakdown: sorted,
    fix: 'npx @rtl-first/codemod --dry-run ./src',
  };
}
