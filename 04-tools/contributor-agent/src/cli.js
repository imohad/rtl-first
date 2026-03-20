#!/usr/bin/env node

import { resolve, join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { generatePlan, generateIssue, generatePRs } from './index.js';

const args = process.argv.slice(2);
let auditFile = null;
let projectUrl = null;
let outputDir = null;
let format = 'terminal';
let apiKey = process.env.ANTHROPIC_API_KEY || null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--audit' || args[i] === '-a') && args[i + 1]) {
    auditFile = args[++i];
  } else if ((args[i] === '--url' || args[i] === '-u') && args[i + 1]) {
    projectUrl = args[++i];
  } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
    outputDir = args[++i];
  } else if (args[i] === '--format' && args[i + 1]) {
    format = args[++i];
  } else if (args[i] === '--api-key' && args[i + 1]) {
    apiKey = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--version') {
    console.log('0.1.0');
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    auditFile = args[i];
  }
}

if (!auditFile) {
  console.error('Error: provide an audit report file (JSON from rtl-audit --format json).\n');
  printHelp();
  process.exit(1);
}

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

// Load audit report
const auditPath = resolve(auditFile);
if (!existsSync(auditPath)) {
  console.error(`Error: file "${auditPath}" not found.`);
  process.exit(1);
}

let auditReport;
try {
  auditReport = JSON.parse(readFileSync(auditPath, 'utf-8'));
} catch (err) {
  console.error(`Error: could not parse "${auditPath}" as JSON.`);
  console.error('Run: npx @rtl-first/audit ./project --format json > audit.json');
  process.exit(1);
}

// Generate plan
console.log('');
console.log(bold(`  RTL Contributor Agent`));
console.log(dim(`  Generating contribution plan for ${auditReport.projectName}`));
if (apiKey) console.log(dim(`  Mode: AI-enhanced (Claude API)`));
else console.log(dim(`  Mode: Template (set ANTHROPIC_API_KEY for AI mode)`));
console.log('');

const plan = await generatePlan(auditReport, { apiKey, projectUrl });

if (format === 'json') {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

// Output: Issue
console.log(bold('  ═══ GitHub Issue ═══'));
console.log('');
console.log(`  ${bold('Title:')} ${plan.issue.title}`);
console.log(`  ${bold('Labels:')} ${plan.issue.labels.join(', ')}`);
console.log('');
console.log(dim('  Body preview (first 500 chars):'));
console.log(dim('  ' + plan.issue.body.substring(0, 500).replace(/\n/g, '\n  ')));
console.log(dim('  ...'));
console.log('');

// Output: PRs
console.log(bold('  ═══ Suggested PRs (in order) ═══'));
console.log('');

for (const pr of plan.prs) {
  const riskColor = pr.risk.startsWith('Low') ? green : yellow;
  console.log(`  ${cyan(`PR #${pr.order}`)} ${bold(pr.title)}`);
  console.log(`  ${dim('Layer:')} ${pr.layer}`);
  console.log(`  ${dim('Risk:')} ${riskColor(pr.risk)}`);
  console.log(`  ${dim('Files:')} ${pr.files}`);
  console.log('');
}

// Output: Strategy
console.log(bold('  ═══ Strategy ═══'));
console.log('');
for (const step of plan.strategy) {
  const weekLabel = step.week === 0 ? 'Now' : `Week ${step.week}`;
  console.log(`  ${cyan(weekLabel.padEnd(8))} ${bold(step.action)}`);
  console.log(`  ${' '.repeat(8)} ${dim(step.detail)}`);
}
console.log('');

// AI strategy
if (plan.aiStrategy) {
  console.log(bold('  ═══ AI Recommendation ═══'));
  console.log('');
  console.log('  ' + plan.aiStrategy.replace(/\n/g, '\n  '));
  console.log('');
}

// Warnings
if (plan.warnings && plan.warnings.length > 0) {
  console.log(bold('  ═══ Warnings ═══'));
  console.log('');
  for (const w of plan.warnings) {
    console.log(`  ${yellow('⚠')} ${w}`);
  }
  console.log('');
}

// Output files
if (outputDir) {
  const dir = resolve(outputDir);
  if (!existsSync(dir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(join(dir, 'ISSUE.md'), `# ${plan.issue.title}\n\n${plan.issue.body}`, 'utf-8');

  for (const pr of plan.prs) {
    const filename = `PR-${pr.order}-${pr.layer.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
    writeFileSync(join(dir, filename), `# ${pr.title}\n\n${pr.body}`, 'utf-8');
  }

  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf-8');

  console.log(green(`  ✓ Files exported to ${dir}/`));
  console.log(dim(`    ISSUE.md, ${plan.prs.length} PR descriptions, plan.json`));
  console.log('');
}

function printHelp() {
  console.log(`
  @rtl-first/contributor-agent — Generate RTL contribution plans

  Usage:
    rtl-contributor <audit.json> [options]

  First, generate an audit report:
    npx @rtl-first/audit ./project --format json > audit.json

  Then generate a contribution plan:
    rtl-contributor audit.json
    rtl-contributor audit.json --output ./contribution-plan
    rtl-contributor audit.json --api-key sk-... (or set ANTHROPIC_API_KEY)

  Options:
    -a, --audit <file>    Path to audit JSON report
    -u, --url <url>       Project GitHub URL (for links in output)
    -o, --output <dir>    Export issue + PR files to directory
    --api-key <key>       Anthropic API key (or use ANTHROPIC_API_KEY env)
    --format <type>       Output: terminal (default) or json
    -h, --help            Show this help
    --version             Show version

  Examples:
    npx @rtl-first/audit ./dify --format json > dify-audit.json
    npx @rtl-first/contributor-agent dify-audit.json
    npx @rtl-first/contributor-agent dify-audit.json -o ./plan
  `);
}
