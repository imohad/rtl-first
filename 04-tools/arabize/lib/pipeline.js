/**
 * Arabization Pipeline
 * Orchestrates all rtl-first tools in the correct order.
 * Each step is independent — if one fails, others still run.
 * Zero additional dependencies (uses sibling packages).
 */

const path = require('path');
const fs = require('fs');

/**
 * Try to load a sibling package, fall back to local lib
 */
function loadTool(npmName, localPath) {
  // Try npm package first, then relative paths for monorepo/local dev
  const attempts = [
    npmName,
    localPath,
    `../../${npmName.replace('@rtl-first/', '')}`,
    `../${npmName.replace('@rtl-first/', '')}`
  ];

  for (const attempt of attempts) {
    try {
      return require(attempt);
    } catch {}
  }
  return null;
}

/**
 * Quick CSS scan (inline, no dependency needed)
 */
function quickCSSScan(dir) {
  const physicalProps = [
    'margin-left', 'margin-right', 'padding-left', 'padding-right',
    'border-left', 'border-right', 'text-align: left', 'text-align: right',
    'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'
  ];
  const extensions = ['.css', '.scss', '.ts', '.tsx', '.jsx', '.vue'];
  let totalFiles = 0;
  let totalOccurrences = 0;

  function walk(currentDir, depth) {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (['node_modules', '.git', '.next', '.nuxt', 'dist', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) { walk(fullPath, depth + 1); continue; }
      if (!extensions.some(ext => entry.name.endsWith(ext))) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        let count = 0;
        for (const prop of physicalProps) {
          const regex = new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          const matches = content.match(regex);
          if (matches) count += matches.length;
        }
        if (count > 0) { totalFiles++; totalOccurrences += count; }
      } catch {}
    }
  }

  walk(dir, 0);
  return { totalFiles, totalOccurrences };
}

/**
 * Quick locale scan (inline)
 */
function quickLocaleScan(dir) {
  const commonDirs = [
    'i18n', 'locales', 'locale', 'messages', 'lang',
    'src/i18n', 'src/locales', 'public/locales', 'web/i18n'
  ];

  for (const d of commonDirs) {
    const fullDir = path.join(dir, d);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    const enDir = entries.find(e => e.isDirectory() && /^en(-US|_US)?$/.test(e.name));
    const arDir = entries.find(e => e.isDirectory() && /^ar(-[A-Z]{2})?$/.test(e.name));
    const enFile = entries.find(e => e.isFile() && /^en(-US|_US)?\.json$/.test(e.name));
    const arFile = entries.find(e => e.isFile() && /^ar(-[A-Z]{2})?\.json$/.test(e.name));

    if (enDir || enFile) {
      return {
        found: true,
        hasArabic: !!(arDir || arFile),
        localeDir: d,
        structure: enDir ? 'nested-dirs' : 'flat'
      };
    }
  }

  return { found: false, hasArabic: false };
}

/**
 * Detect framework (inline, minimal)
 */
function quickFrameworkDetect(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return { name: 'unknown', label: 'Unknown' };

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.next) {
    if (fs.existsSync(path.join(dir, 'src/app/layout.tsx')) || fs.existsSync(path.join(dir, 'app/layout.tsx')))
      return { name: 'next-app', label: 'Next.js (App Router)' };
    return { name: 'next-pages', label: 'Next.js (Pages Router)' };
  }
  if (fs.existsSync(path.join(dir, 'nuxt.config.ts')) || fs.existsSync(path.join(dir, 'nuxt.config.js')))
    return { name: 'nuxt', label: 'Nuxt 3' };
  if (deps['@remix-run/react']) return { name: 'remix', label: 'Remix' };
  if (deps['@sveltejs/kit']) return { name: 'sveltekit', label: 'SvelteKit' };
  if (fs.existsSync(path.join(dir, 'angular.json'))) return { name: 'angular', label: 'Angular' };
  if (fs.existsSync(path.join(dir, 'vite.config.ts')) || fs.existsSync(path.join(dir, 'vite.config.js')))
    return { name: 'vite', label: 'Vite' };
  if (deps['react-scripts']) return { name: 'cra', label: 'Create React App' };

  return { name: 'unknown', label: 'Unknown' };
}

/**
 * Run the full arabization pipeline
 */
function runPipeline(dir, options = {}) {
  const {
    lang = 'ar',
    dryRun = false,
    skipCSS = false,
    skipLocale = false,
    skipDirection = false,
    skipPatches = false,
    stubMode = 'copy',
    json = false
  } = options;

  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    return { success: false, error: `Directory not found: ${absDir}` };
  }

  const steps = [];
  const startTime = Date.now();

  // Pre-scan
  const framework = quickFrameworkDetect(absDir);
  const cssScan = quickCSSScan(absDir);
  const localeScan = quickLocaleScan(absDir);

  // Step 1: Direction
  if (!skipDirection) {
    const directionTool = loadTool('@rtl-first/direction-injector', '../direction-injector/index');
    if (directionTool) {
      const result = directionTool.run(absDir, { lang, dryRun });
      steps.push({
        name: 'direction',
        label: 'Direction Injection',
        layer: 2,
        success: result.success,
        changes: result.injection?.changes || [],
        alreadyDone: result.injection?.alreadyDone || false,
        error: result.injection?.error || null
      });
    } else {
      steps.push({
        name: 'direction',
        label: 'Direction Injection',
        layer: 2,
        success: false,
        changes: [],
        error: 'direction-injector not available — install @rtl-first/direction-injector'
      });
    }
  }

  // Step 2: Locale Scaffolding
  if (!skipLocale) {
    const localeTool = loadTool('@rtl-first/locale-scaffolder', '../locale-scaffolder/index');
    if (localeTool) {
      const result = localeTool.run(absDir, { lang, dryRun, stubMode });
      steps.push({
        name: 'locale',
        label: 'Locale Scaffolding',
        layer: 4,
        success: result.success,
        changes: result.scaffold?.changes || [],
        alreadyDone: result.scaffold?.alreadyExists || false,
        error: result.scaffold?.errors?.[0] || null,
        warnings: result.config?.warnings || []
      });
    } else {
      steps.push({
        name: 'locale',
        label: 'Locale Scaffolding',
        layer: 4,
        success: false,
        changes: [],
        error: 'locale-scaffolder not available — install @rtl-first/locale-scaffolder'
      });
    }
  }

  // Step 3: Patch Generation (includes CSS)
  if (!skipPatches) {
    const patchTool = loadTool('@rtl-first/patch-generator', '../patch-generator/index');
    if (patchTool) {
      const layers = [];
      if (!skipCSS) layers.push(3);
      // Don't duplicate direction/locale — just CSS patches
      const result = patchTool.run(absDir, { layers, lang, dryRun });
      steps.push({
        name: 'patches',
        label: 'Patch Generation',
        layer: 3,
        success: result.success,
        changes: result.patches?.map(p => `${p.name}: ${p.description}`) || [],
        error: null
      });
    } else {
      steps.push({
        name: 'patches',
        label: 'Patch Generation',
        layer: 3,
        success: false,
        changes: [],
        error: 'patch-generator not available — install @rtl-first/patch-generator'
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    success: steps.every(s => s.success || s.alreadyDone),
    framework,
    cssScan,
    localeScan,
    steps,
    elapsed,
    lang,
    dryRun
  };
}

module.exports = { runPipeline, quickFrameworkDetect, quickCSSScan, quickLocaleScan };
