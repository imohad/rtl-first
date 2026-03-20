# rtl-first

**Build for the world from day one.**

Most software is built English-first. RTL languages — Arabic, Hebrew, Persian, Urdu — are treated as an afterthought. Over 1 billion people use RTL scripts daily, yet there is no systematic framework for making open-source software work for them.

**This isn't a translation problem. It's an architectural problem.**

`rtl-first` is an open-source framework that gives developers the methodology, tools, and playbooks to either build RTL-ready software from scratch or contribute RTL support to existing projects — the right way.

## Quick start

```bash
# Audit any project for RTL readiness
npx @rtl-first/audit ./my-project
```

```
RTL Audit Report — my-project
═══════════════════════════════════════

Layer 1 — Text engine         ✅ No rich-text editor detected
Layer 2 — Direction logic     ❌ No dir="rtl" on document root
Layer 3 — CSS layout          ⚠️  423 files use physical properties
Layer 4 — Translations        ⚠️  ar.json not found (en.json: 1,660 keys)
Layer 5 — Hardcoded text      ❌ 89 hardcoded English strings in JSX

RTL Readiness Score: 12/100

Priority: Layer 2 → Layer 4 → Layer 5 → Layer 3
```

## The problem

Open-source projects handle RTL support in one of three ways:

1. **Ignore it.** No `dir="rtl"`, no Arabic translation, no CSS logical properties. The UI breaks completely for RTL users.
2. **Bolt it on.** Someone adds `ar.json` and a few CSS overrides. The layout half-works. Text editors remain broken. Nobody maintains it.
3. **Treat it as a CSS problem.** Run a stylesheet flipper and call it done. But the text engine doesn't handle BiDi, hardcoded strings stay in English, and the direction logic is missing entirely.

None of these work because RTL support has **five distinct layers**, and most projects only address one or two.

## The five layers of RTL readiness

Every software project that displays text has these five layers. Fix them in order — skipping a deeper layer means the surface layers will always be fragile.

| Layer | What it covers | Depth | Example fix |
|-------|---------------|-------|-------------|
| **1 — Text engine** | BiDi algorithm, cursor movement, selection | Deepest | Configure ProseMirror BiDi, fix InlineEditor |
| **2 — Direction logic** | `dir="rtl"` on document, DirectionProvider | Deep | `document.documentElement.dir = "rtl"` |
| **3 — CSS layout** | Physical → logical properties | Surface | `margin-left` → `margin-inline-start` |
| **4 — Translations** | Locale files (ar.json, he.json, fa.json) | Surface | Add missing i18n keys |
| **5 — Hardcoded text** | Strings buried in source code | Surface | Replace `"Settings"` with `t('settings')` |

> **The fundamental question before writing any code:**
> *"Where does text originate in this system?"*
>
> If the answer is a third-party editor library (ProseMirror, Slate, CodeMirror), check whether it supports BiDi **before** touching CSS. No amount of stylesheet fixes will make a broken text engine work correctly.

## Who this is for

### Builders — starting a new project

You're building something new and want RTL support from day one. You need architecture guidance, not patches.

→ [Architecture guide](docs/for-builders/architecture.md) — how to build RTL-first  
→ [Pre-launch checklist](docs/for-builders/checklist.md) — 20 checks before you ship

### Contributors — improving an existing project

You want to add RTL support to an open-source project and get your PRs merged. You need a methodology and tools.

→ [Contribution methodology](docs/for-contributors/methodology.md) — the five layers in depth  
→ [PR guide](docs/for-contributors/pr-guide.md) — from first issue to merged PR  
→ [Platform status](docs/for-contributors/platform-status.md) — RTL readiness of major platforms

## Tools

| Tool | What it does | Install |
|------|-------------|---------|
| **[@rtl-first/audit](packages/rtl-audit)** | Scans any repo and reports RTL readiness across all 5 layers | `npx @rtl-first/audit ./path` |
| **[@rtl-first/codemod](packages/rtl-codemod)** | Converts CSS physical properties to logical properties | `npx @rtl-first/codemod --dry-run ./src` |
| **[@rtl-first/translation-kit](packages/translation-kit)** | Finds missing translation keys and exports them for translators | `npx @rtl-first/translation-kit --source en-US --target ar-TN` |

All tools are zero-dependency and work with Node.js >= 18.

## Platform RTL readiness

Real audit results from running `@rtl-first/audit` on major open-source platforms:

| Platform | Stars | RTL Score | Grade | Key issue |
|----------|-------|-----------|-------|-----------|
| **Dify** | 90k+ | 70/100 | C | 404 physical CSS properties, 62 missing translation keys |
| **Cal.com** | 34k+ | 70/100 | C | 316 physical CSS properties, 116 missing translation keys |
| **AppFlowy** | 60k+ | 65/100 | C | Rust editor needs BiDi, no direction logic |
| **NocoBase** | 15k+ | 42/100 | D | 1,012 physical CSS properties, CodeMirror + Slate editors |
| **AFFiNE** | 65k+ | — | — | blocksuite needs InlineEditor BiDi support |

→ [Full platform details](docs/for-contributors/platform-status.md)

## Case studies

### AFFiNE (65k+ stars)

A complete account of adding RTL support to a complex open-source project — including what worked, what got rejected, and why the maintainers closed a PR after weeks of work.

→ [Full case study](docs/case-studies/affine.md)

**Key lesson:** The maintainer's response to our CSS-focused RTL PR:

> *"Simply tweaking styles cannot bring native RTL support to the editor; supporting RTL editing requires adjusting a large amount of editor logic."*

This is exactly why we built the five-layer model. CSS (Layer 3) without text engine support (Layer 1) is incomplete — and experienced maintainers know it.

## Contributing

We welcome contributions of all kinds — from fixing typos to auditing new platforms to building tools.

→ [Contributing guide](CONTRIBUTING.md)

The easiest way to start: run `npx @rtl-first/audit` on a project you use, and open an issue in that project with the results.

## License

MIT

---

Built by [@imohad](https://github.com/imohad). Born from the experience of contributing RTL support to AFFiNE and learning — sometimes the hard way — what works and what doesn't.
