# Contributing to rtl-first

Thank you for your interest in contributing to rtl-first. Every contribution helps make RTL support better for 400 million Arabic speakers and millions more who use Hebrew, Persian, and Urdu.

## Ways to Contribute

### Report Issues
- Found a bug in one of the tools? Open an issue.
- Tool didn't detect your framework? Open an issue with your `package.json` (redact private info).
- CSS codemod missed a pattern? Show us the input and expected output.

### Add Platform Recipes
Tested rtl-first on a platform not in our list? Add a recipe:
1. Fork the repo
2. Create `03-for-forkers/platform-recipes/platform-name.md`
3. Document what worked, what didn't, and any platform-specific quirks
4. Submit a PR

### Improve Tools
- Add support for a new framework in `direction-injector`
- Add support for a new i18n library in `locale-scaffolder`
- Improve CSS pattern matching in `codemod`
- Fix edge cases in `patch-generator`

### Improve Documentation
- Fix typos or unclear explanations
- Add examples from your own RTL contribution experience
- Translate documentation (while keeping English as the primary language)

## Development Setup

```bash
git clone https://github.com/imohad/rtl-first.git
cd rtl-first

# Each tool is independent — cd into the one you're working on
cd 04-tools/direction-injector
node bin/cli.js --help

# Run on a test project
node bin/cli.js /path/to/test-project --dry-run
```

## Code Guidelines

- **Zero dependencies.** All tools must work with Node.js only. No npm install required for users.
- **Idempotent.** Running a tool twice should produce the same result.
- **Dry run first.** Every tool must support `--dry-run` to preview changes.
- **JSON output.** Every tool must support `--json` for programmatic use.
- **Clear reports.** Output should tell the user exactly what changed and what to do next.

## PR Guidelines

- One logical change per PR
- Include a clear description of what and why
- Test on at least one real project before submitting
- Update the relevant README if you add a feature

## Code of Conduct

Be respectful. Be constructive. We're all here to make software work better for RTL languages.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
