# The Five Layers of RTL Readiness

> The methodology for understanding and fixing RTL in any web application.

## The First Question

Before you write any code, ask:

> **"Where is text generated in this system?"**

If the answer is a rich text editor (ProseMirror, Slate, CodeMirror, TipTap), you need to understand its BiDi support before anything else. If it doesn't support BiDi, CSS fixes won't save you.

If the answer is "standard React/Vue components," you can start from the outside layers and work inward.

## The Five Layers

```
Layer 1 — Text Engine       ← Does the editor understand BiDi? (deepest, hardest)
Layer 2 — Direction Logic   ← dir="rtl" + DirectionProvider
Layer 3 — CSS Layout        ← CSS logical properties
Layer 4 — Translations      ← ar.json locale files
Layer 5 — Hardcoded Text    ← English strings buried in JSX/TSX
```

Always work from the **outside in**: start with Layer 5 (easiest, smallest PRs) and progress toward Layer 1 (hardest, needs maintainer coordination).

## Layer 1 — Text Engine

**What it is:** The core text editing library — ProseMirror, Slate, CodeMirror, TipTap, Quill, or custom.

**What to check:**
- Does the editor render RTL text correctly?
- Does the cursor move in the right direction?
- Does text selection work properly with mixed LTR/RTL content?
- Do keyboard shortcuts (Home/End) behave correctly?

**The reality:** Most text engines have partial or no BiDi support. Fixing this requires deep knowledge of the editor internals and coordination with the core maintainers. This is months of work, not a weekend PR.

**Example — AFFiNE:** The maintainer closed our CSS-focused PR because blocksuite's InlineEditor doesn't support BiDi at the fundamental level. CSS changes would create a false impression of RTL support.

**Decision point:**
- If the platform has no rich text editor → skip this layer
- If the editor supports BiDi → proceed to Layer 2
- If the editor doesn't support BiDi → document it, open an issue, but focus your PRs on other layers

## Layer 2 — Direction Logic

**What it is:** The `dir="rtl"` attribute on the document root, plus any framework-specific direction providers.

**What to check:**
```bash
# Is dir set anywhere?
grep -rn 'dir=' --include="*.tsx" --include="*.jsx" --include="*.html" | grep -v node_modules
```

**What to fix:**
- Add `dir="rtl"` on `<html>` element (or make it dynamic based on locale)
- Add `DirectionProvider` if the project uses Radix UI
- Add `ThemeProvider` with `direction: "rtl"` if it uses MUI
- Add `ConfigProvider direction="rtl"` if it uses Ant Design

**PR size:** Small. 1-3 files. High acceptance rate.

**Tool:** `npx @rtl-first/direction-injector ./ --dry-run`

## Layer 3 — CSS Layout

**What it is:** Physical CSS properties that assume left-to-right.

**What to check:**
```bash
# Count physical properties
grep -rn 'margin-left\|margin-right\|padding-left\|padding-right' --include="*.css" --include="*.scss" --include="*.tsx" | grep -v node_modules | wc -l
```

**What to fix:** Convert physical properties to logical:
- `margin-left` → `margin-inline-start`
- `padding-right` → `padding-inline-end`
- `text-align: left` → `text-align: start`
- `left: 0` → `inset-inline-start: 0`

**PR strategy:** Never submit 100+ file changes as a direct PR. Instead, submit a **codemod script** that maintainers can run themselves:

```
PR title: "docs: add RTL codemod script"
Contents:
  scripts/rtl-codemod.js    ← the script
  docs/RTL-SUPPORT.md       ← documentation
```

**Tool:** `npx @rtl-first/codemod ./src --dry-run`

## Layer 4 — Translations

**What it is:** Missing or incomplete Arabic locale files.

**What to check:**
```bash
# Does ar.json exist?
find . -name "ar.json" -not -path "*/node_modules/*"

# How many keys are in English vs Arabic?
node -e "console.log(Object.keys(require('./i18n/en.json')).length)"
node -e "console.log(Object.keys(require('./i18n/ar.json')).length)"
```

**What to fix:**
- Create `ar.json` if it doesn't exist
- Fill in missing translation keys
- Register Arabic in the i18n config
- Handle Arabic plural forms (6 forms)

**PR size:** Can be large (thousands of keys) but usually accepted easily because it doesn't change logic.

**Tool:** `npx @rtl-first/translation-kit --source en.json --target ar.json`

## Layer 5 — Hardcoded Text

**What it is:** English strings written directly in JSX instead of using i18n.

**What to check:**
```bash
# Find hardcoded English in JSX
grep -rn '>[A-Z][a-z]' --include="*.tsx" --include="*.jsx" | grep -v node_modules | grep -v '.test.' | grep -v '.spec.'
```

**What to fix:**
```tsx
// Before
<button>Download App</button>

// After
<button>{t('actions.download')}</button>
```

**PR strategy:** Small, focused PRs. 5-10 strings per PR. Each PR adds the strings to both `en.json` and `ar.json`.

## Effort Matrix

| Layer | Size | Complexity | Acceptance Rate |
|-------|------|-----------|-----------------|
| 5 — Hardcoded | Small | Low | Easy |
| 4 — Translations | Large | Low | Easy |
| 3 — CSS | Large | Low | Easy with codemod |
| 2 — Direction | Small | Medium | Medium |
| 1 — Text Engine | Massive | Very High | Needs maintainer buy-in |

## Recommended Order for Contributors

```
Week 1:  Small bug fix (build trust, not RTL-related)
Week 2:  Layer 2 — direction + DirectionProvider (small PR)
Week 3:  Layer 4 — ar.json translation file (large but safe)
Week 4:  Layer 5 — hardcoded strings (multiple small PRs)
Week 5+: Layer 3 — CSS codemod (submit as script, not changes)
```

Layer 1? Only if you have deep editor experience and the maintainer explicitly supports it.

## Audit Tool

Run the full audit to see all layers at once:

```bash
npx @rtl-first/audit ./my-project
```

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
