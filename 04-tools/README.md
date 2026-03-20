# @rtl-first/direction-injector

> Automatically inject `dir="rtl"` and `lang` into any web project's root element.

Part of the [rtl-first](https://github.com/imohad/rtl-first) framework — build for the world from day one.

## What it does

One command. It detects your framework, finds the right file, and adds RTL direction attributes.

```bash
npx @rtl-first/direction-injector ./my-project
```

**Before:**
```html
<html>
```

**After:**
```html
<html dir="rtl" lang="ar">
```

It also detects UI libraries (Radix UI, MUI, Chakra, Ant Design) and tells you exactly how to configure their RTL providers.

## Supported Frameworks

| Framework | Root File | Detection |
|-----------|-----------|-----------|
| Next.js (App Router) | `app/layout.tsx` | ✅ |
| Next.js (Pages Router) | `pages/_document.tsx` | ✅ |
| Nuxt 3 | `nuxt.config.ts` | ✅ |
| Remix | `app/root.tsx` | ✅ |
| SvelteKit | `src/app.html` | ✅ |
| Angular | `src/index.html` | ✅ |
| Vite (React/Vue/Svelte) | `index.html` | ✅ |
| Create React App | `public/index.html` | ✅ |
| Static HTML | `index.html` | ✅ |

## UI Library Detection

| Library | What it tells you |
|---------|------------------|
| Radix UI | Add `<DirectionProvider>` wrapper |
| Material UI | Use `createTheme({ direction: "rtl" })` |
| Chakra UI | Set direction in `extendTheme` |
| Ant Design | Wrap with `<ConfigProvider direction="rtl">` |

## Usage

```bash
# Inject RTL (Arabic)
npx @rtl-first/direction-injector ./my-project

# Preview changes without modifying files
npx @rtl-first/direction-injector ./my-project --dry-run

# Use Hebrew instead of Arabic
npx @rtl-first/direction-injector ./my-project --lang he

# Only detect framework (no injection)
npx @rtl-first/direction-injector ./my-project --detect-only

# JSON output (for CI/scripts)
npx @rtl-first/direction-injector ./my-project --json
```

## Programmatic API

```javascript
const { run } = require('@rtl-first/direction-injector');

const result = run('./my-project', {
  lang: 'ar',
  dryRun: true
});

console.log(result.detection.framework); // 'next-app-router'
console.log(result.injection.changes);   // ['Added dir="rtl" to <html>']
```

## Features

- **Zero dependencies** — just Node.js
- **Idempotent** — safe to run multiple times
- **Dry run** — preview changes before applying
- **JSON output** — integrate with CI pipelines
- **Framework-aware** — modifies the correct file for each framework
- **UI library hints** — tells you about DirectionProvider needs

## Part of rtl-first

This is one of seven tools in the rtl-first framework:

| Tool | Purpose |
|------|---------|
| **@rtl-first/audit** | Scan any repo for RTL readiness |
| **@rtl-first/codemod** | Convert CSS physical → logical properties |
| **@rtl-first/translation-kit** | Find missing translation keys |
| **@rtl-first/contributor-agent** | Generate ready-made PRs |
| **@rtl-first/direction-injector** | ← You are here |
| **@rtl-first/locale-scaffolder** | Scaffold ar.json + i18n config |
| **@rtl-first/patch-generator** | Generate rebaseable RTL patches |

## License

MIT
