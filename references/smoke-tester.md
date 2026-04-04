# Smoke Tester — Reference Detail

Detailed procedures, code snippets, and standards referenced by the smoke-tester agent.

## Auth Setup Code

Your spawn prompt specifies which auth profile to use and provides the file path. Load the profile's cookies, localStorage, and sessionStorage via:

```bash
playwright-cli -s={session} state-load ".playwright/profiles/{profile}.json"
```

- If no profile is specified in your spawn prompt, skip auth setup
- If the profile file does not exist, report this and continue without auth

## Action Mapping

Map workflow language to Playwright CLI commands:

| Workflow Language | Playwright CLI Command |
|---|---|
| "Navigate to /path" | `playwright-cli -s={session} goto "<url>"` |
| "Click [element]" | `playwright-cli -s={session} click <ref>` |
| "Type [text] into [field]" | `playwright-cli -s={session} fill <ref> "<text>"` |
| "Verify [element] is visible" | `playwright-cli -s={session} snapshot` + inspect |
| "Wait for [condition]" | Poll `playwright-cli -s={session} snapshot` in a loop |
| "Select [option] from [dropdown]" | `playwright-cli -s={session} select <ref> "<value>"` |

## Quality Standards

- Never skip a step -- execute every step in every workflow
- Always snapshot after actions to verify state
- On failure, capture the current page state and continue (do not abort)
- Keep the report concise -- one line per step, details only for failures
- Total execution should be fast -- do not add unnecessary waits or analysis

## No-Workflow Mode (Coverage Gaps)

When dispatched for a coverage-gap screen (your spawn prompt says "no workflow exists for this page"), skip the workflow parsing step. Instead:

1. Load the auth profile if specified (same Auth Setup process as above)
2. Navigate to the target URL provided in the spawn prompt
3. Perform a basic 5-point smoke check:
   a. Verify the page loads (no HTTP 500, no blank page, no infinite redirect)
   b. Take a snapshot via `playwright-cli -s={session} snapshot` and confirm content is rendered
   c. Check the console for JavaScript errors via `playwright-cli -s={session} console`
   d. If auth is required, verify you are not redirected to a login page
   e. Check that the page title is set and the DOM has meaningful content
4. Report: PASS if all checks pass, FAIL with details for any failure
5. Use the same output format as workflow mode (one-line summary table, details only for failures)

## Report Format Template

```
| Workflow | Step | Action | Result | Status |
|----------|------|--------|--------|--------|
| Login    | 1    | Navigate to /login | Login page loaded | PASS |
| Login    | 2    | Enter credentials | Form filled | PASS |
| Login    | 3    | Click Sign In | Redirected to /dashboard | FAIL |
```

- Include failure details: what was expected vs. what was observed
- End with a summary: total steps, passed, failed, pass rate
