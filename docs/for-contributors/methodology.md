# The five layers of RTL readiness

A systematic methodology for evaluating and implementing RTL support in any software project.

## The fundamental question

Before writing any code, before opening any PR, before touching any CSS file, ask one question:

> **"Where does text originate in this system?"**

```
Your project
  └── Where is text written/edited?
        ├── Third-party editor library?
        │     └── Does it support BiDi/RTL?
        │           ├── Yes → Start from the UI layers (2-5)
        │           └── No  → Start from the library (Layer 1)
        └── Internal code?
              └── Look for: cursor logic, selection handling, text-direction
```

The answer determines your entire strategy. If the project uses ProseMirror, Slate, CodeMirror, or any rich-text editor, the text engine is Layer 1 — and no amount of CSS or translation work will fix a broken text engine.

## The five layers

Every software project that displays text has these five layers. They go from deepest (hardest to fix, most impactful) to surface (easiest to fix, least impactful).

### Layer 1 — Text engine

**What it covers:** BiDi algorithm support, cursor movement in mixed-direction text, selection behavior, text input handling.

**Why it matters:** If your project uses a rich-text editor and that editor doesn't handle BiDi correctly, users will experience:
- Cursor jumping to wrong positions
- Selection highlighting the wrong range
- Punctuation appearing on the wrong side
- Copy-paste breaking text order

**What to check:**
- Does `package.json` include ProseMirror, CodeMirror, Slate, Quill, TipTap, or Monaco?
- If yes — does the editor configuration enable BiDi support?
- Are there custom cursor or selection handlers that assume LTR?

**Effort:** Massive. Fixing a text engine's BiDi support can take months and requires deep coordination with the library maintainers.

**Acceptance likelihood:** Low without prior relationship with maintainers. You need to open a proposal, not a PR.

**Real example — AFFiNE:**
AFFiNE uses blocksuite (built on ProseMirror). After weeks of CSS and translation work, the maintainer closed the RTL PR with this feedback:

> *"Simply tweaking styles cannot bring native RTL support to the editor; supporting RTL editing requires adjusting a large amount of editor logic. We believe providing only partial, visual RTL support does not align with our development intent."*

The lesson: if your project has a complex text editor, acknowledge Layer 1 upfront. Either fix it first (hard) or document it as a known limitation (honest).

**Platform assessment:**

| Platform | Text engine | Layer 1 status |
|----------|------------|----------------|
| Dify | No complex editor | Skip — start at Layer 2 |
| Cal.com | No editor | Skip — start at Layer 2 |
| NocoBase | No editor | Skip — start at Layer 2 |
| AppFlowy | Custom Rust editor | Needs deep work |
| AFFiNE | blocksuite/ProseMirror | Needs deep work |

### Layer 2 — Direction logic

**What it covers:** Setting `dir="rtl"` on the document root, configuring DirectionProvider for component libraries, language-aware direction switching.

**Why it matters:** Without `dir="rtl"` on the root element, the browser doesn't know the page should flow right-to-left. Text alignment, flexbox order, table layout — everything stays LTR.

**What to check:**
- Is `dir` attribute set on `<html>` or root element?
- Is there a `DirectionProvider` (Radix UI) or equivalent?
- Does `document.documentElement.dir` get updated when language changes?
- Does `document.documentElement.lang` get set?

**How to fix:**

The simplest pattern (works for most i18n setups):
```typescript
// When locale changes
function applyDocumentLanguage(lang: string) {
  const dir = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'].some(
    rtl => lang.startsWith(rtl)
  ) ? 'rtl' : 'ltr';

  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}
```

For Radix UI projects (common in modern React apps):
```tsx
// Radix's useDirection() returns "ltr" by default.
// You MUST wrap your app in DirectionProvider.
import { DirectionProvider } from '@radix-ui/react-direction';

function App() {
  const dir = document.documentElement.dir || 'ltr';
  return (
    <DirectionProvider dir={dir}>
      {/* your app */}
    </DirectionProvider>
  );
}
```

**Effort:** Medium. Usually a few files, but requires understanding the app's i18n architecture.

**Acceptance likelihood:** Medium. Maintainers generally welcome this if you explain it well.

### Layer 3 — CSS layout

**What it covers:** Replacing physical CSS properties (`margin-left`, `padding-right`) with logical properties (`margin-inline-start`, `padding-inline-end`).

**Why it matters:** Physical properties are hardcoded to one direction. `margin-left: 16px` always pushes content from the left, even in RTL mode. Logical properties adapt automatically based on the document direction.

**The conversion table:**

```
Physical                    Logical
─────────────────────────── ───────────────────────────
margin-left                 margin-inline-start
margin-right                margin-inline-end
padding-left                padding-inline-start
padding-right               padding-inline-end
border-left                 border-inline-start
border-right                border-inline-end
border-left-width           border-inline-start-width
border-right-width          border-inline-end-width
left: 0                     inset-inline-start: 0
right: 0                    inset-inline-end: 0
text-align: left            text-align: start
text-align: right           text-align: end

CSS-in-JS (camelCase)
─────────────────────────── ───────────────────────────
marginLeft                  marginInlineStart
marginRight                 marginInlineEnd
paddingLeft                 paddingInlineStart
paddingRight                paddingInlineEnd
borderLeft                  borderInlineStart
borderRight                 borderInlineEnd
```

**How to fix:** Use `@rtl-first/codemod`:
```bash
npx @rtl-first/codemod --dry-run ./src    # preview changes
npx @rtl-first/codemod ./src               # apply changes
```

**Important caveats from real experience:**
- `text-align: left` is sometimes intentional (e.g., code blocks). The codemod flags these as warnings.
- `border-left: 1px` might have extra whitespace: `border-left : 1px`. The regex needs `\s*`.
- camelCase properties in vanilla-extract or CSS-in-JS need context — don't replace inside className strings.

**Effort:** Large in file count, small in complexity. Perfect for automated codemods.

**Acceptance likelihood:** High with a codemod. Maintainers reject 150 manually-edited files but accept a script that produces the same result.

**Critical PR strategy:**
```
❌ PR with 150 changed files → REJECTED
✅ PR with 2 files: scripts/rtl-codemod.js + docs/RTL-SUPPORT.md → ACCEPTED
```

### Layer 4 — Translations

**What it covers:** Locale files (`ar.json`, `he.json`, `fa.json`), i18n framework configuration, pluralization rules, date/number formatting.

**What to check:**
- Does `ar.json` (or equivalent) exist?
- How many keys does it have vs. `en.json`?
- Are there nested translation keys?
- Is the i18n framework configured for RTL locales?

**How to fix:** Use `@rtl-first/translation-kit`:
```bash
npx @rtl-first/translation-kit --source en.json --target ar.json
```

**Arabic-specific gotchas:**
- Arabic comma is `،` (U+060C), not `,` (U+002C). Code that splits on `,` will break Arabic text. Use `/[,،]/` regex.
- Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) are used in some regions. `Number.toLocaleString('ar')` handles this.
- Date formats vary: some Arabic regions use Hijri calendar.

**Effort:** Large but mechanical. Translation itself is the bottleneck, not the code.

**Acceptance likelihood:** Almost always accepted. Adding translations is the safest type of contribution.

### Layer 5 — Hardcoded text

**What it covers:** English strings buried directly in source code instead of using i18n keys.

**What to check:**
```tsx
// ❌ Hardcoded — invisible to translators
<button>Download App</button>
<span>Settings</span>
<p>No results found</p>

// ✅ Using i18n — translatable
<button>{t('download_app')}</button>
<span>{t('settings')}</span>
<p>{t('no_results')}</p>
```

**How to find them:** `@rtl-first/audit` scans JSX/TSX files for string literals that look like user-facing text (more than 2 words, not a CSS class, not a URL, not a test ID).

**Effort:** Small per string, but tedious across a large codebase.

**Acceptance likelihood:** Almost always accepted. Maintainers appreciate these cleanups.

## Priority order

When contributing RTL support, work from the surface inward:

```
Start here (easiest, most likely to be accepted)
  │
  ▼
Layer 5 — Fix hardcoded strings (small PRs, build trust)
Layer 4 — Add/complete translations (safe, always welcome)
Layer 3 — Run codemod for CSS (provide script, not 150 files)
Layer 2 — Add direction logic (requires understanding the app)
Layer 1 — Fix text engine (requires proposal and maintainer buy-in)
  │
  ▼
End here (hardest, requires trust and coordination)
```

**Why this order?** You build trust with maintainers by starting with safe, small changes. By the time you propose Layer 2 changes, they've already merged your Layer 4-5 PRs and know you understand the codebase.

## Effort vs. acceptance matrix

| Layer | Code volume | Complexity | Acceptance likelihood |
|-------|------------|------------|----------------------|
| 1 — Text engine | Massive | Very high | Low — needs proposal first |
| 2 — Direction logic | Medium | High | Medium |
| 3 — CSS layout | Large | Low | High (with codemod) |
| 4 — Translations | Large | Low | Very high |
| 5 — Hardcoded text | Small | Low | Very high |

## Applying this to your project

1. Run `npx @rtl-first/audit ./path-to-project`
2. Read the report — it tells you which layers need work
3. Check Layer 1 first — if there's a text editor without BiDi, document it
4. Start contributing from Layer 5 downward
5. Follow the [PR guide](pr-guide.md) for each contribution
