# Case Study: AFFiNE — The Full RTL Journey

> 65,000 GitHub stars. 2 PRs merged. 1 PR rejected. The rejection taught more than the merges.

## About AFFiNE

AFFiNE is an open-source productivity platform — think Notion + Miro. Built with React, TypeScript, and blocksuite (a custom editor framework based on ProseMirror).

## The Approach

### Step 1: Reconnaissance

Before any code, we surveyed the codebase:

```bash
# Does i18n exist?
find . -name "*.json" | xargs grep -l "translation\|locale\|i18n"
# → Found i18n/src/resources/en.json (2,313 keys)

# Does Arabic exist?
find . -name "ar.json"
# → Nothing

# Any RTL code?
grep -r "rtl\|direction\|dir=" --include="*.ts" --include="*.tsx" | grep -v node_modules
# → Found applyDocumentLanguage() in i18n module — sets dir on <html>
```

**Finding:** i18n infrastructure exists. Arabic is missing. Direction logic exists but only for the languages already added.

### Step 2: Open an Issue

We opened an issue before writing any code. The maintainer (darkskygit) responded within minutes. This interaction shaped the entire contribution strategy.

### Step 3: PR #14624 — The Big One (Merged ✅)

**What it did:**
- Added complete `ar.json` with 2,313 translated keys (100% coverage)
- Modified `applyDocumentLanguage()` to set `dir="rtl"` for Arabic
- Added `DirectionProvider` from Radix UI in the root context

**Why it was accepted:**
- Clean, focused changes
- Complete translation (not half-done)
- Used existing i18n infrastructure — didn't invent new patterns
- Direction logic followed the pattern already in the codebase

### Step 4: PR #14663 — The Arabic Comma Fix (Merged ✅)

**The bug:** The date-picker split values on `,` (U+002C). Arabic uses `،` (U+060C). Selecting a date range in Arabic broke the component.

**The fix:**
```javascript
// Before
const parts = value.split(',');

// After
const parts = value.split(/[,،]/);
```

**Why it mattered:** This is the kind of bug that only surfaces with real RTL testing. It proves that RTL support isn't just about translation — it's about understanding how Arabic text behaves differently at every level.

### Step 5: PR #14664 — The Rejection (Closed ❌)

**What it proposed:**
- `RTL-SUPPORT.md` documentation
- `rtl-codemod.js` — a script to convert CSS physical properties to logical

**The maintainer's response:**

> "Simply tweaking styles cannot bring native RTL support to the editor; supporting RTL editing requires adjusting a large amount of editor logic. We believe providing only partial, visual RTL support does not align with our development intent."

**What this means:** blocksuite's InlineEditor handles cursor movement, text selection, and BiDi at a low level. CSS changes make the UI *look* right-to-left but the *editing experience* remains broken — the cursor moves wrong, selection is backwards, brackets auto-invert incorrectly.

## The Lessons

### Lesson 1: Always Ask "Where Is Text Generated?"

The most important question before any RTL contribution. In AFFiNE, text is generated in blocksuite's InlineEditor. Until that engine supports BiDi, CSS fixes are cosmetic.

### Lesson 2: Fork Contamination

```bash
# ❌ Branch from fork — carries old commits
git checkout -b fix/rtl origin/canary

# ✅ Branch from upstream — clean slate
git fetch upstream
git checkout -b fix/rtl upstream/canary
```

We lost hours debugging CI failures caused by stale commits from a polluted fork.

### Lesson 3: Bulk Changes = Codemod, Not Files

10+ files in a PR = rejection. The correct approach for CSS changes: submit the **script** and let maintainers run it themselves.

### Lesson 4: The Arabic Comma

Arabic punctuation is different from English. Any code that splits, joins, or parses text with commas needs to handle both `,` and `،`. This applies to every platform, not just AFFiNE.

```javascript
// Handle both English and Arabic commas
const parts = text.split(/[,،]/);
```

### Lesson 5: Radix UI Needs DirectionProvider

`useDirection()` from Radix UI returns `"ltr"` by default. You must wrap the app with `DirectionProvider` and read from `document.documentElement.dir`.

### Lesson 6: Open the Issue First

darkskygit responded to our issue in 5 minutes. That single response shaped weeks of work. Without it, we would have submitted a massive PR touching the editor — which would have been rejected for the same reason PR #14664 was rejected.

### Lesson 7: Rejection Is Data

PR #14664 being closed wasn't a failure. It confirmed our methodology: Layer 1 (text engine) is the deepest, most important layer. If it doesn't support BiDi, no amount of CSS or direction attributes will make the editing experience correct.

This rejection became the foundation of the Five Layers methodology.

## Impact

- **2,313 Arabic translation keys** now in AFFiNE
- **RTL layout** works for non-editor UI
- **Arabic comma bug** fixed (affects any Arabic user using date ranges)
- **The methodology** that came from this journey now powers rtl-first

## Timeline

| Week | Action | Result |
|------|--------|--------|
| 1 | Reconnaissance + issue | Maintainer responded, shaped strategy |
| 2 | PR #14624 (translation + direction) | Merged |
| 2 | PR #14663 (Arabic comma fix) | Merged |
| 3 | PR #14664 (codemod + docs) | Rejected — editor needs deeper work |
| 3 | Built rtl-first based on lessons | Framework born |

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
