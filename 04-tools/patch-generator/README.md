# @rtl-first/patch-generator

> Generate rebaseable RTL patches organized by layer. Apply after every upstream rebase.

Part of the [rtl-first](https://github.com/imohad/rtl-first) framework — build for the world from day one.

## What it does

Scans your fork, generates shell scripts for each RTL layer, and gives you an `apply-all.sh` you can run after every `git rebase`.

```bash
npx @rtl-first/patch-generator ./my-fork
```

```
  RTL Patch Generator
  ═══════════════════════

  Generated patches:
  📁 .rtl-patches/
  ├── ✓ 01-direction.sh     (1 files)
  │   Add dir="rtl" and lang attribute to root HTML element
  ├── ✓ 02-css-logical.sh   (147 files)
  │   Convert CSS physical → logical properties
  ├── ✓ 03-locale.sh        (1 files)
  │   Set up Arabic locale files
  ├── ✓ apply-all.sh
  │   Apply all patches in order
  └── ✓ health-check.sh
      Check fork health metrics

  After upstream rebase:
  git rebase upstream/main && bash .rtl-patches/apply-all.sh
```

## The Problem it Solves

Every time you rebase your fork from upstream, RTL changes can break. This tool generates portable shell scripts that you can re-apply after each rebase, keeping your RTL support intact.

## Usage

```bash
# Generate patches (scans project automatically)
npx @rtl-first/patch-generator ./my-fork

# Generate only CSS patches
npx @rtl-first/patch-generator ./my-fork --layers 3

# Use rtl-audit JSON for more accurate scan
npx @rtl-first/audit ./my-fork --json > audit.json
npx @rtl-first/patch-generator ./my-fork --audit audit.json

# Preview without creating files
npx @rtl-first/patch-generator ./my-fork --dry-run

# JSON output
npx @rtl-first/patch-generator ./my-fork --json
```

## Generated Scripts

| Script | Layer | What it does |
|--------|-------|-------------|
| `01-direction.sh` | 2 | Injects `dir="rtl"` and `lang="ar"` into root HTML element |
| `02-css-logical.sh` | 3 | Converts physical CSS properties to logical (margin-left → margin-inline-start) |
| `03-locale.sh` | 4 | Copies source locale to create ar.json |
| `apply-all.sh` | — | Runs all patches in order, supports `--layer N` filter |
| `health-check.sh` | — | Shows commits behind upstream, override file count, last rebase |

## Rebase Workflow

```bash
# 1. Rebase from upstream
git fetch upstream
git rebase upstream/main

# 2. Re-apply RTL patches
bash .rtl-patches/apply-all.sh

# 3. Check health
bash .rtl-patches/health-check.sh

# 4. If patches fail, re-generate
npx @rtl-first/patch-generator ./
```

## Programmatic API

```javascript
const { run } = require('@rtl-first/patch-generator');

const result = run('./my-fork', {
  layers: [2, 3],
  lang: 'ar',
  dryRun: true
});

console.log(result.patches); // Array of generated patches
```

## Features

- **Zero dependencies** — just Node.js + bash
- **Built-in scanner** — works without rtl-audit (or uses its JSON for better accuracy)
- **Layer isolation** — separate script per layer, apply individually with `--layer`
- **Idempotent** — safe to run multiple times
- **Health check** — monitors fork drift from upstream
- **README included** — generated `.rtl-patches/README.md` documents usage

## License

MIT
