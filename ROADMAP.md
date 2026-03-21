# Technical Roadmap

> From CLI toolkit to RTL engineering platform.

## Current State — v0.2.0 (March 2026)

8 npm packages published. The codemod now has a multi-engine architecture:

- **PostCSS AST** for CSS files — safe shorthand decomposition, zero false positives
- **jscodeshift AST** for JS/TS files — CSS-in-JS style objects, member expressions
- **Tailwind mapper** — className attributes, template literals, cn()/clsx() calls
- **Regex fallback** — always available, zero dependencies

All engines are optional peer dependencies. Install `postcss` and/or `jscodeshift` for AST mode, or use `--quick` for regex-only.

**Tested on real platforms:** Dify (133k★) — 859 files, 0 new TS errors. NocoBase (15k★) — 67 files, 0 new TS errors.

---

## ✅ Completed — AST Engines

### PostCSS CSS Engine
- ✅ PostCSS as optional peer dependency
- ✅ CSS physical→logical transforms via AST traversal
- ✅ Shorthand decomposition (margin, padding, border-radius, inset)
- ✅ Preserves source formatting and comments
- ✅ Regex fallback when PostCSS not installed

### jscodeshift JS/TS Engine
- ✅ jscodeshift as optional peer dependency
- ✅ Style object properties (marginLeft → marginInlineStart)
- ✅ JSX inline styles
- ✅ Member expressions (styles.marginLeft)
- ✅ textAlign value conversion with warnings
- ✅ Conditional expressions flagged for manual review

### Tailwind Class Mapping
- ✅ Complete prefix mapping (ml→ms, pr→pe, left→start, etc.)
- ✅ AST-aware className detection in JSX (won't touch other strings)
- ✅ Template literal support
- ✅ cn()/clsx()/classnames() call support
- ✅ LogicalExpression support (isActive && 'border-r-2')
- ✅ Responsive prefixes, negative values, important prefix preserved
- ✅ Regex fallback for HTML/Vue/Svelte templates

### Safety Fix: left/right cssOnly
- ✅ Regex left/right rules restricted to CSS context only
- ✅ Prevents false positives in JS code (const left = 10)
- ✅ AST engines handle this safely by design

---

## Next — v0.3.0: Real Migration Validation

**Goal:** Prove the codemod produces buildable code, not just zero-error transforms.

**Plan:**
- [ ] Pick one platform (Cal.com or NocoBase — no complex editor)
- [ ] Run codemod on actual fork (not dry-run)
- [ ] Build the project (`npm run build` passes)
- [ ] Visual smoke test (UI renders correctly)
- [ ] Document as case study with before/after screenshots

**Why this matters:** CTO feedback was clear — "Show me successful migration, not safe parsing." A dry-run proves the tool doesn't crash. A successful build proves the output is correct.

---

## v0.4.0 — CI Integration

**Goal:** RTL quality gates in CI pipelines.

**Plan:**
- [ ] `rtl-codemod --check` mode (exit 1 if physical properties found)
- [ ] GitHub Action: `rtl-first/check-action`
- [ ] Pre-commit hook integration
- [ ] JSON output for CI parsing
- [ ] Threshold configuration (warn vs fail)

---

## v0.5.0 — Vue/Svelte/Angular AST

**Goal:** Full AST support for non-React frameworks.

**Plan:**
- [ ] Vue SFC parser for `<template>` and `<style>` blocks
- [ ] Svelte component parser
- [ ] Angular template parser
- [ ] styled-components/emotion template literal transforms

---

## v1.0.0 — Production Release

**Goal:** Stable API, comprehensive documentation, community adoption.

**Requirements before 1.0:**
- [ ] At least 3 real-world migrations documented (build + screenshots)
- [ ] All framework AST parsers working
- [ ] CI integration tested in production
- [ ] Plugin architecture for custom rules
- [ ] Versioned transformation rules with upgrade path

---

## Design Principles

**1. Optional everything.** The codemod works with zero dependencies (regex mode). AST engines are peer dependencies — install what you need.

**2. Regex fallback is permanent.** AST is better but regex is faster and lighter. Both modes coexist — the user chooses based on their needs.

**3. Safe by default.** If a transformation is uncertain, flag it for manual review instead of applying it. False negatives are acceptable; false positives are not.

**4. Incremental adoption.** Each version adds capability without breaking existing workflows. A user on v0.1.x can upgrade to v0.2.0 without changing their commands.

---

*This roadmap is a living document. Last updated: March 2026.*
