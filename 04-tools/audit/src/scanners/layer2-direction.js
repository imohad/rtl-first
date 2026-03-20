import { readFileSync } from 'fs';
import { walkFiles, findFiles } from '../utils/walker.js';

const DIRECTION_PATTERNS = [
  { pattern: /dir\s*=\s*["']rtl["']/i, label: 'dir="rtl" attribute' },
  { pattern: /\.dir\s*=\s*["']rtl["']/i, label: 'JavaScript dir assignment' },
  { pattern: /documentElement\.dir/i, label: 'document.documentElement.dir' },
  { pattern: /applyDocumentLanguage/i, label: 'applyDocumentLanguage()' },
  { pattern: /DirectionProvider/i, label: 'DirectionProvider' },
  { pattern: /useDirection/i, label: 'useDirection hook' },
  { pattern: /direction:\s*['"]rtl['"]/, label: 'CSS direction: rtl' },
  { pattern: /i18n.*dir/i, label: 'i18n direction config' },
];

// UI libraries that need DirectionProvider
const UI_LIBS = {
  '@radix-ui/react-direction': 'Radix UI (has DirectionProvider)',
  '@radix-ui/themes': 'Radix UI Themes',
  '@chakra-ui/react': 'Chakra UI (has direction support)',
  '@mantine/core': 'Mantine (has direction support)',
  'antd': 'Ant Design (has ConfigProvider direction)',
};

/**
 * Scan for RTL direction logic in the project.
 */
export function scanLayer2(projectPath) {
  const codeFiles = walkFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx', '.html', '.vue', '.svelte']);
  const found = [];
  const missing = [];

  // Check for direction patterns in code
  for (const filePath of codeFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      for (const { pattern, label } of DIRECTION_PATTERNS) {
        if (pattern.test(content)) {
          found.push({ file: filePath, pattern: label });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Check for UI libraries that need direction configuration
  const detectedLibs = [];
  const packageFiles = findFiles(projectPath, 'package.json', 5);

  for (const pkgPath of packageFiles) {
    try {
      const content = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...content.dependencies, ...content.devDependencies };

      for (const [pkg, label] of Object.entries(UI_LIBS)) {
        if (allDeps[pkg]) detectedLibs.push(label);
      }
    } catch {
      // Skip invalid files
    }
  }

  // Determine status
  const hasDirectionLogic = found.length > 0;
  const hasDirectionProvider = found.some(f =>
    f.pattern.includes('DirectionProvider') || f.pattern.includes('direction config')
  );
  const needsDirectionProvider = detectedLibs.length > 0 && !hasDirectionProvider;

  if (hasDirectionLogic && !needsDirectionProvider) {
    return {
      status: 'pass',
      summary: `Direction logic found (${found.length} patterns)`,
      detail: 'This project has direction detection and configuration.',
      found: dedup(found),
      uiLibraries: detectedLibs,
    };
  }

  if (hasDirectionLogic && needsDirectionProvider) {
    return {
      status: 'warn',
      summary: 'Direction logic exists but may be incomplete',
      detail: `Found direction patterns but ${detectedLibs.join(', ')} may need DirectionProvider wrapping.`,
      found: dedup(found),
      uiLibraries: detectedLibs,
    };
  }

  return {
    status: 'fail',
    summary: 'No direction logic found',
    detail: 'No dir="rtl" detection, no DirectionProvider, no language-aware direction switching.',
    found: [],
    uiLibraries: detectedLibs,
    fix: 'Add document.documentElement.dir = "rtl" when RTL locale is active. If using Radix UI, wrap app in DirectionProvider.',
  };
}

function dedup(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.pattern;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
