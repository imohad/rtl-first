# Platform RTL status

RTL readiness of major open-source platforms. Scored using `npx @rtl-first/audit`.

## RTL Readiness Scores

| Platform | Stars | Score | Grade | Layer 1 | Layer 2 | Layer 3 | Layer 4 | Layer 5 |
|----------|-------|-------|-------|---------|---------|---------|---------|---------|
| **Dify** | 90k+ | 70/100 | C | ✅ No editor | ✅ Detected | ❌ 404 physical | ⚠️ 98.7% (62 missing) | ❌ 102 hardcoded |
| **Cal.com** | 34k+ | 70/100 | C | ✅ No editor | ✅ Detected | ❌ 316 physical | ⚠️ 97.6% (116 missing) | ❌ 109 hardcoded |
| **AppFlowy** | 60k+ | 65/100 | C | ⚠️ Rust editor* | ❌ No direction | ✅ Clean | ⚠️ Not detected* | ✅ Clean |
| **NocoBase** | 15k+ | 42/100 | D | ⚠️ CodeMirror + Slate | ✅ Ant Design | ❌ 1,012 physical | ⚠️ Not detected | ❌ 102 hardcoded |
| **AFFiNE** | 65k+ | — | — | ❌ blocksuite | ✅ Done (#14624) | ⚠️ Partial | ✅ 100% ar.json | ⚠️ Some hardcoded |

*AppFlowy uses Flutter/Rust — our scanner (Node.js/JS-focused) has limited coverage for non-JS projects.*

## Key findings

**Best candidates for contribution (no Layer 1 blocker):**

1. **Dify** (70/100) — 90k stars, Arabic already 98.7% complete. Needs: 62 translation keys + 404 CSS fixes. Issue opened: [#33783](https://github.com/langgenius/dify/issues/33783).
2. **Cal.com** (70/100) — 34k stars, Arabic 97.6% complete. Needs: 116 translation keys + 316 CSS fixes. Clean architecture.

**Needs deeper work (Layer 1 blocker):**

3. **NocoBase** (42/100) — 15k stars, uses CodeMirror + Slate. 1,012 physical CSS properties — largest CSS debt. Ant Design provides direction infrastructure.
4. **AppFlowy** (65/100) — 60k stars, Rust editor needs BiDi work. Issue open since 2021.
5. **AFFiNE** — blocksuite needs InlineEditor BiDi. Maintainer confirmed CSS-only approach insufficient.

## Detailed reports

### Dify — 70/100 (C)

```
Layer 1 — Text engine         ✅ No rich-text editor
Layer 2 — Direction logic     ✅ Direction patterns detected
Layer 3 — CSS layout          ❌ 79 files, 404 occurrences
  left (positional): 138 | margin-left: 48 | right: 47
  margin-right: 43 | padding-left: 20 | padding-right: 20
Layer 4 — Translations        ⚠️ ar-TN 98.7% (62 missing of 4,865)
  common.json: 38 missing | workflow.json: 11 | plugin.json: 8
Layer 5 — Hardcoded text      ❌ 102 strings (mostly in test files)
```

### Cal.com — 70/100 (C)

```
Layer 1 — Text engine         ✅ No rich-text editor
Layer 2 — Direction logic     ✅ Direction patterns detected
Layer 3 — CSS layout          ❌ 41 files, 316 occurrences
  margin-left: 62 | left: 52 | margin-right: 46
  padding-left: 45 | padding-right: 31
Layer 4 — Translations        ⚠️ ar 97.6% (116 missing of 4,771)
Layer 5 — Hardcoded text      ❌ 109 strings
```

### NocoBase — 42/100 (D)

```
Layer 1 — Text engine         ⚠️ CodeMirror + Slate + CodeMirror 6
Layer 2 — Direction logic     ✅ Ant Design ConfigProvider detected
Layer 3 — CSS layout          ❌ 333 files, 1,012 occurrences
  left: 274 | right: 204 | marginLeft (JS): 141
  marginRight (JS): 106 | paddingLeft (JS): 75
Layer 4 — Translations        ⚠️ Not detected by scanner
Layer 5 — Hardcoded text      ❌ 102 strings
```

### AppFlowy — 65/100 (C)

```
Layer 1 — Text engine         ⚠️ Rust editor (not scanned — non-JS)
Layer 2 — Direction logic     ❌ No direction logic found
Layer 3 — CSS layout          ✅ No physical CSS properties
Layer 4 — Translations        ⚠️ Flutter-based i18n (not detected)
Layer 5 — Hardcoded text      ✅ No hardcoded strings in JSX
```

**Note:** AppFlowy is Flutter/Rust. Our scanner focuses on JS/TS projects. The score may not fully reflect AppFlowy's actual RTL readiness.

## How to audit a new platform

```bash
npx @rtl-first/audit ./project-path
npx @rtl-first/audit ./project-path --format markdown > report.md
```

Open a PR adding results to this file.
