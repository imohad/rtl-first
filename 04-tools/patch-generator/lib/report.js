/**
 * Report Generator for Patch Generator
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function generateReport(patches, outputDir, options = {}) {
  const lines = [];

  lines.push('');
  lines.push(c('cyan', '  RTL Patch Generator'));
  lines.push(c('dim', '  ═══════════════════════'));
  lines.push('');

  if (options.layers) {
    lines.push(`  Selected layers: ${c('bold', options.layers.join(', '))}`);
  }

  lines.push('');
  lines.push(c('cyan', '  Generated patches:'));
  lines.push(`  ${c('dim', '📁')} ${c('bold', outputDir)}/`);

  for (const patch of patches) {
    const icon = patch.filesAffected === 0 ? c('dim', '○') : c('green', '✓');
    const detail = patch.filesAffected > 0
      ? c('dim', ` (${patch.filesAffected} files)`)
      : c('dim', ' (no changes needed)');
    lines.push(`  ├── ${icon} ${patch.name}${detail}`);
    lines.push(`  │   ${c('dim', patch.description)}`);
  }

  lines.push(`  ├── ${c('green', '✓')} apply-all.sh`);
  lines.push(`  │   ${c('dim', 'Apply all patches in order')}`);
  lines.push(`  └── ${c('green', '✓')} health-check.sh`);
  lines.push(`      ${c('dim', 'Check fork health metrics')}`);

  if (options.dryRun) {
    lines.push('');
    lines.push(`  ${c('yellow', '⚠')}  Dry run — no files were created`);
    lines.push(`     Run without ${c('bold', '--dry-run')} to generate patches`);
  } else {
    lines.push('');
    lines.push(c('cyan', '  Usage:'));
    lines.push(`  Apply all:     ${c('bold', `bash ${outputDir}/apply-all.sh`)}`);
    lines.push(`  Single layer:  ${c('bold', `bash ${outputDir}/apply-all.sh --layer 3`)}`);
    lines.push(`  Health check:  ${c('bold', `bash ${outputDir}/health-check.sh`)}`);
    lines.push('');
    lines.push(c('cyan', '  After upstream rebase:'));
    lines.push(`  ${c('dim', 'git rebase upstream/main && bash ' + outputDir + '/apply-all.sh')}`);
  }

  lines.push('');
  return lines.join('\n');
}

function generateJSONReport(patches, outputDir) {
  return {
    outputDir,
    patches: patches.map(p => ({
      name: p.name,
      layer: p.layer,
      description: p.description,
      filesAffected: p.filesAffected
    })),
    scripts: ['apply-all.sh', 'health-check.sh'],
    usage: {
      applyAll: `bash ${outputDir}/apply-all.sh`,
      singleLayer: `bash ${outputDir}/apply-all.sh --layer <N>`,
      afterRebase: `git rebase upstream/main && bash ${outputDir}/apply-all.sh`
    }
  };
}

module.exports = { generateReport, generateJSONReport };
