# Auth Source of Truth

`playwright-profiles` is the canonical home for auth-only implementation:

- `skills/auth-browse/`
- `skills/capture-auth/`
- `skills/auth-browse/scripts/sign-in.mjs`
- `skills/auth-browse/scripts/cookie-analysis.mjs`
- auth/profile unit tests

`qa-skills` vendors those files so the full QA plugin can offer authenticated browsing alongside workflow generation, Playwright conversion, runners, and QA agents.

When changing shared auth behavior, update `playwright-profiles` first, verify it there, then vendor the same implementation into `qa-skills`.

Use:

```bash
scripts/sync-auth-from-playwright-profiles.sh /path/to/playwright-profiles
```

The sync script copies the canonical auth files and reapplies the one QA-specific wording patch in `skills/auth-browse/SKILL.md`, where `qa-skills` describes project profiles as Playwright CLI sessions rather than Playwright MCP sessions.
