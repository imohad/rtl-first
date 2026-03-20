# @rtl-first/translation-kit

Find missing translation keys and generate ready-to-translate files. Part of the [rtl-first](https://github.com/imohad/rtl-first) framework.

## Usage

```bash
# Auto-detect locale files in a project
npx @rtl-first/translation-kit ./my-project

# Compare specific locale files
npx @rtl-first/translation-kit --source en.json --target ar.json

# Compare locale folders (Next.js / Dify style)
npx @rtl-first/translation-kit --source i18n/en-US --target i18n/ar-TN

# Export missing keys as JSON (ready for translators)
npx @rtl-first/translation-kit --source en.json --target ar.json --output missing.json
```

## What it does

1. **Compares locale files** — finds keys in the source that are missing in the target
2. **Supports nested JSON** — flattens keys with dot-notation for accurate comparison
3. **Supports folder-based locales** — compares `en-US/*.json` vs `ar-TN/*.json` file by file
4. **Auto-detects i18n structure** — scans a project and finds locale files automatically
5. **Exports missing keys** — generates a JSON file with source values, ready for translation

## Output

```
Translation Gap Report
──────────────────────────

Source: en-US
Target: ar-TN

Total keys:   4,865
Translated:   4,803
Missing:      62
Coverage:     98.7%

Files with gaps:
  ███████████████░  common.json (38 missing)
  ██████████████░░  workflow.json (11 missing)
  ██████████████░░  plugin.json (8 missing)
  ███████████████░  app-debug.json (5 missing)

Sample missing keys:
  − common.operation.search.find_and_replace_in_page [common.json]
    "Find and Replace in Page"
  − workflow.nodes.parameterExtractor.extractParameters [workflow.json]
    "Extract Parameters"
```

## Export for translators

```bash
npx @rtl-first/translation-kit \
  --source i18n/en-US \
  --target i18n/ar-TN \
  --output missing-keys.json
```

This generates a `missing-keys.json` file with the source text, ready to hand off to a translator:

```json
{
  "common": {
    "operation": {
      "search": {
        "find_and_replace_in_page": "Find and Replace in Page"
      }
    }
  }
}
```

## Zero dependencies

Node.js >= 18 only.

## License

MIT
