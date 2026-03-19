# PR guide: from first issue to merged PR

How to contribute RTL support to open-source projects and actually get your work merged.

Everything in this guide comes from real experience contributing to projects like AFFiNE (65k+ stars). These aren't theoretical best practices — they're lessons learned from PRs that got merged, and PRs that got rejected.

## Phase 1: Reconnaissance

Before writing any code, understand what you're working with.

```bash
# Does the project use i18n?
find . -name "*.json" | xargs grep -l "translation\|locale\|i18n" | head -5

# Is there already an Arabic translation?
find . -name "ar.json" | head -5

# Is RTL mentioned anywhere?
grep -r "rtl\|direction\|dir=" --include="*.ts" --include="*.tsx" | grep -v node_modules | head -10

# What UI library is used?
grep -E "radix|shadcn|chakra|mantine|ant-design" package.json
```

Or just run:
```bash
npx @rtl-first/audit ./project-path
```

## Phase 2: Open an issue first

**This is the most important step.** Do not skip it.

A maintainer who sees a surprise 50-file PR will close it. A maintainer who sees a thoughtful issue will often help you scope the work — and might save you weeks.

Template:

```markdown
## Arabic/RTL support — proposal

I've been looking into adding Arabic/RTL support for [Project Name].
Before submitting any PRs, I wanted to align with the team:

1. Is RTL support on the roadmap?
2. Are there architectural decisions I should know about?
3. What's the preferred approach for bulk CSS changes (manual vs. codemod)?

Here's what I've identified so far:
- [ ] Direction detection (`dir="rtl"` on root element)
- [ ] Translation file (ar.json — X keys needed)
- [ ] CSS logical properties (~N files use physical properties)
- [ ] Hardcoded English strings in components

I'd like to contribute this incrementally. Happy to start with
whichever area the team prefers.
```

**Why this works:** You're showing respect for the maintainer's time and architecture. You're asking before doing. You're offering to do the work, not demanding they do it.

**Real example:** When we opened an issue in AFFiNE, the lead maintainer (darkskygit) responded within 5 minutes with guidance that saved a week of misdirected work.

## Phase 3: Sequence your work

Do not submit everything at once. Build trust incrementally.

```
Week 1  →  Fix a small bug (unrelated to RTL)
           Purpose: build trust, learn the codebase, pass CI

Week 2  →  Add direction detection + translations
           This is Layer 2 + Layer 4 — safe and valuable

Week 3  →  Complete translation strings
           Layer 4 continued — fill in missing keys

Week 4+ →  Submit CSS codemod as a script
           Layer 3 — provide the tool, not 150 changed files
```

## Phase 4: Write PRs that get merged

### What gets accepted

| Pattern | Why it works |
|---------|-------------|
| 1-5 files changed | Easy to review |
| One logical change | Clear scope |
| Branched from upstream/main | Clean history |
| Codemod script for bulk changes | Reproducible, verifiable |
| Clear description with screenshots | Saves reviewer time |
| Passes CI | Shows you tested it |

### What gets rejected

| Anti-pattern | Why it fails |
|-------------|-------------|
| 10+ files changed manually | Too much to review |
| Multiple unrelated changes | Unclear scope |
| Branched from stale fork | Merge conflicts, contaminated history |
| 150 files of CSS changes inline | Nobody will review 150 files |
| No description | Maintainer has no context |
| Fails CI | Shows you didn't test |

### Git hygiene

```bash
# Always branch from upstream, never from your fork's main
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git checkout -b feat/rtl-direction upstream/main

# If the project uses git hooks that block your commit
HUSKY=0 git commit -m "feat(i18n): add Arabic RTL direction support"

# Keep your fork clean
git push origin feat/rtl-direction
# Then open PR from your fork to upstream
```

**Fork contamination** is real. If you branched from your fork's `main` instead of `upstream/main`, your PR will contain every commit difference between the two — not just your changes. Maintainers will close it immediately.

### The codemod strategy

When you need to change 50+ files (common for CSS physical → logical properties), never submit the changed files directly. Instead:

```
Your PR should contain:
├── scripts/rtl-codemod.js      ← The script that makes the changes
└── docs/RTL-SUPPORT.md         ← Documentation of the approach
```

The maintainer can:
1. Review the script (small, readable)
2. Run it themselves to verify
3. Merge it as a tool for the project

This approach got our AFFiNE codemod PR accepted for review, while a hypothetical 150-file PR would have been rejected on sight.

### PR description template

```markdown
## What this PR does

Adds RTL (right-to-left) direction support for Arabic and other RTL languages.

## Changes

- Sets `dir="rtl"` on document root when an RTL locale is active
- Wraps app in `DirectionProvider` for Radix UI components
- Adds `applyDocumentLanguage()` to i18n module

## How to test

1. Switch language to Arabic in settings
2. Verify layout mirrors correctly
3. Check that Radix dropdowns open in the correct direction

## Screenshots

[Before/After screenshots]

## Related

- Issue #XXX
- Follows rtl-first methodology: https://github.com/imohad/rtl-first
```

## Phase 5: Handle feedback

Maintainers may push back. This is normal and healthy.

**Common feedback and how to respond:**

| Feedback | Response |
|----------|----------|
| "This is too big" | Split into smaller PRs, offer a sequence |
| "We're not ready for RTL" | Ask what would need to change, offer to help |
| "This doesn't fully solve RTL" | Acknowledge it's incremental, reference the five layers |
| "Use a codemod instead" | Great — that's exactly the right approach |
| "We need this in the text engine first" | They're right (Layer 1). Document it and move on |

**When to walk away:** If a maintainer says "we don't want RTL support," respect that. Not every project is ready. Document the status in [platform-status.md](platform-status.md) and move to the next project.
