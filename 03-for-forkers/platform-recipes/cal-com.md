# Platform Recipe: Cal.com

> Arabize your Cal.com fork — step by step.

**Platform:** [Cal.com](https://github.com/calcom/cal.com) — open-source scheduling infrastructure
**Stars:** 34k+
**Framework:** Next.js (monorepo with Turborepo)
**i18n system:** next-i18next (Pages Router) — migration to App Router in progress
**Text editor:** None (scheduling UI — calendars, forms, booking pages)
**RTL difficulty:** Straightforward
**Audit score:** 70/100 (C)

---

## Why Cal.com is a Great Candidate

Cal.com has no rich text editor — it's a scheduling platform with calendars, booking forms, and settings pages. All standard React components. The i18n system is already mature with next-i18next and supports 20+ languages. Arabic is not currently present, but the infrastructure to add it is ready.

The UI is component-based (mostly Radix UI primitives) and uses Tailwind CSS extensively. No deep engine work needed — this is a CSS + translations job.

---

## Prerequisites

```bash
node --version   # v18+
pnpm --version   # 8+ (Cal.com uses pnpm workspaces)
git clone https://github.com/YOUR-USERNAME/cal.com.git
cd cal.com
```

---

## Architecture Overview

```
cal.com/
├── apps/
│   └── web/                      ← Main Next.js app
│       ├── pages/                ← Pages Router (being migrated to App Router)
│       ├── public/
│       │   └── static/
│       │       └── locales/      ← Translation files
│       │           ├── en/
│       │           │   └── common.json
│       │           ├── fr/
│       │           └── ...
│       └── next-i18next.config.js
├── packages/
│   ├── ui/                       ← Shared UI components (Radix-based)
│   ├── lib/                      ← Shared utilities
│   └── ...
└── turbo.json
```

Key facts:
- Monorepo with Turborepo — frontend is in `apps/web/`
- i18n uses next-i18next with JSON files in `public/static/locales/{lang}/common.json`
- Single namespace: `common` (one big file per language)
- UI components are in `packages/ui/` — shared across apps
- Tailwind CSS throughout
- Radix UI primitives — needs `DirectionProvider` for RTL

---

## Step 1: Run the Full Arabization

```bash
cd apps/web
npx @rtl-first/arabize ./
```

---

## Step 2: Add Radix UI DirectionProvider

Cal.com uses Radix UI heavily. Radix components need `DirectionProvider` to render correctly in RTL:

```tsx
// In your root layout or _app.tsx
import { DirectionProvider } from '@radix-ui/react-direction';

function App({ children }) {
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <DirectionProvider dir={direction}>
      {children}
    </DirectionProvider>
  );
}
```

---

## Step 3: Convert CSS Physical Properties

```bash
npx @rtl-first/codemod --dry-run ./
npx @rtl-first/codemod ./
```

Also scan the shared UI package:
```bash
cd ../../packages/ui
npx @rtl-first/codemod --dry-run ./
```

---

## Step 4: Dify-Specific UI Fixes

### 4a. Calendar Component
- Day headers should flow right-to-left (Saturday → Sunday in Arabic)
- Time slots alignment
- Navigation arrows (previous/next week) should flip

### 4b. Booking Form
The booking page is public-facing:
- Form labels should align right
- Time zone selector
- Date picker direction

### 4c. Sidebar Navigation
Check if it uses `left-0` or Tailwind `left-*` positioning.

### 4d. Email Templates
Cal.com sends booking confirmation emails. These need separate RTL handling — HTML emails don't inherit `dir` from the app. Check `packages/emails/` for templates that need `dir="rtl"` added.

---

## Step 5: Translate

Cal.com uses a single `common.json` with all translation keys. Prioritize:
1. Booking page labels and buttons
2. Date/time formatting
3. Dashboard navigation
4. Settings pages
5. Email templates

---

## Step 6: Test

```bash
pnpm install
pnpm dev
```

Checklist:
- [ ] Booking page renders correctly in RTL
- [ ] Calendar days flow right-to-left
- [ ] Navigation sidebar on the right
- [ ] Radix UI dropdowns/dialogs open correctly
- [ ] Forms align properly
- [ ] Email templates display RTL
- [ ] Date picker works with Arabic locale
- [ ] Mobile responsive views

---

## Known Issues

**Pages Router migration:** Cal.com is migrating from Pages Router to App Router. The i18n setup may change. If you fork after the migration, locale setup steps will differ.

**Radix UI:** Most Radix components respect `DirectionProvider` automatically, but some (like `Tooltip` positioning) may need manual adjustment.

---

## RTL Audit Summary

| Layer | Status | Action |
|-------|--------|--------|
| 1 — Text Engine | ✅ No editor | None needed |
| 2 — Direction | ❌ → ✅ | `direction-injector` + Radix DirectionProvider |
| 3 — CSS Layout | ❌ | `codemod` + manual Tailwind |
| 4 — Translations | ⚠️ → ✅ | Copy common.json + register locale |
| 5 — Hardcoded | ⚠️ | Manual review |

**Estimated effort:** 2-3 days for a working Arabic interface. 1 week for production-quality with translated booking pages.

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — build for the world from day one.*
