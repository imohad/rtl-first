# Quick Start — Arabize Any Platform in 5 Minutes

> You have a fork of an open-source platform. You want it in Arabic. Here's how.

## Before You Start

```bash
# Make sure you have Node.js 16+
node --version

# Clone your fork (if you haven't)
git clone https://github.com/your-name/platform-fork.git
cd platform-fork
```

## Step 1: One Command

```bash
npx @rtl-first/arabize ./
```

That's it. The tool will:
- Detect your framework automatically
- Add `dir="rtl"` and `lang="ar"` to the root element
- Copy English locale files → Arabic
- Update your i18n config
- Generate a LocaleSwitcher component
- Create CSS patches in `.rtl-patches/`

## Step 2: Apply CSS Patches

The arabize command creates patches but doesn't auto-apply CSS changes (because they touch many files). Apply them:

```bash
bash .rtl-patches/apply-all.sh
```

This converts `margin-left` → `margin-inline-start`, `padding-right` → `padding-inline-end`, and so on across your codebase.

## Step 3: Translate

Your `ar.json` files are created with English values as placeholders. Now translate them:

```bash
# See what was created
find . -name "ar.json" -not -path "*/node_modules/*"

# Option: Mark untranslated strings for easy spotting
npx @rtl-first/locale-scaffolder ./ --stub prefix --force
# Values become "[AR] Save", "[AR] Cancel" — easy to find in the UI
```

## Step 4: Test

Start your development server and switch to Arabic. You should see:
- Layout flipped (sidebar on the right, content flows right-to-left)
- Navigation reversed
- Text aligned to the right
- Your LocaleSwitcher component works (check `rtl-overrides/components/`)

## Step 5: Commit Smart

Follow the [Fork RTL Methodology](fork-rtl-methodology.md) for long-term maintainability:

```bash
# Create RTL branches
git checkout -b rtl/direction
git add src/app/layout.tsx  # or whatever root file was modified
git commit -m "rtl: add dir=rtl and lang=ar to root"

git checkout main
git checkout -b rtl/translations
git add i18n/ar/ rtl-overrides/
git commit -m "rtl: scaffold Arabic locale and LocaleSwitcher"

git checkout main
git checkout -b rtl/css
git add .  # CSS changes from the codemod
git commit -m "rtl: convert CSS physical to logical properties"
```

## After Upstream Updates

When the original platform releases updates:

```bash
git checkout main
git pull upstream main

# Re-apply your RTL patches
bash .rtl-patches/apply-all.sh

# If patches fail, regenerate
npx @rtl-first/patch-generator ./
bash .rtl-patches/apply-all.sh
```

## Troubleshooting

**"No source locale files found"**
Your project doesn't have i18n set up. You need to add it first. Check if the platform uses i18next, next-intl, vue-i18n, or another library.

**"Framework not detected"**
Run with `--detect-only` to see what was found:
```bash
npx @rtl-first/direction-injector ./ --detect-only
```

**CSS didn't change**
The arabize command generates patch scripts but doesn't apply CSS changes automatically. Run:
```bash
bash .rtl-patches/apply-all.sh --layer 3
```

**Some components still look LTR**
Run the audit to find remaining issues:
```bash
npx @rtl-first/audit ./
```

Common causes: hardcoded CSS in component files, third-party components without RTL support, or icons that need `transform: scaleX(-1)`.

## What's Next

- Read the full [Fork RTL Methodology](fork-rtl-methodology.md) for maintaining your fork long-term
- Check [platform recipes](platform-recipes/) for platform-specific guides
- Run `npx @rtl-first/audit ./` for a detailed RTL readiness report

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — build for the world from day one.*
