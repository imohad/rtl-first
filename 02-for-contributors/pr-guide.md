# PR Guide — How to Get Your RTL Contribution Merged

> You want to add RTL support to an open-source project. Here's how to do it so your PR actually gets accepted.

## Rule #1: Open an Issue First

Never start with a PR. Always open an issue:

```markdown
## Arabic/RTL Support — Proposal

I've been looking into adding Arabic/RTL support for [Platform].
Before submitting any PRs, I wanted to check:

1. Is this on the team's roadmap?
2. Are there any architectural decisions I should know about?
3. What's the preferred approach for bulk CSS changes — script or direct edits?

Here's what I've identified needs work:
- [ ] dir="rtl" on root element
- [ ] Arabic locale file (X keys)
- [ ] CSS logical properties (~N files)
- [ ] Hardcoded English strings (~N occurrences)

Happy to contribute — just want to align first.
```

**Why:** You avoid wasting days on a PR the maintainer will reject. The AFFiNE maintainer responded to an issue in 5 minutes and saved weeks of wrong-direction work.

## Rule #2: One Change Per PR

| ✅ Gets merged | ❌ Gets rejected |
|---------------|-----------------|
| 1-5 files changed | 50+ files changed |
| One logical change | "RTL support" (everything at once) |
| Clear description | "Added Arabic" |
| From clean branch | From polluted fork |
| Has tests (if applicable) | No tests |

## Rule #3: Branch from Upstream

```bash
# ❌ Wrong — branch from your fork (may have old/dirty commits)
git checkout -b rtl/direction origin/main

# ✅ Right — branch from upstream directly
git fetch upstream
git checkout -b rtl/direction upstream/main
```

## Rule #4: Follow Their Conventions

Before writing code, study:
- Their commit message format (conventional commits? plain English?)
- Their PR template (fill it out completely)
- Their linting rules (`npm run lint` must pass)
- Their test requirements (do they need tests for every change?)
- Their language policy (English only? Chinese OK?)

## The Five PRs

Submit RTL support as a series of small, independent PRs:

### PR 1: Direction (Layer 2)
```
Title: feat(i18n): add RTL direction support
Files: 1-2 (root layout + maybe DirectionProvider)
Risk: Low
```

### PR 2: Arabic Locale (Layer 4)
```
Title: feat(i18n): add Arabic locale
Files: 1-3 (ar.json files + config update)
Risk: Low
```

### PR 3: Hardcoded Strings — Batch 1 (Layer 5)
```
Title: fix(i18n): extract hardcoded strings in [component]
Files: 3-5 (component files + locale files)
Risk: Low
```

### PR 4: Hardcoded Strings — Batch 2 (Layer 5)
```
Title: fix(i18n): extract hardcoded strings in [component]
Files: 3-5
Risk: Low
```

### PR 5: CSS Codemod (Layer 3)
```
Title: docs: add RTL CSS codemod script
Files: 2 (script + documentation)
Risk: Low — it's a tool, not direct changes
```

## The Codemod PR Pattern

For CSS changes (Layer 3), never submit 100 changed files. Submit the **script**:

```
PR contents:
├── scripts/rtl-codemod.js     ← the codemod
└── docs/RTL-SUPPORT.md        ← how to use it

PR description:
"This PR adds a codemod script that converts physical CSS properties
to logical equivalents for RTL support. The script doesn't change any
files directly — maintainers can review and run it at their discretion.

Run: node scripts/rtl-codemod.js --dry-run ./src
"
```

This approach respects the maintainer's authority. They review the logic once and apply it when ready.

## Writing the PR Description

Good description:

```markdown
## What
Add `dir="rtl"` to the root HTML element based on the current locale.

## Why
Arabic and Hebrew users see a broken layout because the document
direction defaults to LTR. This single change enables correct
text alignment and layout flow for RTL languages.

## How
- Modified `app/layout.tsx` to read locale and set `dir` attribute
- Added `DirectionProvider` wrapper for Radix UI components

## Testing
- Tested with Arabic locale: layout correctly flips
- Tested with English locale: no visual changes
- Existing tests pass
```

Bad description:

```
Added RTL support.
```

## Git Hygiene

```bash
# Squash your commits before submitting
git rebase -i upstream/main

# Use conventional commit format
git commit -m "feat(i18n): add dir=rtl to root layout"

# If the project uses specific hooks
HUSKY=0 git commit -m "feat(i18n): add Arabic locale"
```

## When Your PR Gets Rejected

It happens. Common reasons:

1. **"Not a priority"** — Thank them, keep your work in a branch, check back in 3 months.
2. **"Too many changes"** — Break it into smaller PRs.
3. **"We handle this differently"** — Ask what approach they prefer, adapt.
4. **"CSS-only RTL isn't enough"** — They're right. Document the deeper issue, contribute what you can.

The AFFiNE story: 2 PRs merged, 1 rejected. The rejection taught more than the merges — it revealed that RTL in their editor needs fundamental changes, not CSS patches.

## Credibility Building

Before touching RTL, submit 1-2 small non-RTL PRs:
- Fix a typo in docs
- Fix a small bug
- Improve error message

This shows up in your contributor history. When your RTL PR arrives, the maintainer sees you're not a drive-by contributor.

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
