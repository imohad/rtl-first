# @rtl-first/audit

Scan any project for RTL readiness across the [five layers of RTL support](../../docs/for-contributors/methodology.md).

## Usage

```bash
npx @rtl-first/audit ./my-project
```

## What it checks

| Layer | What it scans | How |
|-------|--------------|-----|
| **1 — Text engine** | Rich-text editors (ProseMirror, Slate, etc.) | Checks package.json dependencies |
| **2 — Direction logic** | `dir="rtl"`, DirectionProvider | Scans .ts/.tsx/.html files |
| **3 — CSS layout** | Physical CSS properties | Counts margin-left, padding-right, etc. |
| **4 — Translations** | ar.json existence and completeness | Compares with en.json |
| **5 — Hardcoded text** | English strings in JSX | Scans .tsx/.jsx files |

## Output

```
RTL Audit Report — my-project
═══════════════════════════════════════

Layer 1 — Text engine         ✅ No rich-text editor detected
Layer 2 — Direction logic     ❌ No dir="rtl" on document root
Layer 3 — CSS layout          ⚠️  423 files use physical properties
Layer 4 — Translations        ⚠️  ar.json not found (en.json: 1,660 keys)
Layer 5 — Hardcoded text      ❌ 89 hardcoded English strings in JSX

RTL Readiness Score: 12/100
```

## Output formats

```bash
npx @rtl-first/audit ./project                    # Terminal (default)
npx @rtl-first/audit ./project --format json       # JSON (for CI/CD)
npx @rtl-first/audit ./project --format markdown   # Markdown (for issues)
```

## Zero dependencies

This tool has no external dependencies. It uses only Node.js built-in modules.

## License

MIT
