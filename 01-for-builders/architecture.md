# Architecture Guide — Build RTL-First from Day One

> You're starting a new project. You want it to work in Arabic, Hebrew, Persian, and Urdu from the first commit. Here's how.

## The Core Principle

**RTL is not a feature you add later. It's an architectural decision you make now.**

Adding RTL after the fact means rewriting CSS, refactoring layouts, and hunting down hundreds of hardcoded strings. Building RTL-first means every component you create already works in both directions — with zero extra effort.

## Step 1: Set Up Direction at the Root

Your app needs a single source of truth for text direction.

### Next.js (App Router)
```tsx
// app/layout.tsx
export default function RootLayout({ children, params }) {
  const dir = params.locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={params.locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### Nuxt 3
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: { dir: 'rtl', lang: 'ar' }
    }
  }
})
```

### Vite / CRA
```html
<!-- index.html -->
<html lang="ar" dir="rtl">
```

### The Pattern
Whatever framework you use, direction lives in **one place** — the root HTML element. Every component reads from it. No component sets its own direction.

## Step 2: Use CSS Logical Properties Everywhere

This is the single biggest architectural decision. **Never use physical properties.**

```css
/* ❌ Physical — breaks in RTL */
margin-left: 16px;
padding-right: 8px;
text-align: left;
border-left: 1px solid;
left: 0;

/* ✅ Logical — works in both directions */
margin-inline-start: 16px;
padding-inline-end: 8px;
text-align: start;
border-inline-start: 1px solid;
inset-inline-start: 0;
```

### The Full Mapping

| Physical | Logical |
|----------|---------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

### Tailwind CSS
If you're using Tailwind, use `ms-` and `me-` instead of `ml-` and `mr-`:

```html
<!-- ❌ Physical -->
<div class="ml-4 pr-2 text-left">

<!-- ✅ Logical -->
<div class="ms-4 pe-2 text-start">
```

### ESLint Rule
Add a lint rule to catch physical properties in your codebase. If your team uses `stylelint`:

```json
{
  "rules": {
    "property-disallowed-list": [
      "margin-left", "margin-right",
      "padding-left", "padding-right",
      "border-left", "border-right"
    ]
  }
}
```

## Step 3: Set Up i18n from the Start

Don't wait until you "need" translations. Set up the structure now.

### Recommended Structure
```
i18n/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── dashboard.json
└── ar/
    ├── common.json
    ├── auth.json
    └── dashboard.json
```

### Rules
1. **Every user-visible string goes through i18n.** No exceptions.
2. **Keys are English-readable.** `auth.login_button` not `str_0042`.
3. **No string concatenation.** `t('welcome', { name })` not `t('welcome') + name`.
4. **Plurals use the i18n system.** Arabic has 6 plural forms — English has 2.

### Arabic Plural Forms
Arabic has complex plural rules. Make sure your i18n library supports them:

```json
{
  "items_zero": "لا عناصر",
  "items_one": "عنصر واحد",
  "items_two": "عنصران",
  "items_few": "{{count}} عناصر",
  "items_many": "{{count}} عنصراً",
  "items_other": "{{count}} عنصر"
}
```

## Step 4: Handle UI Library Direction

If you use a UI component library, configure it for RTL:

### Radix UI
```tsx
import { DirectionProvider } from '@radix-ui/react-direction';

<DirectionProvider dir={dir}>
  <App />
</DirectionProvider>
```

### Material UI
```tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({ direction: 'rtl' });

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>
```

### Ant Design
```tsx
import { ConfigProvider } from 'antd';

<ConfigProvider direction="rtl">
  <App />
</ConfigProvider>
```

## Step 5: Icons and Visual Direction

Some icons need to flip in RTL. Others don't.

### Flip These
- Back/forward arrows
- Breadcrumb separators
- List indent markers
- Progress indicators
- Chevrons indicating navigation

### Don't Flip These
- Checkmarks
- Plus/minus
- Close (X)
- Media playback (play/pause)
- Clocks
- Search magnifying glass

### How to Flip
```css
[dir="rtl"] .icon-back {
  transform: scaleX(-1);
}
```

## Step 6: Numbers and Dates

Arabic has its own numeral system (٠١٢٣٤٥٦٧٨٩) but most Arabic users are comfortable with Western numerals (0123456789). Use the `Intl` API:

```javascript
// Format numbers according to locale
new Intl.NumberFormat('ar-SA').format(1234567)
// → "١٬٢٣٤٬٥٦٧" (Arabic-Indic numerals)

new Intl.NumberFormat('ar-SA', { numberingSystem: 'latn' }).format(1234567)
// → "1,234,567" (Western numerals, Arabic grouping)

// Format dates
new Intl.DateTimeFormat('ar-SA').format(new Date())
// → "٢٠ مارس ٢٠٢٦"
```

### The Comma Issue
Arabic uses `،` (U+060C) as a comma, not `,` (U+002C). If your code splits on commas, use:

```javascript
const parts = text.split(/[,،]/);
```

## Summary

Building RTL-first takes six decisions made once:

1. Direction at the root — one source of truth
2. CSS logical properties — never physical
3. i18n from day one — every string through the system
4. UI library configured — DirectionProvider/ThemeProvider
5. Icons categorized — flip navigation, keep universal
6. Numbers and dates — use Intl API

Make these decisions at the start, and RTL support costs you nothing extra for every feature you build after.

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
