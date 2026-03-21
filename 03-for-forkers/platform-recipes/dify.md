# Platform Recipe: Dify

> Arabize your Dify fork — step by step.

**Platform:** [Dify](https://github.com/langgenius/dify) — open-source LLM app development platform
**Stars:** 133k+
**Framework:** Next.js (App Router) monorepo
**i18n system:** i18next with JSON flat keys
**Text editor:** Workflow canvas + chat interface (no rich text editor)
**RTL difficulty:** Moderate
**Audit score:** 70/100 (C)

---

## Why Dify is a Good Candidate

Dify has no rich text editor — it's a workflow builder and chat interface. All standard React components. The i18n system is mature with i18next and supports 20+ languages. The main challenges are CSS layout (Tailwind-heavy) and adding Arabic as a new locale.

**Important context:** The Dify team closed Issue #21648 (requesting native RTL support) as "not planned." Issue #33783 is open. The team does not currently prioritize RTL — which is exactly why the fork approach exists.

---

## Prerequisites

```bash
node --version   # v18+
pnpm --version   # or npm/yarn
git clone https://github.com/YOUR-USERNAME/dify.git
cd dify/web
```

---

## Architecture Overview

```
dify/
├── web/                              ← Frontend (Next.js App Router)
│   ├── app/                          ← App Router pages
│   │   └── layout.tsx                ← Root layout (inject dir here)
│   ├── i18n/                         ← Translation files
│   │   ├── en-US/                    ← English (source)
│   │   │   ├── common.ts
│   │   │   ├── app.ts
│   │   │   └── ...
│   │   ├── zh-Hans/                  ← Chinese
│   │   └── language.ts              ← Language registry
│   ├── components/                   ← React components
│   ├── styles/                       ← Global CSS
│   └── tailwind.config.js
├── api/                              ← Python backend
└── docker/
```

Key facts:
- Frontend is in `web/` — a Next.js App Router project
- i18n uses i18next with flat JSON keys in `.ts` files
- Language registry is in `i18n/language.ts` — Arabic must be added here first
- Upstream uses Claude Code GitHub Actions to auto-translate — your fork won't have this
- Tailwind CSS throughout — directional classes need attention
- No complex text editor — workflow canvas is SVG/React based

---

## Step 1: Run the Full Arabization

```bash
cd dify/web
npx @rtl-first/arabize ./
```

This will:
1. Detect Next.js App Router
2. Inject `dir="rtl"` + `lang="ar"` on `<html>` in `app/layout.tsx`
3. Scaffold `i18n/ar/` locale files
4. Generate CSS patches in `.rtl-patches/`

---

## Step 2: Register Arabic in Language Config

This is Dify-specific — the arabize tool creates locale files but you need to manually register Arabic:

```typescript
// i18n/language.ts — add Arabic entry
export const languages = {
  // ... existing languages
  'ar': {
    name: 'العربية',
    example: 'مرحباً',
    supported: true,
  },
};
```

---

## Step 3: Convert CSS Physical Properties

```bash
npx @rtl-first/codemod --dry-run ./
# Review output, then:
npx @rtl-first/codemod ./
```

The codemod handles:
- CSS files (PostCSS AST): `margin-left` → `margin-inline-start`
- TSX files (jscodeshift): `{ marginLeft: '8px' }` → `{ marginInlineStart: '8px' }`
- Tailwind classes: `ml-4` → `ms-4`, `text-left` → `text-start`

---

## Step 4: Tailwind Manual Fixes

The codemod handles most Tailwind classes, but review these patterns manually:

| Physical | Logical |
|----------|---------|
| `ml-*` | `ms-*` |
| `mr-*` | `me-*` |
| `pl-*` | `ps-*` |
| `pr-*` | `pe-*` |
| `left-*` | `start-*` |
| `right-*` | `end-*` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `border-l-*` | `border-s-*` |
| `border-r-*` | `border-e-*` |

---

## Step 5: Dify-Specific UI Fixes

### 5a. Workflow Canvas
The workflow builder uses absolute positioning for nodes. Check:
- Node connection lines (SVG paths)
- Drag and drop positioning
- Sidebar panel positioning

### 5b. Chat Interface
- Message bubbles alignment (user vs assistant)
- Input area direction
- Send button position

### 5c. Sidebar Navigation
The main sidebar should flip to the right. Check for hardcoded `left-0` or `left-*` positioning.

---

## Step 6: Translate

```bash
npx @rtl-first/translation-kit --source i18n/en-US/common.json --target i18n/ar/common.json
```

Prioritize:
1. Navigation and common UI labels
2. App creation wizard
3. Workflow builder labels
4. Settings pages
5. Chat interface

---

## Step 7: Maintain After Upstream Rebase

```bash
git rebase upstream/main
bash .rtl-patches/apply-all.sh
```

If conflicts arise, re-run the audit:
```bash
npx @rtl-first/audit ./
```

---

## Known Issues

**Automated translation conflict:** Upstream uses Claude Code GitHub Actions to auto-translate. Your `ar/` folder is yours to maintain — upstream won't touch it, but their translation infrastructure won't help you either.

**Tailwind config:** Dify may have custom Tailwind plugins. Check `tailwind.config.js` for any directional utilities that override standard behavior.

---

## RTL Audit Summary

| Layer | Status | Action |
|-------|--------|--------|
| 1 — Text Engine | ✅ No editor | None needed |
| 2 — Direction | ❌ → ✅ | `direction-injector` |
| 3 — CSS Layout | ❌ | `codemod` + manual Tailwind |
| 4 — Translations | ⚠️ → ✅ | `locale-scaffolder` + manual translation |
| 5 — Hardcoded | ⚠️ | Manual review |

**Estimated effort:** 2-3 days for a working Arabic interface. 1-2 weeks for production-quality translation.

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — build for the world from day one.*
