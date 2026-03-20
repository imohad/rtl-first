# Platform Status

> Current RTL status of open-source platforms we've audited or contributed to.

## Platforms We've Tested

| Platform | Stars | Framework | Text Editor | RTL Difficulty |
|----------|-------|-----------|-------------|----------------|
| **Dify** | 133k+ | Next.js (App Router) | None | Straightforward |
| **AFFiNE** | 65k+ | React + blocksuite | ProseMirror-based | Hard (editor) |
| **Cal.com** | 34k+ | Next.js | None | Straightforward |
| **AppFlowy** | 60k+ | Flutter + Rust | Custom Rust editor | Hard (editor) |
| **NocoBase** | 15k+ | React + Ant Design | None | Straightforward |

## Detailed Status

### Dify (133k+ stars)
**Framework:** Next.js App Router (monorepo — frontend in `web/`)
**i18n:** i18next with automated translation via Claude Code GitHub Actions
**Arabic locale:** Exists (added by automated system)
**RTL status:** `dir="rtl"` missing. 527 CSS physical properties in 87 files.
**Our activity:**
- Issue #33783 opened — awaiting response
- Issue #21648 (by another contributor) — closed as "not planned"
- `npx @rtl-first/arabize ./` tested successfully — all 3 steps completed

**Note:** Dify's translation pipeline is automated. Arabic was added to `language.ts` after our research. The main gap is CSS logical properties and direction injection.

### AFFiNE (65k+ stars)
**Framework:** React + TypeScript + blocksuite
**i18n:** Custom system with JSON locale files (2,313 keys)
**Arabic locale:** Complete (100% — added by us)
**RTL status:** Direction works for UI. Editor (blocksuite) does not support BiDi.
**Our activity:**
- PR #14624 merged — Arabic locale + dir="rtl" + DirectionProvider
- PR #14663 merged — Arabic comma fix in date-picker
- PR #14664 closed — maintainer confirmed CSS-only RTL insufficient for editor

**Key lesson:** blocksuite's InlineEditor needs fundamental BiDi support. CSS changes create false impression of RTL support. See [case study](../05-case-studies/affine/README.md).

### Cal.com (34k+ stars)
**Framework:** Next.js
**i18n:** next-intl
**Arabic locale:** Not present
**RTL status:** Not started
**Difficulty:** Straightforward — no complex text editor. Standard React components.
**Opportunity:** Good candidate for a complete RTL contribution.

### AppFlowy (60k+ stars)
**Framework:** Flutter (mobile) + Rust editor
**RTL status:** Issue open since 2021
**Difficulty:** Hard — custom Rust-based editor needs BiDi support at engine level.
**Note:** rtl-first CLI tools target JavaScript frameworks. AppFlowy's Flutter/Rust stack needs different tooling.

### NocoBase (15k+ stars)
**Framework:** React + Ant Design
**i18n:** i18next
**Arabic locale:** Not present
**RTL status:** Issue open
**Difficulty:** Straightforward — Ant Design has built-in `ConfigProvider direction="rtl"`. No complex editor.
**Opportunity:** Good candidate. Ant Design's RTL support does most of the heavy lifting.

## How to Add a Platform

1. Run `npx @rtl-first/audit ./` on the platform
2. Run `npx @rtl-first/arabize ./ --dry-run` to see what would change
3. Document the results
4. Submit a PR to update this page

## Difficulty Guide

**Straightforward** — No rich text editor. Standard framework with i18n already set up. `npx @rtl-first/arabize ./` handles most of the work.

**Medium** — Has some custom components that need manual RTL attention. May need override CSS for specific layouts.

**Hard (editor)** — Contains a rich text editor (ProseMirror, Slate, CodeMirror, custom) that doesn't support BiDi. UI can be arabized but the editing experience will remain LTR until the editor engine is updated.

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
