# @rtl-first/locale-scaffolder

> Scaffold a new locale and wire it into any i18n system with one command.

Part of the [rtl-first](https://github.com/imohad/rtl-first) framework — build for the world from day one.

## What it does

One command. It detects your i18n library, copies source locale files, updates your config, and generates a LocaleSwitcher component.

```bash
npx @rtl-first/locale-scaffolder ./my-project
```

```
  Locale Scaffolder Report
  ═══════════════════════════

  i18n system:    i18next / react-i18next
  Source locale:  en-US (2,313 keys across 12 files)
  Structure:      nested-dirs

  Created:
  ✓  Created directory: i18n/ar/
  ✓  Created i18n/ar/common.json (847 keys)
  ✓  Created i18n/ar/app.json (423 keys)
  ✓  Updated i18n/language.ts — added ar locale entry
  ✓  Generated rtl-overrides/components/LocaleSwitcher.tsx

  Next steps:
  1. Translate 2,313 keys in the new locale files
  2. Add <LocaleSwitcher /> to your header/navigation
  3. Run: npx @rtl-first/direction-injector ./ to add dir="rtl"
  4. Run: npx @rtl-first/audit ./ to check all RTL layers
```

## Supported i18n Libraries

| Library | Structure | Config Update |
|---------|-----------|--------------|
| i18next / react-i18next | nested-dirs, flat | ✅ |
| next-intl | flat | ✅ |
| vue-i18n | flat, nested-dirs | ✅ |
| react-intl / FormatJS | flat | ✅ |
| Angular i18n | flat | ✅ |
| svelte-i18n | flat | ✅ |

## What it generates

1. **Locale files** — copies source locale (en.json) to target (ar.json) preserving structure
2. **Config update** — registers the new locale in your i18n config (language.ts, i18n.ts, etc.)
3. **LocaleSwitcher** — a ready-to-use component (React `.tsx` or Vue `.vue`) that switches locale and direction

## Usage

```bash
# Scaffold Arabic locale (default)
npx @rtl-first/locale-scaffolder ./my-project

# Preview changes without modifying files
npx @rtl-first/locale-scaffolder ./my-project --dry-run

# Hebrew instead of Arabic
npx @rtl-first/locale-scaffolder ./my-project --lang he

# Prefix values with [AR] for easy spotting during development
npx @rtl-first/locale-scaffolder ./my-project --stub prefix

# Overwrite existing locale
npx @rtl-first/locale-scaffolder ./my-project --force

# JSON output
npx @rtl-first/locale-scaffolder ./my-project --json
```

## Stub Modes

Control how English values appear in the new locale files:

| Mode | Example | Use case |
|------|---------|----------|
| `copy` (default) | `"Save"` | App works immediately, translate gradually |
| `prefix` | `"[AR] Save"` | Easy to spot untranslated strings in UI |
| `empty` | `""` | Forces translation before use |

## Programmatic API

```javascript
const { run } = require('@rtl-first/locale-scaffolder');

const result = run('./my-project', {
  lang: 'ar',
  dryRun: true,
  stubMode: 'prefix'
});

console.log(result.detection.localeInfo.sourceFiles);
console.log(result.scaffold.changes);
```

## Features

- **Zero dependencies** — just Node.js
- **Auto-detects** i18n library and locale structure
- **Updates config** — registers locale in language.ts / i18n config
- **Generates LocaleSwitcher** — React or Vue component with RTL direction toggle
- **Idempotent** — won't overwrite existing locale (use --force)
- **Three stub modes** — copy, prefix, or empty
- **Files go to `rtl-overrides/`** — follows fork-rtl-methodology isolation pattern

## License

MIT
