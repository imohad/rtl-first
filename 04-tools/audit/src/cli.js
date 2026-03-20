#!/usr/bin/env node

import { resolve } from 'path';
import { existsSync } from 'fs';
import { runAudit } from './index.js';
import { formatTerminal } from './formatters/terminal.js';
import { formatJSON } from './formatters/json.js';
import { formatMarkdown } from './formatters/markdown.js';

const args = process.argv.slice(2);

// Parse arguments
let targetPath = '.';
let format = 'terminal';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format' && args[i + 1]) {
    format = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (args[i] === '--version' || args[i] === '-v') {
    console.log('0.1.0');
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    targetPath = args[i];
  }
}

const resolvedPath = resolve(targetPath);

if (!existsSync(resolvedPath)) {
  console.error(`Error: path "${resolvedPath}" does not exist.`);
  process.exit(1);
}

// Run audit
const report = runAudit(resolvedPath);

// Format output
const formatters = {
  terminal: formatTerminal,
  json: formatJSON,
  markdown: formatMarkdown,
};

const formatter = formatters[format];
if (!formatter) {
  console.error(`Unknown format: "${format}". Use: terminal, json, markdown`);
  process.exit(1);
}

console.log(formatter(report));

function printHelp() {
  console.log(`
  @rtl-first/audit — Scan any project for RTL readiness

  Usage:
    rtl-audit [path] [options]

  Arguments:
    path                  Path to project directory (default: current dir)

  Options:
    --format <type>       Output format: terminal, json, markdown (default: terminal)
    -h, --help            Show this help
    -v, --version         Show version

  Examples:
    rtl-audit ./my-project
    rtl-audit ./my-project --format json
    rtl-audit ./my-project --format markdown > rtl-report.md
  `);
}
