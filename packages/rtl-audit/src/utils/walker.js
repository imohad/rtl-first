import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.nyc_output', '.turbo', '.cache', 'vendor',
  '__pycache__', '.svelte-kit', '.output', 'out',
]);

/**
 * Walk a directory tree and yield file paths matching given extensions.
 * @param {string} dir - Root directory
 * @param {string[]} extensions - File extensions to include (e.g. ['.ts', '.tsx'])
 * @param {number} maxDepth - Maximum directory depth (default: 15)
 * @returns {string[]} Array of matching file paths
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
    return; // Skip directories we can't read
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), extensions, results, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(join(dir, entry.name));
      }
    }
  }
}

/**
 * Find a file by name in a directory (non-recursive or shallow recursive).
 * @param {string} dir - Directory to search
 * @param {string} fileName - Exact filename to find
 * @param {number} maxDepth - How deep to search (default: 3)
 * @returns {string[]} Array of matching paths
 */
export function findFiles(dir, fileName, maxDepth = 3) {
  const results = [];
  findRecursive(dir, fileName, results, 0, maxDepth);
  return results;
}

function findRecursive(dir, fileName, results, depth, maxDepth) {
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
      findRecursive(join(dir, entry.name), fileName, results, depth + 1, maxDepth);
    } else if (entry.isFile() && entry.name === fileName) {
      results.push(join(dir, entry.name));
    }
  }
}
