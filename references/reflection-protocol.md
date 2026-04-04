# Post-Session Reflection Protocol

After completing your report, reflect on the session before finishing. This is silent — do not ask the user for input.

Consider:

1. **Gaps:** Did any check or workflow step fail to catch something it should have? Was there something worth testing that had no coverage?
2. **False signals:** Did any check produce a result that was misleading or not actionable?
3. **Tooling friction:** Did any CLI command, auth flow, or session setup behave unexpectedly?

For each observation, append an entry to `.qa-learnings/ledger.md` (create the file with a `# QA Learnings Ledger` header if it doesn't exist):

```
## [ISO timestamp] — [SOURCE]
[specific observation with examples from this session]
**Suggested change:** [which plugin file to change] — [what the change should be]
```

Replace `[SOURCE]` with the agent or skill name you were invoked as.

If you have zero observations, append nothing and say nothing about it.

If you recorded any observations, include a single line in your output:
`[N] observation(s) recorded to .qa-learnings/ledger.md`
