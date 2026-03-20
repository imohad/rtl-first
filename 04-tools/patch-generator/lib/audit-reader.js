/**
 * Audit Reader
 * Reads rtl-audit JSON output and extracts actionable items per layer.
 * Can also do a lightweight scan if no audit file is provided.
 * Zero dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Read audit JSON file from rtl-audit output
 */
function readAuditFile(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    return { error: `Audit file not found: ${absPath}` };
  }

  try {
    const content = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    return normalizeAudit(content);
  } catch (e) {
    return { error: `Failed to parse audit file: ${e.message}` };
  }
}

/**
 * Normalize different audit output formats
 */
function normalizeAudit(data) {
  // Support both rtl-audit output format and raw scan
  return {
    layers: {
      1: data.layer1 || data.layers?.[1] || { status: 'unknown' },
      2: data.layer2 || data.layers?.[2] || { status: 'unknown' },
      3: data.layer3 || data.layers?.[3] || { status: 'unknown' },
      4: data.layer4 || data.layers?.[4] || { status: 'unknown' },
      5: data.layer5 || data.layers?.[5] || { status: 'unknown' }
    },
    projectName: data.projectName || data.name || 'unknown',
    score: data.score || null
  };
}

/**
 * Quick scan a project directory for RTL issues (lightweight audit)
 */
function quickScan(dir) {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    return { error: `Directory not found: ${absDir}` };
  }

  const result = {
    projectName: path.basename(absDir),
    layers: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }
  };

  // Layer 2: Check for dir="rtl"
  result.layers[2] = scanDirection(absDir);

  // Layer 3: Count physical CSS properties
  result.layers[3] = scanCSS(absDir);

  // Layer 4: Check locale files
  result.layers[4] = scanTranslations(absDir);

  // Layer 5: Quick hardcoded string check
  result.layers[5] = scanHardcoded(absDir);

  return result;
}

/**
 * Scan for direction-related code
 */
function scanDirection(dir) {
  const result = {
    status: 'unknown',
    hasDir: false,
    files: []
  };

  const rootFiles = [
    'app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx',
    'pages/_document.tsx', 'src/pages/_document.tsx',
    'app/root.tsx', 'index.html', 'public/index.html',
    'src/index.html', 'src/app.html'
  ];

  for (const f of rootFiles) {
    const fullPath = path.join(dir, f);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    if (/dir\s*=\s*["']rtl["']/.test(content)) {
      result.hasDir = true;
      result.status = 'ok';
    } else {
      result.files.push(f);
      result.status = 'missing';
    }
    break;
  }

  return result;
}

/**
 * Scan CSS files for physical properties
 */
function scanCSS(dir) {
  const physicalProps = [
    'margin-left', 'margin-right',
    'padding-left', 'padding-right',
    'border-left', 'border-right',
    'left:', 'right:',
    'text-align: left', 'text-align: right',
    'marginLeft', 'marginRight',
    'paddingLeft', 'paddingRight'
  ];

  const result = {
    status: 'unknown',
    totalFiles: 0,
    totalOccurrences: 0,
    fileList: []
  };

  const extensions = ['.css', '.scss', '.less', '.ts', '.tsx', '.jsx', '.vue', '.svelte'];

  function walk(currentDir, depth) {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', '.output'].includes(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          let fileCount = 0;

          for (const prop of physicalProps) {
            const regex = new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) fileCount += matches.length;
          }

          if (fileCount > 0) {
            result.totalFiles++;
            result.totalOccurrences += fileCount;
            result.fileList.push({
              path: path.relative(dir, fullPath),
              occurrences: fileCount
            });
          }
        } catch {}
      }
    }
  }

  walk(dir, 0);
  result.status = result.totalFiles > 0 ? 'needs-fix' : 'ok';
  // Sort by occurrences descending
  result.fileList.sort((a, b) => b.occurrences - a.occurrences);

  return result;
}

/**
 * Scan for translation files
 */
function scanTranslations(dir) {
  const result = {
    status: 'unknown',
    hasArabic: false,
    sourceKeys: 0,
    targetKeys: 0,
    missingKeys: 0,
    sourceFile: null,
    targetFile: null
  };

  // Find en.json or en-US directory
  const searchDirs = [
    'i18n', 'locales', 'locale', 'messages', 'lang',
    'src/i18n', 'src/locales', 'public/locales',
    'web/i18n', 'app/i18n'
  ];

  for (const d of searchDirs) {
    const fullDir = path.join(dir, d);
    if (!fs.existsSync(fullDir)) continue;

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });

    // Nested dirs
    const arDir = entries.find(e => e.isDirectory() && /^ar(-[A-Z]{2})?$/.test(e.name));
    const enDir = entries.find(e => e.isDirectory() && /^en(-[A-Z]{2})?$/.test(e.name));

    if (enDir) {
      result.sourceFile = path.join(d, enDir.name);
      if (arDir) {
        result.hasArabic = true;
        result.targetFile = path.join(d, arDir.name);
      }
      result.status = arDir ? 'partial' : 'missing';
      break;
    }

    // Flat files
    const arFile = entries.find(e => e.isFile() && /^ar(-[A-Z]{2})?\.json$/.test(e.name));
    const enFile = entries.find(e => e.isFile() && /^en(-[A-Z]{2})?\.json$/.test(e.name));

    if (enFile) {
      result.sourceFile = path.join(d, enFile.name);
      if (arFile) {
        result.hasArabic = true;
        result.targetFile = path.join(d, arFile.name);
      }
      result.status = arFile ? 'partial' : 'missing';
      break;
    }
  }

  return result;
}

/**
 * Quick scan for hardcoded strings in JSX
 */
function scanHardcoded(dir) {
  const result = {
    status: 'unknown',
    count: 0,
    samples: []
  };

  // Simple pattern: English text inside JSX tags
  const pattern = />\s*([A-Z][a-z]+(?:\s+[A-Za-z]+){1,5})\s*</g;

  function walk(currentDir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          let match;
          while ((match = pattern.exec(content)) !== null) {
            result.count++;
            if (result.samples.length < 10) {
              const line = content.substring(0, match.index).split('\n').length;
              result.samples.push({
                file: path.relative(dir, fullPath),
                line,
                text: match[1].trim()
              });
            }
          }
        } catch {}
      }
    }
  }

  walk(dir, 0);
  result.status = result.count > 0 ? 'needs-fix' : 'ok';

  return result;
}

module.exports = { readAuditFile, quickScan, normalizeAudit };
