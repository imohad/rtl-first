import { readdirSync } from 'fs';
import { join, extname } from 'path';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.nyc_output', '.turbo', '.cache', 'vendor',
  '__pycache__', '.svelte-kit', '.output', 'out',
]);

/**
 * Walk a directory tree and yield file paths matching given extensions.
 */
export function walkFiles(dir, extensions, maxDepth = 15) {
  const results = [];
  walk(dir, extensions, results, 0, maxDepth);
  return results;
}

function walk(dir, extensions, results, depth, maxDepth) {
  if (depth > maxDepth) return;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), extensions, results, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (extensions.has ? extensions.has(ext) : extensions.includes(ext)) {
        results.push(join(dir, entry.name));
      }
    }
  }
}
