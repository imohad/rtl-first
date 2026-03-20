import { readFileSync } from 'fs';
import { join } from 'path';
import { findFiles } from '../utils/walker.js';

const TEXT_ENGINES = {
  'prosemirror-model': { name: 'ProseMirror', bidiNote: 'Requires explicit BiDi configuration' },
  'prosemirror-view': { name: 'ProseMirror', bidiNote: 'Requires explicit BiDi configuration' },
  '@tiptap/core': { name: 'TipTap (ProseMirror)', bidiNote: 'Requires explicit BiDi configuration' },
  'slate': { name: 'Slate', bidiNote: 'BiDi support depends on implementation' },
  'slate-react': { name: 'Slate', bidiNote: 'BiDi support depends on implementation' },
  '@codemirror/state': { name: 'CodeMirror 6', bidiNote: 'Has built-in BiDi support' },
  'codemirror': { name: 'CodeMirror', bidiNote: 'Check version — v6 has better BiDi' },
  'quill': { name: 'Quill', bidiNote: 'Limited BiDi support' },
  'monaco-editor': { name: 'Monaco', bidiNote: 'Good BiDi support (VS Code editor)' },
  '@blocksuite/block-std': { name: 'BlockSuite', bidiNote: 'ProseMirror-based — BiDi not configured by default' },
  '@blocksuite/blocks': { name: 'BlockSuite', bidiNote: 'ProseMirror-based — BiDi not configured by default' },
};

/**
 * Scan for rich-text editor engines in the project.
 */
export function scanLayer1(projectPath) {
  const packageFiles = findFiles(projectPath, 'package.json', 5);
  const detected = new Map(); // name → { packages, bidiNote }

  for (const pkgPath of packageFiles) {
    try {
      const content = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...content.dependencies,
        ...content.devDependencies,
        ...content.peerDependencies,
      };

      for (const [pkg, info] of Object.entries(TEXT_ENGINES)) {
        if (allDeps[pkg]) {
          if (!detected.has(info.name)) {
            detected.set(info.name, { packages: [], bidiNote: info.bidiNote });
          }
          detected.get(info.name).packages.push(pkg);
        }
      }
    } catch {
      // Skip invalid package.json files
    }
  }

  if (detected.size === 0) {
    return {
      status: 'pass',
      summary: 'No rich-text editor detected',
      detail: 'This project does not appear to use a complex text editor. RTL support can start from Layer 2.',
      engines: [],
    };
  }

  const engines = [];
  for (const [name, info] of detected) {
    engines.push({
      name,
      packages: [...new Set(info.packages)],
      bidiNote: info.bidiNote,
    });
  }

  // Check if any detected engines have known BiDi issues
  const hasRiskyEngine = engines.some(e =>
    e.name.includes('ProseMirror') ||
    e.name.includes('BlockSuite') ||
    e.name.includes('Slate') ||
    e.name.includes('Quill')
  );

  return {
    status: hasRiskyEngine ? 'warn' : 'pass',
    summary: `Detected: ${engines.map(e => e.name).join(', ')}`,
    detail: hasRiskyEngine
      ? 'This project uses a text editor that may need BiDi configuration. Check Layer 1 before proceeding with surface-level RTL changes.'
      : 'Detected text editors appear to have reasonable BiDi support.',
    engines,
  };
}
