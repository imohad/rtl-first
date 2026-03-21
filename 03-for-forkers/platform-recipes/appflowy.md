# Platform Recipe: AppFlowy

> Arabize your AppFlowy fork — what's possible and what's not.

**Platform:** [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) — open-source Notion alternative
**Stars:** 60k+
**Framework:** Flutter (mobile/desktop) + Rust (backend + editor engine)
**i18n system:** Flutter's built-in localization (ARB files)
**Text editor:** Custom Rust-based editor (AppFlowy Editor)
**RTL difficulty:** Hard (editor is the blocker)
**Audit score:** 65/100 (C)

---

## Important Warning

AppFlowy is fundamentally different from Dify and Cal.com. It has a **custom rich text editor built in Rust** that does not currently support BiDi text. This means:

- You **can** arabize the UI shell (sidebar, menus, settings, buttons)
- You **cannot** get proper Arabic text editing without deep changes to the Rust editor engine
- Users will see an Arabic interface but typing Arabic in documents will have cursor, selection, and text flow issues

This is a Layer 1 problem — the deepest and hardest layer. Read the [Five Layers methodology](../../02-for-contributors/methodology.md) to understand why.

**If your use case is primarily document editing, AppFlowy is not a good arabization candidate today.** If your use case is project management (kanban, calendar, grid views), the UI arabization alone may be sufficient.

---

## What rtl-first Tools Can and Cannot Do Here

| Tool | Works? | Why |
|------|:------:|-----|
| `@rtl-first/audit` | ⚠️ Partial | Designed for JavaScript — limited detection on Flutter/Rust |
| `@rtl-first/direction-injector` | ❌ | Flutter uses a different direction mechanism |
| `@rtl-first/locale-scaffolder` | ❌ | Flutter uses ARB files, not JSON |
| `@rtl-first/codemod` | ❌ | Not applicable to Dart/Flutter CSS |
| `@rtl-first/patch-generator` | ❌ | Not applicable |
| `@rtl-first/arabize` | ❌ | Designed for JavaScript web apps |

**rtl-first tools are designed for JavaScript web applications.** AppFlowy's Flutter/Rust stack requires a different approach. This recipe is a manual guide.

---

## Manual Steps for UI Shell Arabization

### Step 1: Add Arabic Locale

AppFlowy uses Flutter ARB files for localization:

```
frontend/appflowy_flutter/
├── assets/
│   └── translations/
│       ├── en.json
│       ├── zh-CN.json
│       └── ar.json    ← Create this
```

Copy `en.json` → `ar.json` and translate the keys.

### Step 2: Register Arabic in App Config

In the Flutter app configuration, add Arabic as a supported locale:

```dart
// Add to supported locales
const Locale('ar'),
```

### Step 3: Set Text Direction

Flutter handles RTL direction via the `Directionality` widget:

```dart
Directionality(
  textDirection: TextDirection.rtl,
  child: MaterialApp(...),
)
```

Or use `MaterialApp`'s locale-aware direction which handles this automatically when Arabic is the active locale.

### Step 4: Fix Layout Issues

Flutter uses `EdgeInsets` which can be made directional:
- `EdgeInsets.only(left: 16)` → `EdgeInsetsDirectional.only(start: 16)`
- `Alignment.centerLeft` → `AlignmentDirectional.centerStart`
- `TextAlign.left` → `TextAlign.start`

Search the codebase for these patterns and convert them.

---

## The Editor Problem

AppFlowy's editor is built on a custom Rust-based engine. BiDi text support in a rich text editor requires:

- Correct cursor movement in mixed LTR/RTL text
- Proper text selection across direction boundaries
- Line breaking that respects BiDi algorithm (Unicode UAX #9)
- Input method editor (IME) integration for Arabic keyboard

This is months of specialized work in the Rust editor layer. It is not something that can be patched — it requires deep engine changes.

### Alternatives

If you need an Arabic document editor today:
1. **AFFiNE** — uses ProseMirror/BlockSuite, closer to BiDi support but still incomplete
2. **Notion-like editors** — ProseMirror and TipTap have partial BiDi support
3. **Google Docs API** — if you just need document output, consider integration

---

## RTL Audit Summary

| Layer | Status | Action |
|-------|--------|--------|
| 1 — Text Engine | ❌ No BiDi | Requires Rust editor changes (months) |
| 2 — Direction | ⚠️ | Flutter Directionality widget |
| 3 — CSS Layout | ⚠️ | EdgeInsetsDirectional conversion |
| 4 — Translations | ⚠️ → ✅ | ARB file + locale registration |
| 5 — Hardcoded | ⚠️ | Manual review |

**Estimated effort:**
- UI shell only: 3-5 days
- Editor BiDi support: weeks to months of Rust development

---

*Part of [rtl-first](https://github.com/imohad/rtl-first) — build for the world from day one.*
