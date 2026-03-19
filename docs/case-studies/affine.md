# Case study: AFFiNE

**Platform:** AFFiNE — open-source alternative to Notion + Miro  
**Stars:** 65,000+  
**Stack:** React, TypeScript, blocksuite (ProseMirror-based)  
**Timeline:** March 2026  
**Outcome:** 2 PRs merged, 1 PR closed by maintainer

This case study documents the full journey — including what failed and why. If you're planning to contribute RTL support to a complex project, this is what you need to know.

## The architecture

```
AFFiNE (monorepo)
├── packages/frontend/
│   ├── core/src/
│   │   ├── modules/i18n/entities/i18n.ts    ← language detection
│   │   └── components/context/index.tsx     ← app context + providers
│   ├── component/src/ui/date-picker/        ← date components
│   └── i18n/src/resources/
│       ├── en.json (2,313 keys)
│       └── ar.json (added by us)
└── blocksuite/affine/
    ├── rich-text/src/                       ← text editing core
    └── blocks/root/src/configs/toolbar.ts   ← toolbar config
```

The critical insight: AFFiNE uses **blocksuite**, which is built on ProseMirror. This means Layer 1 (text engine) is deep — it's not just CSS.

## What we did

### PR #14624 — RTL layout + Arabic translations (MERGED ✅)

**Scope:** Layer 2 + Layer 4

What this PR included:
- `applyDocumentLanguage()` function that sets `dir` and `lang` on `<html>`
- `DirectionProvider` from Radix UI wrapping the app context
- Complete `ar.json` with all 2,313 translation keys
- Direction-aware CSS for a few critical layout components

**Why it was accepted:** Small scope, clean execution, addressed a real gap (no Arabic support at all). The maintainer could review it in one sitting.

### PR #14663 — Date picker Arabic comma fix (MERGED ✅)

**Scope:** Layer 5 (hardcoded behavior)

The bug: AFFiNE's date picker parsed dates using `,` (Western comma). Arabic locale uses `،` (U+060C, Arabic comma). Selecting a date in Arabic mode silently failed.

The fix: Changed the regex from `/,/` to `/[,،]/` in both day-picker and month-picker components. Two files, four lines changed.

**Why it was accepted:** Obvious bug fix, tiny scope, clear before/after behavior. This is the ideal "trust-building" PR.

### PR #14664 — RTL codemod + documentation (CLOSED ❌)

**Scope:** Layer 3 + documentation

What this PR included:
- `scripts/rtl-codemod.js` — automated CSS physical → logical property conversion
- `docs/RTL-SUPPORT.md` — documentation of RTL architecture and remaining work

**Why it was closed:** The lead maintainer (darkskygit) responded:

> *"Simply tweaking styles cannot bring native RTL support to the editor; supporting RTL editing requires adjusting a large amount of editor logic. We believe providing only partial, visual RTL support does not align with our development intent."*

**What this means:** The maintainer looked at our CSS codemod and correctly identified that without Layer 1 (blocksuite BiDi support), the CSS changes create an incomplete experience. They preferred to wait for proper text engine RTL support rather than ship a half-measure.

**Was the maintainer right?** Yes. This is exactly the five-layer model in action. Layer 3 without Layer 1 is fragile. The text cursor, selection, and BiDi rendering in the editor would still be broken even with perfect CSS.

## Lessons learned

### Lesson 1 — Open an issue first

When we opened the initial RTL issue, darkskygit responded in 5 minutes with guidance that saved a week of misdirected work. Always ask before building.

### Lesson 2 — Fork contamination is real

```bash
# Wrong: branch from your fork (contains stale commits)
git checkout -b fix/rtl origin/canary  # ❌

# Right: branch from upstream directly
git fetch upstream
git checkout -b fix/rtl upstream/canary  # ✅
```

Branching from a contaminated fork adds noise to your PR diff. Maintainers see 50 unrelated commits and close immediately.

### Lesson 3 — Bulk changes need a codemod, not files

We learned this the hard way. Submitting 150 changed CSS files = instant rejection. Submitting a script that produces those changes = reviewable, verifiable, mergeable.

### Lesson 4 — HUSKY=0 saves time

Many monorepos run heavy lint checks on every commit. During development:
```bash
HUSKY=0 git commit -m "fix: description"
```

### Lesson 5 — Arabic comma is a real bug

`ar.json` uses `،` (U+060C). Any code that splits or parses on `,` will silently break. Always use `/[,،]/` when handling comma-separated values that might contain Arabic text.

### Lesson 6 — Radix UI defaults to LTR

`useDirection()` returns `"ltr"` by default, even if `dir="rtl"` is set on the document. You must wrap your app in `<DirectionProvider>` that reads from `document.documentElement.dir`.

### Lesson 7 — Don't modify blocksuite directly

AFFiNE uses an override pattern for blocksuite customization:
```typescript
ToolbarModuleExtension({
  id: BlockFlavourIdentifier('custom:affine:note'),
  config: { actions: [/* your overrides */] }
})
```

### Lesson 8 — Know when Layer 1 is the real blocker

The maintainer's rejection of PR #14664 was the most valuable feedback we received. It confirmed that RTL support in editor-heavy applications requires text engine work — not just CSS. This insight became the foundation of the five-layer model.

## What remains for AFFiNE

For AFFiNE to have full RTL support, someone needs to:

1. **Write a proposal** for InlineEditor BiDi support in blocksuite
2. **Implement cursor and selection** handling for RTL text
3. **Configure ProseMirror's BiDi** behavior at the blocksuite level
4. **Then** the CSS and UI changes become meaningful

This is months of work that requires coordination with the blocksuite team. It's not a weekend project — it's a roadmap item.

## Timeline

| Date | Action | Outcome |
|------|--------|---------|
| Week 1 | Opened RTL issue | Maintainer responded in 5 min |
| Week 1 | Submitted PR #14624 (direction + translations) | Merged ✅ |
| Week 2 | Submitted PR #14663 (date picker comma fix) | Merged ✅ |
| Week 2 | Submitted PR #14664 (codemod + docs) | Closed by maintainer ❌ |
| Week 2 | Documented lessons | Became the five-layer methodology |
