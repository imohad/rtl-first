# Fork RTL Methodology — Arabize a Platform While Staying Rebaseable

> **Core principle:** Every RTL modification should be isolated, identifiable, and easy to re-apply after any upstream rebase.

## Why This Methodology?

A fork without a methodology ends in one of three ways:

1. **Dead fork** — after 3 months the gap with upstream is too large to rebase
2. **Fragile fork** — you can rebase but spend a week resolving conflicts every time
3. **Smart fork** — you rebase smoothly because your changes are isolated and organized ← this is the goal

## The Golden Rule: Three Layers of Isolation

```
┌─────────────────────────────────────────────────┐
│  Layer A — Separate files (zero conflicts)       │
│  ar.json, rtl.css, RTLProvider.tsx               │
├─────────────────────────────────────────────────┤
│  Layer B — Wrapper changes (rare conflicts)      │
│  DirectionProvider in root, locale config        │
├─────────────────────────────────────────────────┤
│  Layer C — Inline changes (expected conflicts)   │
│  CSS physical→logical, hardcoded strings         │
└─────────────────────────────────────────────────┘
```

**Rule:** Work from A to C. The more you stay in Layer A, the easier the rebase.

## Phase 1: Setup Before Any Code

### 1.1 — Branch Strategy

```bash
# Required structure
main              ← upstream only — never touch it directly
rtl/base          ← all RTL changes start from here
rtl/direction     ← Layer 2: dir + DirectionProvider
rtl/translations  ← Layer 4: ar.json
rtl/css           ← Layer 3: CSS logical properties
rtl/release       ← merge all — this is what you deploy

# Setup
git remote add upstream https://github.com/original/platform.git
git checkout -b rtl/base upstream/main
```

**Why separate branches?**
- When upstream updates CSS → conflicts only in `rtl/css`
- When upstream updates i18n → conflicts only in `rtl/translations`
- Other branches stay clean
- You can rebase each branch independently

### 1.2 — Create a Dedicated RTL Directory

```bash
mkdir -p rtl-overrides/{styles,components,config,patches}
```

```
rtl-overrides/
├── styles/
│   └── rtl.css              ← all CSS overrides here (don't modify platform files)
├── components/
│   ├── RTLProvider.tsx       ← wrapper component
│   └── LocaleSwitcher.tsx    ← language selector
├── config/
│   └── rtl-config.json       ← centralized RTL settings
└── patches/
    └── README.md             ← document every inline modification
```

**Why a separate directory?**
- Your files never conflict with upstream files
- If upstream deletes a file or changes structure — your files aren't affected
- `git diff --stat rtl/base..rtl/release` clearly shows your modifications

## Phase 2: Implementation in Order

### Step 1: Translations (Layer A — Zero Conflicts)

The easiest and safest step — 100% new files.

```bash
git checkout rtl/translations

# Copy locale file
cp i18n/en.json i18n/ar.json

# Register language in config
# (this is the only modification to an existing file — document it)
```

**Rule:** Never modify `en.json`. If a key is missing, add it in `ar.json` with English as a temporary value and log it in `rtl-overrides/patches/README.md`.

**Patch log:**
```markdown
# RTL Patches Log

## ar.json additions (not in en.json)
- `app.rtl.direction_label`: "Direction" — custom key for our use
- `app.settings.language`: "Language" — missing from upstream
```

### Step 2: Direction (Layer B — One Change in Root)

```bash
git checkout rtl/direction
```

**Preferred approach: wrapper, not inline edit**

```typescript
// rtl-overrides/components/RTLProvider.tsx
import { DirectionProvider } from '@radix-ui/react-direction';
import { useEffect } from 'react';

export function RTLProvider({ children, locale = 'ar' }) {
  const dir = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <DirectionProvider dir={dir}>
      {children}
    </DirectionProvider>
  );
}
```

**The only modification to platform code:**
```typescript
// In root layout/app — one line only
import { RTLProvider } from '@/rtl-overrides/components/RTLProvider';

// Wrap the app
<RTLProvider locale={currentLocale}>
  <App />
</RTLProvider>
```

**Why a wrapper?**
- If upstream changes the root layout, conflict is in one line only
- All RTL logic lives in your file — you don't touch their logic
- You can add features (auto-detect, persist preference) without modifying their code

### Step 3: CSS (Layer B or C — Depends on Approach)

**Two approaches — choose the one that fits:**

#### Approach A: Override File (Layer B — Preferred)

```css
/* rtl-overrides/styles/rtl.css */

/* Instead of modifying platform files, override from outside */
[dir="rtl"] .sidebar {
  margin-inline-start: 0;
  margin-inline-end: 16px;
}

[dir="rtl"] .header-actions {
  flex-direction: row-reverse;
}

[dir="rtl"] .breadcrumb-separator {
  transform: scaleX(-1);
}
```

```typescript
// Add one import in root
import '@/rtl-overrides/styles/rtl.css';
```

**Pros:** Zero changes to original CSS files. Rebase never breaks. Remove by deleting one import.

**Cons:** Override file grows over time. Doesn't work for CSS-in-JS.

#### Approach B: Codemod (Layer C — When Necessary)

```bash
# Run codemod but keep the patch
npx @rtl-first/codemod --dry-run ./src > .rtl-patches/css-changes.diff
npx @rtl-first/codemod ./src

# Document
echo "CSS codemod applied: $(date)" >> rtl-overrides/patches/README.md
echo "Files changed: $(git diff --stat | tail -1)" >> rtl-overrides/patches/README.md

# Commit in separate branch
git add -A
git commit -m "rtl: apply CSS logical properties codemod"
```

**When to use Codemod instead of Override:**
- CSS-in-JS (styled-components, vanilla-extract) — can't override
- Tailwind classes in JSX — must modify source
- When the override file exceeds 500 lines — a sign the approach doesn't scale

### Step 4: Hardcoded Strings (Layer C — With Caution)

The most dangerous layer for rebase. Every JSX file change is a potential conflict.

**Rule: Only change what the user sees directly.**

```
❌ Don't change: console.log("Loading...")
❌ Don't change: // TODO: fix this later
✅ Change: <button>Download App</button>
✅ Change: <h1>Welcome to Platform</h1>
```

**Approach:**
```typescript
// Before (hardcoded)
<button>Download App</button>

// After (i18n)
<button>{t('app.download')}</button>

// Add key to ar.json
"app.download": "تحميل التطبيق"
```

**Document every change:**
```markdown
## Hardcoded string replacements
| File | Line | Original | Key |
|------|------|----------|-----|
| src/components/Header.tsx | 12 | "Download App" | app.download |
| src/components/Sidebar.tsx | 45 | "Settings" | app.settings |
```

## Phase 3: The Rebase Workflow

### Every week (or every upstream release):

```bash
# 1. Update main
git checkout main
git pull upstream main

# 2. Rebase each branch independently
git checkout rtl/translations
git rebase main
# ← Usually no conflicts (separate files)

git checkout rtl/direction
git rebase main
# ← Rare conflict (one line in root)

git checkout rtl/css
git rebase main
# ← Conflicts possible here — resolve them

# 3. Rebuild release branch
git checkout rtl/release
git reset --hard main
git merge rtl/translations
git merge rtl/direction
git merge rtl/css

# 4. Run audit and verify
npx @rtl-first/audit ./
```

### When the conflict is large:

```bash
# If upstream restructured i18n completely
# 1. Run a new audit
npx @rtl-first/audit ./ --json > audit-new.json

# 2. Compare with last audit
diff audit-old.json audit-new.json

# 3. If the gap is large, restart the layer
git checkout rtl/translations
git reset --hard main
# Re-apply translations to the new structure
```

## Phase 4: Measuring Fork Health

### Health Metrics

```bash
# How many commits behind upstream?
git log main..rtl/release --oneline | wc -l
# Target: under 50 commits

# How many platform files modified?
git diff --stat main..rtl/release | tail -1
# Target: under 5% of files

# How many files in rtl-overrides vs inline edits?
OVERRIDE=$(find rtl-overrides -type f | wc -l)
INLINE=$(git diff --name-only main..rtl/release | grep -v rtl-overrides | wc -l)
echo "Isolation ratio: $OVERRIDE override / $INLINE inline"
# Target: ratio > 2 (override files outnumber inline edits 2:1)
```

### RTL Fork Health Score

| Metric | Green | Yellow | Red |
|--------|:-----:|:------:|:---:|
| Commits behind upstream | < 50 | 50-150 | > 150 |
| Inline files modified | < 20 | 20-50 | > 50 |
| Isolation ratio | > 2 | 1-2 | < 1 |
| Rebase time | < 1 hour | 1-4 hours | > 1 day |
| Last rebase | < 1 week | 1 week - 1 month | > 1 month |

## Phase 5: Transition Path from Fork to Upstream

### When to go back upstream

When the platform decides to officially support RTL, your organized changes become the foundation for PRs:

```
rtl/translations  →  PR: "feat(i18n): add Arabic locale"
rtl/direction     →  PR: "feat(i18n): add RTL direction support"
rtl/css           →  PR: "refactor: convert CSS to logical properties"
                      or: "docs: add rtl-codemod script"
```

**Each branch = one clean PR.** This is exactly why isolation matters from day one.

### Ideal scenario:

```
Month 1-3:  Fork + arabize using rtl-first
Month 4:    Platform sees the fork, decides to support RTL
Month 5:    Convert branches to clean upstream PRs
Month 6:    PRs merged — abandon the fork, return to upstream
```

## Summary: 10 Rules for a Smart Fork

1. **Never touch main** — keep it an exact mirror of upstream
2. **Branch per layer** — isolate conflicts
3. **rtl-overrides directory** — your files live in their own home
4. **Override before inline** — CSS override file beats codemod unless necessary
5. **Document every inline change** — in `patches/README.md`
6. **Rebase weekly** — the longer you wait, the harder it gets
7. **Audit after every rebase** — catch what broke
8. **Measure fork health** — the numbers don't lie
9. **Watch upstream** — if they start RTL work, convert your branches to PRs
10. **The ultimate goal: not needing the fork** — the best fork is one you return from

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
