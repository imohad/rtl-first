# @rtl-first/codemod

Convert CSS physical properties to logical properties for RTL support. Part of the [rtl-first](https://github.com/imohad/rtl-first) framework.

## Usage

```bash
# Preview changes (safe — no files modified)
npx @rtl-first/codemod --dry-run ./src

# Apply changes
npx @rtl-first/codemod ./src

# Only process specific file types
npx @rtl-first/codemod ./src --ext .css,.tsx

# See rule-by-rule details
npx @rtl-first/codemod --dry-run ./src --verbose

# Skip camelCase conversions (CSS-in-JS)
npx @rtl-first/codemod ./src --no-camel
```

## What it converts

### CSS (kebab-case)

```
margin-left         → margin-inline-start
margin-right        → margin-inline-end
padding-left        → padding-inline-start
padding-right       → padding-inline-end
border-left         → border-inline-start
border-right        → border-inline-end
border-left-width   → border-inline-start-width
border-right-width  → border-inline-end-width
left: 0             → inset-inline-start: 0
right: 0            → inset-inline-end: 0
text-align: left    → text-align: start    ⚠️ (flagged)
text-align: right   → text-align: end      ⚠️ (flagged)
border-top-left-radius     → border-start-start-radius
border-top-right-radius    → border-start-end-radius
border-bottom-left-radius  → border-end-start-radius
border-bottom-right-radius → border-end-end-radius
```

### CSS-in-JS (camelCase)

```
marginLeft          → marginInlineStart
marginRight         → marginInlineEnd
paddingLeft         → paddingInlineStart
paddingRight        → paddingInlineEnd
borderLeft          → borderInlineStart
borderRight         → borderInlineEnd
borderLeftWidth     → borderInlineStartWidth
borderRightWidth    → borderInlineEndWidth
borderTopLeftRadius → borderStartStartRadius
(and more...)
```

## Warnings

Some conversions may be intentional. The codemod flags these:

- `text-align: left` — may be correct for code blocks, LTR content, or number columns
- `text-align: right` — may be correct for specific alignment needs

Review flagged changes after running the codemod.

## Learned from AFFiNE

This codemod was built from real experience contributing to [AFFiNE](https://github.com/toeverything/AFFiNE) (65k+ stars). Key lessons embedded in the rules:

- `border-left\s*:` uses `\s*` because real code sometimes has extra whitespace
- camelCase rules use `\b` word boundaries to avoid matching inside strings
- `text-align: left/right` is flagged because it's sometimes intentional
- Border sub-properties (width, color, style) are matched before the shorthand to avoid double-replacement

## Zero dependencies

This tool has no external dependencies. Node.js >= 18 only.

## License

MIT
