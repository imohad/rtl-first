# RTL Readiness Checklist

> 20 checks before you ship. Run through this list before every release.

## Direction & Layout

- [ ] `dir` attribute set on `<html>` element dynamically based on locale
- [ ] `lang` attribute set on `<html>` element
- [ ] UI library direction provider configured (Radix, MUI, Chakra, Ant Design)
- [ ] Layout flips correctly when switching to RTL
- [ ] Sidebar appears on the right side in RTL
- [ ] Navigation flows right-to-left

## CSS

- [ ] No `margin-left` / `margin-right` in codebase (use `margin-inline-start` / `margin-inline-end`)
- [ ] No `padding-left` / `padding-right` (use `padding-inline-start` / `padding-inline-end`)
- [ ] No `left:` / `right:` positioning (use `inset-inline-start` / `inset-inline-end`)
- [ ] No `text-align: left` / `text-align: right` (use `text-align: start` / `text-align: end`)
- [ ] No `border-left` / `border-right` (use `border-inline-start` / `border-inline-end`)
- [ ] Flexbox and Grid layouts respect direction naturally (no `row-reverse` hacks)

## Translations

- [ ] Every user-visible string goes through i18n — zero hardcoded text
- [ ] Arabic locale file exists and is complete
- [ ] Arabic plurals handled correctly (6 forms, not 2)
- [ ] No string concatenation — use interpolation (`t('key', { var })`)

## Visual

- [ ] Navigation icons (arrows, chevrons) flip in RTL
- [ ] Universal icons (close, check, play) do NOT flip
- [ ] Scrollbars appear on the correct side

## Testing

- [ ] Manually tested full user flow in Arabic
- [ ] No English text visible when locale is Arabic (except proper nouns and brand names)

## Quick Audit

Run the rtl-first audit to catch what you missed:

```bash
npx @rtl-first/audit ./
```

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — arabize any JavaScript web application.*
