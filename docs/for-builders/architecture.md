# Building RTL-first from day one

If you're starting a new project and want it to work for RTL languages from the beginning, this guide is for you. It's much easier to build RTL-first than to retrofit it later.

## The three rules

1. **Use CSS logical properties everywhere.** Never write `margin-left` — write `margin-inline-start`. This single habit eliminates most RTL layout issues.

2. **Set up i18n infrastructure on day one.** Even if you only support English at launch, use translation keys from the start. Adding a language later is trivial if the infrastructure exists. Adding the infrastructure later means touching every component.

3. **Test with `dir="rtl"` early.** Add `dir="rtl"` to your root element during development and look at the result. If your layout breaks, fix it now — not after 200 components are built.

## Recommended i18n setup

### React (with i18next)

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// Update document direction when language changes
i18n.on('languageChanged', (lang) => {
  const dir = RTL_LANGUAGES.some(rtl => lang.startsWith(rtl)) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
});

export default i18n;
```

### CSS logical properties cheat sheet

```css
/* Instead of this:          Write this: */
margin-left: 16px;          margin-inline-start: 16px;
margin-right: 16px;         margin-inline-end: 16px;
padding-left: 8px;          padding-inline-start: 8px;
padding-right: 8px;         padding-inline-end: 8px;
border-left: 1px solid;     border-inline-start: 1px solid;
left: 0;                    inset-inline-start: 0;
right: 0;                   inset-inline-end: 0;
text-align: left;           text-align: start;
text-align: right;          text-align: end;
```

### ESLint rule (recommended)

Consider using `eslint-plugin-logical-properties` or writing a custom rule that warns on physical CSS properties. Catching these in development is far cheaper than running a codemod later.

## Choosing a text editor

If your project needs rich-text editing, check BiDi support before choosing a library:

| Editor | BiDi support | Notes |
|--------|-------------|-------|
| ProseMirror | Configurable | Needs explicit BiDi configuration |
| CodeMirror 6 | Good | Built-in BiDi support |
| Slate | Partial | Depends on implementation |
| Quill | Limited | Older BiDi handling |
| TipTap | Configurable | Built on ProseMirror |
| Monaco | Good | VS Code's editor, solid BiDi |

If BiDi support matters for your use case, choose CodeMirror 6 or configure ProseMirror explicitly. Don't assume it works — test with Arabic text input.

## Pre-launch checklist

→ See [checklist.md](checklist.md) for the full 20-point list.
