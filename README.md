# rtl-first

> Build for the world from day one. Or arabize any platform yourself.

Most software is built English-first. RTL languages — Arabic, Hebrew, Persian, Urdu — are treated as an afterthought. **This is not a translation problem. This is an architecture problem.**

rtl-first is an open-source framework for developers who want to:
- **Build** RTL-ready platforms from day one
- **Contribute** RTL support to existing open-source projects
- **Fork** and arabize any platform for your local market

## Quick Start

### Forkers — Arabize any platform in one command

```bash
npx @rtl-first/arabize ./my-fork
```

This single command will:
1. Detect your framework (Next.js, Nuxt, Remix, Vite, Angular...)
2. Inject `dir="rtl"` and `lang="ar"` on the root element
3. Copy source locale → `ar.json` and update your i18n config
4. Generate a `LocaleSwitcher` component
5. Create rebaseable CSS patches in `.rtl-patches/`

After every upstream rebase:
```bash
git rebase upstream/main && bash .rtl-patches/apply-all.sh
```

### Contributors — Audit any repo

```bash
npx @rtl-first/audit ./project
```

Get a full RTL readiness report across all five layers:
```
Layer 1 — Text Engine:    ⚠️  Uses ProseMirror (BiDi not configured)
Layer 2 — Direction:      ❌  No dir="rtl" on document
Layer 3 — CSS Layout:     ❌  147 files use margin-left/right
Layer 4 — Translations:   ⚠️  ar.json missing
Layer 5 — Hardcoded:      ❌  34 hardcoded English strings
```

### Builders — Use the architecture guide

Read [01-for-builders/architecture.md](01-for-builders/architecture.md) for how to build RTL-first from day one.

## The Five Layers of RTL Readiness

Every RTL problem lives in one of five layers. Always start by asking: **"Where is text generated in this system?"**

```
Layer 1 — Text Engine       ← Does it understand BiDi? (deepest, hardest)
Layer 2 — Direction Logic   ← dir="rtl" + DirectionProvider
Layer 3 — CSS Layout        ← CSS logical properties
Layer 4 — Translations      ← ar.json
Layer 5 — Hardcoded Text    ← English strings buried in code
```

## Tools — 8 Packages

### The Master Script
| Package | Command | What it does |
|---------|---------|-------------|
| **@rtl-first/arabize** | `npx @rtl-first/arabize ./` | Arabize any platform — one command does everything |

### Core Tools (for everyone)
| Package | Command | What it does |
|---------|---------|-------------|
| @rtl-first/audit | `npx @rtl-first/audit ./` | Scan any repo for RTL readiness across all 5 layers |
| @rtl-first/codemod | `npx @rtl-first/codemod ./src` | Convert CSS physical → logical properties |

### For Contributors
| Package | Command | What it does |
|---------|---------|-------------|
| @rtl-first/translation-kit | `npx @rtl-first/translation-kit --source en.json --target ar.json` | Find missing translation keys + hardcoded strings |
| @rtl-first/contributor-agent | `npx @rtl-first/contributor-agent --audit report.json` | Generate ready-made PRs with descriptions |

### For Forkers
| Package | Command | What it does |
|---------|---------|-------------|
| @rtl-first/direction-injector | `npx @rtl-first/direction-injector ./` | Auto-detect framework and inject dir="rtl" |
| @rtl-first/locale-scaffolder | `npx @rtl-first/locale-scaffolder ./` | Scaffold ar.json + update config + generate LocaleSwitcher |
| @rtl-first/patch-generator | `npx @rtl-first/patch-generator ./` | Generate rebaseable RTL patches per layer |

All packages have **zero dependencies** (except arabize which depends on the three forker tools). Every tool supports `--dry-run`, `--json`, and `--help`.

## Who is this for?

### Builders
You're building a new platform and want RTL support from day one.
→ Read the [Architecture Guide](01-for-builders/architecture.md) and [Checklist](01-for-builders/checklist.md)

### Contributors
You want to add RTL support to an existing open-source project and get your PRs merged.
→ Read the [Methodology](02-for-contributors/methodology.md) and [PR Guide](02-for-contributors/pr-guide.md)

### Forkers
You're taking an open-source platform (Dify, Cal.com, AppFlowy...) and arabizing it for your company or market.
→ Run `npx @rtl-first/arabize ./` and read the [Fork RTL Methodology](03-for-forkers/fork-rtl-methodology.md)

## Platform Status

Platforms we've audited with rtl-first:

| Platform | Stars | RTL Score | Status |
|----------|-------|-----------|--------|
| Dify | 133k+ | 70/100 (C) | Issue opened, awaiting response |
| AFFiNE | 65k+ | — | 2 PRs merged, blocksuite needs deep RTL work |
| Cal.com | 34k+ | 70/100 (C) | Not started |
| AppFlowy | 60k+ | 65/100 (C) | Issue open since 2021 |
| NocoBase | 15k+ | 42/100 (D) | Issue open |

## Case Studies

### AFFiNE — Full journey documented
Two PRs merged (RTL layout + Arabic locale + date-picker fix). Third PR closed — maintainer confirmed CSS-only RTL is insufficient for blocksuite's editor. The full story with lessons learned is in [05-case-studies/affine/](05-case-studies/affine/).

Key lesson: **Always ask "Where is text generated?" before writing any code.** If the answer is a text engine that doesn't support BiDi, CSS fixes won't solve the real problem.

## Project Structure

```
rtl-first/
├── README.md                        ← you are here
├── 01-for-builders/
│   ├── architecture.md
│   ├── checklist.md
│   └── stack-guides/
├── 02-for-contributors/
│   ├── methodology.md
│   ├── pr-guide.md
│   └── platform-status.md
├── 03-for-forkers/
│   ├── quick-start.md
│   ├── fork-rtl-methodology.md
│   └── platform-recipes/
├── 04-tools/
│   ├── arabize/
│   ├── audit/
│   ├── codemod/
│   ├── contributor-agent/
│   ├── direction-injector/
│   ├── locale-scaffolder/
│   ├── patch-generator/
│   └── translation-kit/
└── 05-case-studies/
    └── affine/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome — from documentation fixes to new platform recipes to tool improvements.

## License

MIT

---

*Built by [Mohammad AlShammari](https://github.com/imohad) — because 400 million Arabic speakers deserve software that works in their direction.*
