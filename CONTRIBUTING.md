# Contributing to rtl-first

Thanks for your interest in making the web work for RTL languages.

## Ways to contribute

**Low effort, high impact:**
- Run `npx @rtl-first/audit` on a project you use and share the results
- Open an issue in that project with the audit report
- Fix typos or improve documentation

**Medium effort:**
- Add a new platform to the [platform status](docs/for-contributors/platform-status.md) tracker
- Write a case study about your RTL contribution experience
- Improve detection rules in rtl-audit

**High effort:**
- Build or improve tools in the `packages/` directory
- Contribute RTL support to a major open-source project using our methodology
- Add framework-specific guides (Vue, Angular, Svelte)

## Development setup

```bash
git clone https://github.com/imohad/rtl-first.git
cd rtl-first

# Work on rtl-audit
cd packages/rtl-audit
npm install
npm test
```

## Pull request guidelines

We practice what we preach. The same rules from our [PR guide](docs/for-contributors/pr-guide.md) apply here:

1. **Open an issue first** for anything beyond typo fixes
2. **One change per PR** — don't mix documentation updates with code changes
3. **Keep PRs small** — 1-5 files is ideal, 10+ files needs justification
4. **Branch from main** — not from your fork's stale branch
5. **Write descriptive commit messages** — `fix: improve Layer 3 CSS detection regex` not `update`

## Code style

- No external dependencies in rtl-audit (zero-dep is a feature)
- Node.js >= 18
- Use ES modules
- Write tests for new detection rules

## Reporting issues

When reporting a false positive or missed detection in rtl-audit, include:
- The command you ran
- The project you scanned (or a minimal reproduction)
- What you expected vs. what you got

## Code of conduct

Be respectful. We're building tools for global inclusion — let's practice inclusion in how we work together.
