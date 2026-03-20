/**
 * i18n System Detector
 * Detects the i18n library, locale directory structure, source locale files,
 * and configuration files.
 * Zero dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively find files matching a pattern
 */
function findFiles(dir, pattern, opts = {}) {
  const { maxDepth = 6, exclude = ['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', '.output'] } = opts;
  const results = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * Find locale directories and files
 */
function findLocaleFiles(dir) {
  const absDir = path.resolve(dir);
  const localeInfo = {
    sourceLocale: null,
    sourceFiles: [],
    localeDir: null,
    structure: null, // 'flat' | 'nested-dirs' | 'nested-files'
    existingLocales: [],
    hasArabic: false
  };

  // Strategy 1: Look for i18n/locales/messages directories
  const commonDirs = [
    'i18n', 'locales', 'locale', 'messages', 'lang', 'langs',
    'src/i18n', 'src/locales', 'src/locale', 'src/messages', 'src/lang',
    'public/locales', 'public/i18n',
    'app/i18n', 'app/locales',
    'web/i18n', 'web/app/i18n'
  ];

  for (const d of commonDirs) {
    const fullDir = path.join(absDir, d);
    if (!fs.existsSync(fullDir)) continue;

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });

    // Check for nested-dirs structure: i18n/en-US/*.json, i18n/zh-Hans/*.json
    const subDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));
    if (subDirs.length > 0) {
      // Check if subdirs look like locale codes
      const localePattern = /^[a-z]{2}(-[A-Z]{2}|[-_][a-zA-Z]+)?$/;
      const localeDirs = subDirs.filter(e => localePattern.test(e.name));

      if (localeDirs.length > 0) {
        localeInfo.localeDir = d;
        localeInfo.structure = 'nested-dirs';
        localeInfo.existingLocales = localeDirs.map(e => e.name);

        // Find source locale (en, en-US, en_US)
        const enDir = localeDirs.find(e => /^en(-US|_US)?$/.test(e.name));
        if (enDir) {
          localeInfo.sourceLocale = enDir.name;
          const enPath = path.join(fullDir, enDir.name);
          const jsonFiles = fs.readdirSync(enPath).filter(f => f.endsWith('.json'));
          localeInfo.sourceFiles = jsonFiles.map(f => ({
            name: f,
            path: path.join(d, enDir.name, f),
            keys: countKeys(path.join(enPath, f))
          }));
        }

        localeInfo.hasArabic = localeDirs.some(e => /^ar(-[A-Z]{2})?$/.test(e.name));
        return localeInfo;
      }
    }

    // Check for flat structure: i18n/en.json, i18n/ar.json
    const jsonFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));
    if (jsonFiles.length > 0) {
      const localePattern = /^([a-z]{2}(-[A-Z]{2}|[-_][a-zA-Z]+)?)\.json$/;
      const localeFiles = jsonFiles.filter(e => localePattern.test(e.name));

      if (localeFiles.length > 0) {
        localeInfo.localeDir = d;
        localeInfo.structure = 'flat';
        localeInfo.existingLocales = localeFiles.map(e => e.name.replace('.json', ''));

        const enFile = localeFiles.find(e => /^en(-US|_US)?\.json$/.test(e.name));
        if (enFile) {
          localeInfo.sourceLocale = enFile.name.replace('.json', '');
          localeInfo.sourceFiles = [{
            name: enFile.name,
            path: path.join(d, enFile.name),
            keys: countKeys(path.join(fullDir, enFile.name))
          }];
        }

        localeInfo.hasArabic = localeFiles.some(e => /^ar(-[A-Z]{2})?\.json$/.test(e.name));
        return localeInfo;
      }
    }

    // Check for nested-files: i18n/en/common.json structure but with .ts/.js files
    const tsFiles = entries.filter(e => e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.js')));
    if (tsFiles.length > 0) {
      const localePattern = /^([a-z]{2}(-[A-Z]{2}|[-_][a-zA-Z]+)?)\.(ts|js)$/;
      const localeModules = tsFiles.filter(e => localePattern.test(e.name));

      if (localeModules.length > 0) {
        localeInfo.localeDir = d;
        localeInfo.structure = 'nested-files';
        localeInfo.existingLocales = localeModules.map(e => e.name.replace(/\.(ts|js)$/, ''));

        const enFile = localeModules.find(e => /^en(-US|_US)?\.(ts|js)$/.test(e.name));
        if (enFile) {
          localeInfo.sourceLocale = enFile.name.replace(/\.(ts|js)$/, '');
          localeInfo.sourceFiles = [{
            name: enFile.name,
            path: path.join(d, enFile.name),
            keys: 0 // Can't easily count keys in TS/JS modules
          }];
        }

        localeInfo.hasArabic = localeModules.some(e => /^ar(-[A-Z]{2})?\.(ts|js)$/.test(e.name));
        return localeInfo;
      }
    }
  }

  // Strategy 2: Search for en.json / en-US.json anywhere
  const enJsonFiles = findFiles(absDir, /^en(-US|_US)?\.json$/, { maxDepth: 4 });
  if (enJsonFiles.length > 0) {
    const enFile = enJsonFiles[0];
    const enDir = path.dirname(enFile);
    const relDir = path.relative(absDir, enDir);

    localeInfo.localeDir = relDir;
    localeInfo.structure = 'flat';
    localeInfo.sourceLocale = path.basename(enFile, '.json');
    localeInfo.sourceFiles = [{
      name: path.basename(enFile),
      path: path.relative(absDir, enFile),
      keys: countKeys(enFile)
    }];

    // Check siblings
    const siblings = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
    localeInfo.existingLocales = siblings.map(f => f.replace('.json', ''));
    localeInfo.hasArabic = siblings.some(f => /^ar(-[A-Z]{2})?\.json$/.test(f));

    return localeInfo;
  }

  return localeInfo;
}

/**
 * Count keys in a JSON file (supports nested objects with dot notation)
 */
function countKeys(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return countNestedKeys(content);
  } catch {
    return 0;
  }
}

function countNestedKeys(obj, prefix = '') {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countNestedKeys(obj[key], `${prefix}${key}.`);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Detect the i18n library from package.json
 */
function detectI18nLibrary(dir) {
  const pkgPath = path.join(path.resolve(dir), 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Order matters: more specific first
  if (allDeps['next-intl']) return {
    name: 'next-intl',
    label: 'next-intl',
    configPattern: 'i18n.ts',
    localeRegistration: 'config'
  };
  if (allDeps['react-i18next'] || allDeps['i18next']) return {
    name: 'i18next',
    label: 'i18next / react-i18next',
    configPattern: 'i18n.{ts,js,tsx,jsx}',
    localeRegistration: 'import'
  };
  if (allDeps['vue-i18n'] || allDeps['@nuxtjs/i18n']) return {
    name: 'vue-i18n',
    label: 'vue-i18n',
    configPattern: 'i18n.{ts,js}',
    localeRegistration: 'config'
  };
  if (allDeps['@angular/localize']) return {
    name: 'angular-i18n',
    label: 'Angular i18n',
    configPattern: 'angular.json',
    localeRegistration: 'angular-config'
  };
  if (allDeps['svelte-i18n']) return {
    name: 'svelte-i18n',
    label: 'svelte-i18n',
    configPattern: 'i18n.{ts,js}',
    localeRegistration: 'import'
  };
  if (allDeps['@formatjs/intl'] || allDeps['react-intl']) return {
    name: 'react-intl',
    label: 'react-intl / FormatJS',
    configPattern: 'i18n.{ts,js}',
    localeRegistration: 'import'
  };

  return null;
}

/**
 * Find i18n config files that need to be updated
 */
function findI18nConfig(dir) {
  const absDir = path.resolve(dir);
  const configPatterns = [
    /i18n\.(ts|js|tsx|jsx|mjs)$/,
    /i18next\.(ts|js)$/,
    /next-intl\.config\.(ts|js)$/,
    /i18n[-_]config\.(ts|js)$/,
    /language\.(ts|js)$/,
    /languages\.(ts|js)$/,
    /locales?\.(ts|js)$/
  ];

  const found = [];

  // Search common locations
  const searchDirs = [
    absDir,
    path.join(absDir, 'src'),
    path.join(absDir, 'app'),
    path.join(absDir, 'config'),
    path.join(absDir, 'lib'),
    path.join(absDir, 'web'),
    path.join(absDir, 'web/i18n'),
    path.join(absDir, 'web/i18n-config'),
    path.join(absDir, 'i18n'),
    path.join(absDir, 'i18n-config')
  ];

  for (const searchDir of searchDirs) {
    if (!fs.existsSync(searchDir)) continue;
    const entries = fs.readdirSync(searchDir);

    for (const entry of entries) {
      for (const pattern of configPatterns) {
        if (pattern.test(entry)) {
          const fullPath = path.join(searchDir, entry);
          const relPath = path.relative(absDir, fullPath);
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check if it contains locale-related content
          if (/locale|language|i18n|translation|supported/i.test(content)) {
            found.push({
              path: relPath,
              fullPath,
              content,
              containsLocaleList: /\[\s*['"]/.test(content) || /value:\s*['"]/.test(content),
              containsArabic: /['"]ar['"]|arabic/i.test(content)
            });
          }
        }
      }
    }
  }

  return found;
}

module.exports = {
  findLocaleFiles,
  detectI18nLibrary,
  findI18nConfig,
  countKeys,
  findFiles
};
