# @rtl-first/arabize

> **Arabize any open-source platform with one command.**

```bash
npx @rtl-first/arabize ./my-fork
```

That's it. One command does everything:

1. Detects your framework (Next.js, Nuxt, Remix, Vite, Angular...)
2. Injects `dir="rtl"` and `lang="ar"` on the root HTML element
3. Copies source locale → `ar.json` and updates your i18n config
4. Generates a `LocaleSwitcher` component (React or Vue)
5. Creates rebaseable CSS patches in `.rtl-patches/`

Part of the [rtl-first](https://github.com/imohad/rtl-first) framework.

## Example Output

```
  ╔══════════════════════════════════════╗
  ║   rtl-first / arabize                ║
  ║   Arabize any platform — one command  ║
  ╚══════════════════════════════════════╝

  Framework:   Next.js (App Router)
  Target:      ar
  CSS issues:  147 physical properties in 23 files
  Locale:      Found nested-dirs in i18n/

  ──────────────────────────────────────

  ✓  Direction Injection (Layer 2)
     → Added dir="rtl" to <html> element
     → Added lang="ar" to <html> element

  ✓  Locale Scaffolding (Layer 4)
     → Created i18n/ar/common.json (2,313 keys)
     → Updated i18n/language.ts — added ar locale
     → Generated LocaleSwitcher.tsx

  ✓  Patch Generation (Layer 3)
     → 02-css-logical.sh: Convert CSS physical → logical (23 files)

  ──────────────────────────────────────

  ✓ All 3 steps completed in 0.8s

  Next steps:
  1. Translate the locale files in i18n/
  2. Apply CSS patches: bash .rtl-patches/apply-all.sh --layer 3
  3. Test your app in Arabic
  4. Run npx @rtl-first/audit ./ for detailed report
```

## Usage

```bash
# Arabize (default: Arabic)
npx @rtl-first/arabize ./my-fork

# Preview changes first
npx @rtl-first/arabize ./my-fork --dry-run

# Hebrew instead of Arabic
npx @rtl-first/arabize ./my-fork --lang he

# Mark untranslated strings with [AR] prefix
npx @rtl-first/arabize ./my-fork --stub prefix

# Skip specific steps
npx @rtl-first/arabize ./my-fork --skip-css
npx @rtl-first/arabize ./my-fork --skip-locale
npx @rtl-first/arabize ./my-fork --skip-direction

# JSON output (for CI)
npx @rtl-first/arabize ./my-fork --json
```

## After Upstream Rebase

```bash
git rebase upstream/main
bash .rtl-patches/apply-all.sh
```

## What Gets Created

```
your-fork/
├── src/app/layout.tsx          ← modified: dir="rtl" lang="ar"
├── i18n/ar/                    ← new: Arabic locale files
├── rtl-overrides/
│   └── components/
│       └── LocaleSwitcher.tsx  ← new: language switcher component
└── .rtl-patches/
    ├── 02-css-logical.sh       ← CSS codemod script
    ├── apply-all.sh            ← run after every rebase
    ├── health-check.sh         ← fork health metrics
    └── README.md               ← usage docs
```

## Part of rtl-first

This is the master script that orchestrates three tools:

| Tool | What it does |
|------|-------------|
| [@rtl-first/direction-injector](https://github.com/imohad/rtl-first) | Injects dir="rtl" + lang |
| [@rtl-first/locale-scaffolder](https://github.com/imohad/rtl-first) | Scaffolds ar.json + config |
| [@rtl-first/patch-generator](https://github.com/imohad/rtl-first) | Generates rebaseable patches |

The full rtl-first framework includes 8 packages for builders, contributors, and forkers.

## License

MIT
