# RTL pre-launch checklist

Run through this checklist before shipping any product that claims to support RTL languages. Copy it as a GitHub issue template for your project.

## Direction and language

- [ ] `dir="rtl"` is set on `<html>` when an RTL locale is active
- [ ] `lang` attribute is set on `<html>` to match the active locale
- [ ] Direction updates when user switches language (without page reload)
- [ ] If using Radix UI: `DirectionProvider` wraps the app root

## Layout

- [ ] No `margin-left` / `margin-right` in CSS — use `margin-inline-start` / `margin-inline-end`
- [ ] No `padding-left` / `padding-right` — use `padding-inline-start` / `padding-inline-end`
- [ ] No `left: 0` / `right: 0` for positioning — use `inset-inline-start` / `inset-inline-end`
- [ ] No `text-align: left` / `text-align: right` — use `text-align: start` / `text-align: end`
- [ ] Flexbox and Grid layouts reverse correctly in RTL
- [ ] Scroll direction works correctly in RTL

## Text and content

- [ ] No hardcoded English strings in components — all text uses i18n keys
- [ ] Arabic (or target RTL language) translation file exists and is complete
- [ ] Comma handling supports Arabic comma `،` (U+060C)
- [ ] Number formatting respects locale (`toLocaleString`)
- [ ] Date formatting respects locale and calendar system

## Icons and images

- [ ] Directional icons (arrows, chevrons) flip in RTL
- [ ] Progress bars and sliders reverse direction in RTL
- [ ] Non-directional icons (home, settings, search) do NOT flip

## Text editor (if applicable)

- [ ] Cursor moves correctly in RTL text
- [ ] Text selection works correctly with mixed BiDi content
- [ ] Copy-paste preserves text direction
- [ ] Keyboard shortcuts work (some may need remapping for RTL keyboards)

## Testing

- [ ] Tested with `dir="rtl"` on the document root
- [ ] Tested with actual Arabic/Hebrew text (not just flipped English)
- [ ] Tested with mixed LTR+RTL content in the same view
- [ ] Tested with RTL keyboard input
