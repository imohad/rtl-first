/**
 * @rtl-first/contributor-agent
 *
 * Generates contribution plans, GitHub issue templates, and PR descriptions
 * from rtl-audit results. Works in two modes:
 *
 *   1. Template mode (default, no API key needed) — uses built-in templates
 *   2. AI mode (ANTHROPIC_API_KEY set) — uses Claude API for richer output
 */

/**
 * Generate a complete contribution plan from an audit report.
 * @param {object} auditReport - Output from @rtl-first/audit
 * @param {object} options - { apiKey, projectUrl }
 * @returns {object} Contribution plan with issue, PRs, and priority
 */
export async function generatePlan(auditReport, options = {}) {
  const { apiKey, projectUrl } = options;
  const plan = buildTemplatePlan(auditReport, projectUrl);

  if (apiKey) {
    try {
      const enhanced = await enhanceWithAI(plan, auditReport, apiKey);
      return enhanced;
    } catch (err) {
      plan._aiError = err.message;
      return plan;
    }
  }

  return plan;
}

/**
 * Generate a GitHub issue body from audit results (template mode).
 */
export function generateIssue(auditReport, projectUrl) {
  const { projectName, score, layers, priority } = auditReport;
  const lines = [];

  lines.push(`## RTL Audit Summary`);
  lines.push('');
  lines.push(`I ran an RTL readiness audit on ${projectName} using [rtl-first](https://github.com/imohad/rtl-first), a framework for evaluating RTL support across 5 architectural layers.`);
  lines.push('');
  lines.push(`**RTL Readiness Score: ${score.total}/100 (${score.grade})**`);
  lines.push('');

  // Summary table
  lines.push('| Layer | Status | Summary |');
  lines.push('|-------|--------|---------|');

  const layerNames = [
    { key: 'layer1', name: 'Text engine' },
    { key: 'layer2', name: 'Direction logic' },
    { key: 'layer3', name: 'CSS layout' },
    { key: 'layer4', name: 'Translations' },
    { key: 'layer5', name: 'Hardcoded text' },
  ];

  for (const { key, name } of layerNames) {
    const l = layers[key];
    const icon = l.status === 'pass' ? '✅' : l.status === 'warn' ? '⚠️' : '❌';
    lines.push(`| ${name} | ${icon} | ${l.summary} |`);
  }

  lines.push('');

  // What's working
  const passing = layerNames.filter(({ key }) => layers[key].status === 'pass');
  if (passing.length > 0) {
    lines.push('## What\'s working well');
    lines.push('');
    for (const { key, name } of passing) {
      lines.push(`- **${name}**: ${layers[key].summary}`);
    }
    lines.push('');
  }

  // What needs work
  const failing = layerNames.filter(({ key }) => layers[key].status !== 'pass');
  if (failing.length > 0) {
    lines.push('## What needs improvement');
    lines.push('');

    for (const { key, name } of failing) {
      const l = layers[key];
      lines.push(`### ${name}`);
      lines.push('');
      lines.push(l.detail || l.summary);
      lines.push('');

      if (key === 'layer3' && l.breakdown) {
        lines.push('| Property | Count |');
        lines.push('|----------|-------|');
        for (const [prop, count] of Object.entries(l.breakdown).slice(0, 8)) {
          lines.push(`| \`${prop}\` | ${count} |`);
        }
        lines.push('');
      }

      if (key === 'layer4' && l.gaps) {
        for (const gap of (l.gaps || []).slice(0, 5)) {
          if (gap.targetPath || gap.targetKeys > 0) {
            lines.push(`- Source: ${gap.sourceKeys || gap.sourceKeyCount} keys → Target: ${gap.targetKeys || gap.targetKeyCount} keys (${gap.missing || gap.missingKeys} missing)`);
          } else {
            lines.push(`- Source: ${gap.sourceKeys || gap.sourceKeyCount} keys → Target: **not found**`);
          }
        }
        lines.push('');
      }

      if (l.fix) {
        lines.push(`**Fix:** \`${l.fix}\``);
        lines.push('');
      }
    }
  }

  // Proposal
  lines.push('## Proposal');
  lines.push('');
  lines.push('I\'d like to contribute incrementally to improve RTL support. Before submitting any PRs, I wanted to align with the team:');
  lines.push('');
  lines.push('1. **Is RTL improvement on the roadmap?**');
  lines.push('2. **What\'s the preferred approach for bulk CSS changes?** I have a codemod script that converts physical → logical properties automatically.');
  lines.push('3. **Which area should I start with?**');
  lines.push('');
  lines.push('Happy to start with whichever area the team prefers.');
  lines.push('');

  // Priority
  if (priority && priority.length > 0) {
    lines.push('## Suggested priority');
    lines.push('');
    for (let i = 0; i < priority.length; i++) {
      lines.push(`${i + 1}. ${priority[i]}`);
    }
    lines.push('');
  }

  lines.push('## Methodology');
  lines.push('');
  lines.push('This audit uses the [Five Layers of RTL Readiness](https://github.com/imohad/rtl-first/blob/main/docs/for-contributors/methodology.md) framework.');

  return {
    title: `Improve RTL support — ${buildTitleSuffix(layers)}`,
    body: lines.join('\n'),
    labels: ['i18n', 'rtl', 'enhancement'],
  };
}

/**
 * Generate PR descriptions for each fixable layer.
 */
export function generatePRs(auditReport) {
  const { layers } = auditReport;
  const prs = [];

  // Layer 4 — Translations (safest, do first)
  if (layers.layer4.status !== 'pass') {
    const l4 = layers.layer4;
    const missing = l4.totalMissing || l4.gaps?.reduce((s, g) => s + (g.missing || g.missingKeys || 0), 0) || 0;
    prs.push({
      order: 1,
      layer: 'Layer 4 — Translations',
      title: `i18n: complete Arabic translation (${missing} missing keys)`,
      body: `## What this PR does\n\nCompletes the Arabic (ar) translation by adding ${missing} missing keys.\n\n## How to verify\n\n1. Switch language to Arabic\n2. Navigate through the app\n3. Verify no untranslated strings appear\n\n## Generated by\n\n[rtl-first](https://github.com/imohad/rtl-first) translation-kit`,
      risk: 'Low — translation-only change, no logic affected',
      files: 'ar.json / ar-TN/*.json',
    });
  }

  // Layer 5 — Hardcoded strings
  if (layers.layer5.status !== 'pass') {
    const count = layers.layer5.count || 0;
    prs.push({
      order: 2,
      layer: 'Layer 5 — Hardcoded text',
      title: `i18n: replace ${count} hardcoded English strings with translation keys`,
      body: `## What this PR does\n\nReplaces hardcoded English strings in JSX with i18n translation keys.\n\n## Why\n\nHardcoded strings are invisible to the translation system. Users of RTL languages see English text mixed with their language.\n\n## How to verify\n\n1. Search for the replaced strings — they should now use t() or equivalent\n2. Switch to Arabic — the strings should be translated\n\n## Generated by\n\n[rtl-first](https://github.com/imohad/rtl-first) contributor-agent`,
      risk: 'Low — text replacement only',
      files: '*.tsx / *.jsx',
    });
  }

  // Layer 3 — CSS
  if (layers.layer3.status !== 'pass') {
    const count = layers.layer3.totalOccurrences || 0;
    const files = layers.layer3.filesWithIssues || 0;
    prs.push({
      order: 3,
      layer: 'Layer 3 — CSS layout',
      title: `feat: add RTL codemod script (${count} physical CSS properties in ${files} files)`,
      body: `## What this PR does\n\nAdds a codemod script that converts physical CSS properties to logical properties for RTL support.\n\n**This PR contains the script only — not the converted files.** Maintainers can review the script and run it to apply changes.\n\n## Usage\n\n\`\`\`bash\nnpx @rtl-first/codemod --dry-run ./src  # preview\nnpx @rtl-first/codemod ./src             # apply\n\`\`\`\n\n## What it converts\n\n- \`margin-left\` → \`margin-inline-start\`\n- \`padding-right\` → \`padding-inline-end\`\n- \`left: 0\` → \`inset-inline-start: 0\`\n- And 20+ other patterns\n\n## Why a script instead of changed files?\n\nA PR with ${files} changed files is hard to review. A script is reviewable, verifiable, and reproducible.\n\n## Generated by\n\n[rtl-first](https://github.com/imohad/rtl-first) contributor-agent`,
      risk: 'Medium — CSS changes may affect visual layout. Use --dry-run first.',
      files: 'scripts/rtl-codemod.js + docs/RTL-SUPPORT.md',
    });
  }

  // Layer 2 — Direction logic
  if (layers.layer2.status !== 'pass') {
    prs.push({
      order: 4,
      layer: 'Layer 2 — Direction logic',
      title: `feat: add RTL direction detection and DirectionProvider`,
      body: `## What this PR does\n\nAdds RTL direction support:\n\n- Sets \`dir="rtl"\` on document root when an RTL locale is active\n- Adds \`lang\` attribute for proper text rendering\n- Wraps app in DirectionProvider (if Radix UI is used)\n\n## How to verify\n\n1. Switch language to Arabic\n2. Verify the page layout mirrors (right-to-left)\n3. Check that dropdowns/menus open in the correct direction\n\n## Generated by\n\n[rtl-first](https://github.com/imohad/rtl-first) contributor-agent`,
      risk: 'Medium — affects global layout direction',
      files: 'i18n config + root component',
    });
  }

  return prs;
}

/**
 * Build a template-based contribution plan (no AI needed).
 */
function buildTemplatePlan(auditReport, projectUrl) {
  const issue = generateIssue(auditReport, projectUrl);
  const prs = generatePRs(auditReport);

  return {
    projectName: auditReport.projectName,
    score: auditReport.score,
    mode: 'template',
    issue,
    prs,
    strategy: buildStrategy(auditReport),
    warnings: buildWarnings(auditReport),
  };
}

/**
 * Build a contribution strategy based on audit results.
 */
function buildStrategy(report) {
  const steps = [];
  const { layers } = report;

  steps.push({
    week: 0,
    action: 'Open an issue with the audit report',
    detail: 'Wait for maintainer response before submitting any PRs',
  });

  if (layers.layer4.status !== 'pass') {
    steps.push({
      week: 1,
      action: 'Complete Arabic translations',
      detail: 'Safest contribution — always welcome',
    });
  }

  if (layers.layer5.status !== 'pass') {
    steps.push({
      week: 1,
      action: 'Fix hardcoded strings',
      detail: 'Small PRs, 3-5 files each, builds trust',
    });
  }

  if (layers.layer3.status !== 'pass') {
    steps.push({
      week: 2,
      action: 'Submit CSS codemod as a script',
      detail: 'Submit the script, not the changed files',
    });
  }

  if (layers.layer2.status !== 'pass') {
    steps.push({
      week: 3,
      action: 'Add direction detection',
      detail: 'Requires understanding the app architecture',
    });
  }

  if (layers.layer1.status === 'warn' || layers.layer1.status === 'fail') {
    steps.push({
      week: 4,
      action: 'Open a proposal for text engine BiDi support',
      detail: 'This is deep work — needs maintainer buy-in first',
    });
  }

  return steps;
}

/**
 * Build warnings about potential issues.
 */
function buildWarnings(report) {
  const warnings = [];

  if (report.layers.layer1.status === 'warn') {
    warnings.push('This project uses a text editor that may not support BiDi. CSS and translation fixes alone will not provide full RTL support. Document this limitation in your issue.');
  }

  if (report.layers.layer3.totalOccurrences > 200) {
    warnings.push(`${report.layers.layer3.totalOccurrences} physical CSS properties detected. Do NOT submit these as changed files — use a codemod script instead.`);
  }

  warnings.push('Always open an issue before submitting PRs. Surprise PRs in large projects get rejected.');

  return warnings;
}

/**
 * Build a concise title suffix from layer results.
 */
function buildTitleSuffix(layers) {
  const parts = [];
  if (layers.layer3.status !== 'pass' && layers.layer3.totalOccurrences) {
    parts.push(`${layers.layer3.totalOccurrences} CSS properties`);
  }
  if (layers.layer4.status !== 'pass') {
    const missing = layers.layer4.totalMissing || layers.layer4.gaps?.reduce((s, g) => s + (g.missing || g.missingKeys || 0), 0) || 0;
    if (missing > 0) parts.push(`${missing} missing translation keys`);
  }
  if (layers.layer5.status !== 'pass' && layers.layer5.count) {
    parts.push(`${layers.layer5.count} hardcoded strings`);
  }
  return parts.join(' + ') || 'RTL improvements needed';
}

/**
 * Enhance the plan using Claude API (optional).
 */
async function enhanceWithAI(plan, auditReport, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an expert open-source contributor specializing in RTL/internationalization.

Given this RTL audit report for "${auditReport.projectName}":
- Score: ${auditReport.score.total}/100 (${auditReport.score.grade})
- Layer 1 (Text engine): ${auditReport.layers.layer1.status} — ${auditReport.layers.layer1.summary}
- Layer 2 (Direction): ${auditReport.layers.layer2.status} — ${auditReport.layers.layer2.summary}
- Layer 3 (CSS): ${auditReport.layers.layer3.status} — ${auditReport.layers.layer3.summary}
- Layer 4 (Translations): ${auditReport.layers.layer4.status} — ${auditReport.layers.layer4.summary}
- Layer 5 (Hardcoded): ${auditReport.layers.layer5.status} — ${auditReport.layers.layer5.summary}

Write a brief, practical contribution strategy (3-5 sentences) that a developer should follow. Be specific about what to fix first and why. Mention any risks or gotchas.

Respond in plain text only, no markdown.`
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const aiStrategy = data.content?.[0]?.text || '';

  return {
    ...plan,
    mode: 'ai-enhanced',
    aiStrategy,
  };
}
