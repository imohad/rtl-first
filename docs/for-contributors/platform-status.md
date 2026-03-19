# Platform RTL status

RTL readiness status of major open-source platforms. Updated as we run audits and contribute.

## Assessed platforms

| Platform | Stars | RTL score | Layer 1 | Layer 2 | Layer 3 | Layer 4 | Layer 5 | Notes |
|----------|-------|-----------|---------|---------|---------|---------|---------|-------|
| **AFFiNE** | 65k+ | — | ❌ blocksuite needs BiDi | ✅ Done (PR #14624) | ⚠️ Partial | ✅ ar.json 100% | ⚠️ Some hardcoded | Layer 1 blocks full RTL |
| **Dify** | 90k+ | *Pending* | ✅ No complex editor | ❌ | ❌ | ❌ | ❌ | Good candidate — no editor blocker |
| **AppFlowy** | 60k+ | *Pending* | ❌ Rust editor | ❌ | ❌ | ❌ | ❌ | Issue open since 2021 |
| **Cal.com** | 34k+ | *Pending* | ✅ No editor | ❌ | ❌ | ❌ | ❌ | Good candidate |
| **AnythingLLM** | 25k+ | *Pending* | ✅ No complex editor | ⚠️ Partial | ❌ | ⚠️ Partial | ❌ | Partially broken RTL |
| **NocoBase** | 15k+ | *Pending* | ✅ No editor | ❌ | ❌ | ❌ | ❌ | Issue open 2025 |

**Legend:**
- ✅ Done or not applicable
- ⚠️ Partial or needs work
- ❌ Missing or broken
- *Pending* = audit not yet run

## How to add a platform

1. Run `npx @rtl-first/audit` on the project
2. Open a PR adding a row to this table
3. Include the full audit report in the PR description

## Priority ranking

**Best candidates for contribution** (no Layer 1 blocker):
1. Dify — 90k+ stars, no editor, huge impact
2. Cal.com — 34k+ stars, clean architecture
3. NocoBase — 15k+ stars, active community

**Needs deeper work** (Layer 1 blocker):
4. AppFlowy — Rust editor needs BiDi
5. AFFiNE — blocksuite needs InlineEditor RTL
