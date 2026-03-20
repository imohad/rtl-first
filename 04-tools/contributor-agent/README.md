# @rtl-first/contributor-agent

AI-powered agent that generates contribution plans, GitHub issue templates, and PR descriptions from RTL audit results. Part of the [rtl-first](https://github.com/imohad/rtl-first) framework.

## How it works

1. Run `@rtl-first/audit` on a project to get a JSON report
2. Feed the report to `@rtl-first/contributor-agent`
3. Get a ready-to-use issue template, ordered PR descriptions, and a week-by-week strategy

## Usage

```bash
# Step 1: Audit the project
npx @rtl-first/audit ./dify --format json > dify-audit.json

# Step 2: Generate contribution plan
npx @rtl-first/contributor-agent dify-audit.json

# Step 3: Export as files (issue + PR descriptions)
npx @rtl-first/contributor-agent dify-audit.json --output ./contribution-plan
```

## Two modes

### Template mode (default, no API key needed)

Uses built-in templates to generate structured issue and PR descriptions. Works offline, instant results.

### AI mode (with Claude API key)

Set `ANTHROPIC_API_KEY` or pass `--api-key` to get an AI-enhanced strategy recommendation on top of the templates.

```bash
ANTHROPIC_API_KEY=sk-ant-... npx @rtl-first/contributor-agent dify-audit.json
```

## What it generates

### GitHub Issue

A complete issue body with:
- RTL audit summary table
- What's working vs what needs improvement
- Specific numbers (CSS properties, missing keys, hardcoded strings)
- Contribution proposal asking maintainers for alignment
- Suggested priority order

### PR Descriptions (ordered by priority)

1. **Translations** — complete missing Arabic keys (safest, always welcome)
2. **Hardcoded strings** — replace with i18n keys (small PRs, build trust)
3. **CSS codemod** — submit script, not changed files (reviewable)
4. **Direction logic** — add `dir="rtl"` and DirectionProvider (architectural)

Each PR includes: title, body, risk level, and affected files.

### Week-by-week Strategy

```
Now      Open an issue with the audit report
Week 1   Complete Arabic translations
Week 1   Fix hardcoded strings (3-5 files per PR)
Week 2   Submit CSS codemod as a script
Week 3   Add direction detection
```

## Output formats

```bash
# Terminal (default)
npx @rtl-first/contributor-agent audit.json

# JSON
npx @rtl-first/contributor-agent audit.json --format json

# Export files
npx @rtl-first/contributor-agent audit.json --output ./plan
# Creates: ISSUE.md, PR-1-*.md, PR-2-*.md, ..., plan.json
```

## Zero dependencies

No external dependencies. Claude API is optional (for AI-enhanced mode only).

## License

MIT
