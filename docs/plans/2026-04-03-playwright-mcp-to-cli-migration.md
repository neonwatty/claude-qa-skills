# Migration Plan: Playwright MCP → Playwright CLI

**Date:** 2026-04-03
**Scope:** Migrate all QA skills from `mcp__playwright__*` MCP tools to `playwright-cli -s={session}` Bash commands
**Goal:** Enable parallel subagent dispatch — each agent gets an isolated named browser session

---

## Executive Summary

The QA skills plugin currently uses the Playwright MCP server (`mcp__playwright__*`) for all browser interaction. All agents share a single MCP server and browser instance, forcing **sequential dispatch** in `run-qa`. By migrating to `@playwright/cli` with named sessions (`-s=name`), each agent gets an isolated browser context. This unlocks **true parallel dispatch** — the single biggest architectural win.

### What Changes

| Before (MCP) | After (CLI) |
|---|---|
| `mcp__playwright__browser_navigate url=X` | `playwright-cli -s={session} goto "X"` via Bash |
| `mcp__playwright__browser_snapshot` | `playwright-cli -s={session} snapshot` via Bash |
| `mcp__playwright__browser_click ref=X` | `playwright-cli -s={session} click X` via Bash |
| `mcp__playwright__browser_type ref=X text=Y` | `playwright-cli -s={session} fill X "Y"` via Bash |
| `mcp__playwright__browser_evaluate ref=X function=F` | `playwright-cli -s={session} eval "F" X` via Bash |
| `mcp__playwright__browser_run_code` (auth restore) | `playwright-cli -s={session} state-load FILE` via Bash |
| `mcp__playwright__browser_take_screenshot` | `playwright-cli -s={session} screenshot` via Bash |
| `mcp__playwright__browser_resize w=393 h=852` | `playwright-cli -s={session} resize 393 852` via Bash |
| `mcp__playwright__browser_wait_for text=X` | `playwright-cli -s={session} snapshot` + check output via Bash |
| `mcp__playwright__browser_press_key key=X` | `playwright-cli -s={session} press X` via Bash |
| `mcp__playwright__browser_select_option ref=X values=[Y]` | `playwright-cli -s={session} select X "Y"` via Bash |
| `mcp__playwright__browser_hover ref=X` | `playwright-cli -s={session} hover X` via Bash |
| `mcp__playwright__browser_drag startRef=X endRef=Y` | `playwright-cli -s={session} drag X Y` via Bash |
| `mcp__playwright__browser_fill_form` | `playwright-cli -s={session} fill REF "VAL"` per field via Bash |
| `mcp__playwright__browser_file_upload paths=[X]` | `playwright-cli -s={session} upload "X"` via Bash |
| `mcp__playwright__browser_handle_dialog accept=true` | `playwright-cli -s={session} dialog-accept` via Bash |
| `mcp__playwright__browser_navigate_back` | `playwright-cli -s={session} go-back` via Bash |
| `mcp__playwright__browser_console_messages` | `playwright-cli -s={session} console` via Bash |
| `mcp__playwright__browser_tabs action=list` | `playwright-cli -s={session} tab-list` via Bash |
| `mcp__playwright__browser_tabs action=new` | `playwright-cli -s={session} tab-new` via Bash |
| `mcp__playwright__browser_tabs action=select index=N` | `playwright-cli -s={session} tab-select N` via Bash |
| `mcp__playwright__browser_close` | `playwright-cli -s={session} close` via Bash |
| `allowed-tools: mcp__playwright__*` | `allowed-tools: Bash` (if not already present) |
| Sequential agent dispatch (shared browser) | **Parallel agent dispatch (isolated sessions)** |
| Multi-user via tabs in one browser | Multi-user via **separate named sessions** |
| Auth via `browser_run_code` + inline JS | Auth via `state-load <profile>.json` |

### What Does NOT Change

- Workflow markdown format (no changes to `/workflows/*.md`)
- Validation scripts (`scripts/validate-workflows.sh`)
- Converter skills (desktop/mobile/multi-user-workflow-to-playwright) — these generate Playwright test code, not MCP calls
- Reference files (`references/action-mapping.md`, `references/selector-discovery.md`) — these document Playwright API code for converters
- Agent definition files (`agents/*.md`) — these have no `allowed-tools` in frontmatter
- Auth profile JSON format (`.playwright/profiles/*.json`)
- The `adversarial-audit`, `resilience-audit`, `keyword-wedge`, and `trust-builder` skills

---

## Session Naming Convention

Every skill and agent gets a deterministic session name:

| Context | Session Name Pattern | Example |
|---|---|---|
| playwright-runner (desktop) | `runner-desktop` | `playwright-cli -s=runner-desktop` |
| playwright-runner (mobile) | `runner-mobile` | `playwright-cli -s=runner-mobile` |
| playwright-runner (multi-user, per persona) | `runner-{persona}` | `playwright-cli -s=runner-admin` |
| desktop-workflow-generator (walkthrough) | `gen-desktop` | `playwright-cli -s=gen-desktop` |
| mobile-workflow-generator (walkthrough) | `gen-mobile` | `playwright-cli -s=gen-mobile` |
| multi-user-workflow-generator (per persona) | `gen-{persona}` | `playwright-cli -s=gen-admin` |
| setup-profiles | `setup-profiles` | `playwright-cli -s=setup-profiles` |
| run-qa smoke-tester agent | `qa-smoke` | `playwright-cli -s=qa-smoke` |
| run-qa ux-auditor agent | `qa-ux` | `playwright-cli -s=qa-ux` |
| run-qa mobile-ux-auditor agent | `qa-mobile` | `playwright-cli -s=qa-mobile` |
| run-qa performance-profiler agent | `qa-perf` | `playwright-cli -s=qa-perf` |
| run-qa adversarial-breaker agent | `qa-adversarial` | `playwright-cli -s=qa-adversarial` |
| run-qa session validation (pre-flight) | `qa-preflight` | `playwright-cli -s=qa-preflight` |

---

## File-by-File Migration

### Tier 1: Heavy MCP Usage (core browser interaction)

---

#### 1. `skills/playwright-runner/SKILL.md` (1265 lines)

**Impact:** HIGHEST — this is the primary execution engine. Every MCP tool reference must become a CLI command.

**Changes:**

1. **Frontmatter** (line 4):
   ```
   # Before
   allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, mcp__playwright__*

   # After
   allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
   ```

2. **Session lifecycle** — add to Phase 1 after base URL is determined:
   ```
   playwright-cli -s=runner-{platform} open "{base_url}"
   ```
   At end of Phase 4 (report):
   ```
   playwright-cli -s=runner-{platform} close
   ```

3. **Action Mapping Reference table** (lines 733–827) — rewrite entirely. This is the heart of the skill. Replace all `mcp__playwright__browser_X` references with CLI equivalents:

   **Navigation:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Navigate to [URL] | `playwright-cli -s={session} goto "{base_url}{URL}"` |
   | Go back | `playwright-cli -s={session} go-back` |
   | Refresh the page | `playwright-cli -s={session} reload` |

   **Click/Input:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Click the "[label]" button | `playwright-cli -s={session} snapshot` → find ref → `playwright-cli -s={session} click {ref}` |
   | Type "[text]" in field | `playwright-cli -s={session} snapshot` → find ref → `playwright-cli -s={session} fill {ref} "{text}"` |
   | Type "[text]" and press Enter | `playwright-cli -s={session} fill {ref} "{text}"` then `playwright-cli -s={session} press Enter` |
   | Select "[option]" from dropdown | `playwright-cli -s={session} select {ref} "{option}"` |
   | Check/Uncheck checkbox | `playwright-cli -s={session} check {ref}` / `playwright-cli -s={session} uncheck {ref}` |

   **Mouse/Keyboard:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Hover over element | `playwright-cli -s={session} hover {ref}` |
   | Drag source to target | `playwright-cli -s={session} drag {source-ref} {target-ref}` |
   | Press [Key] | `playwright-cli -s={session} press {Key}` |
   | Scroll to element | `playwright-cli -s={session} eval "(el) => el.scrollIntoView({behavior:'smooth',block:'center'})" {ref}` |

   **Verification:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Verify element visible | `playwright-cli -s={session} snapshot` → check output |
   | Verify text appears | `playwright-cli -s={session} snapshot` → check output for text |
   | Verify URL contains path | `playwright-cli -s={session} eval "() => window.location.href"` → check result |
   | DOM assertion with ref | `playwright-cli -s={session} eval "(el) => { ... }" {ref}` |

   **Wait:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Wait for text to appear | Poll: `playwright-cli -s={session} snapshot` in a retry loop (max 3s) checking for text |
   | Wait for text to disappear | Poll: `playwright-cli -s={session} snapshot` in a retry loop checking text is gone |
   | Wait N seconds | `sleep N` |

   **Screenshots/Debug:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Take a screenshot | `playwright-cli -s={session} screenshot` |
   | Capture page state | `playwright-cli -s={session} snapshot` |
   | Check console errors | `playwright-cli -s={session} console error` |

   **File Upload:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Upload file | `playwright-cli -s={session} upload "{absolute-path}"` |

   **Dialog Handling:**
   | Workflow Language | CLI Command (via Bash) |
   |---|---|
   | Accept dialog | `playwright-cli -s={session} dialog-accept` |
   | Dismiss dialog | `playwright-cli -s={session} dialog-dismiss` |

4. **Snapshot-First Execution Pattern** (lines 1200–1252) — update the pattern description:
   ```
   PATTERN: Snapshot -> Find -> Act -> Verify

   1. SNAPSHOT: Run `playwright-cli -s={session} snapshot` via Bash.
      The snapshot returns YAML with all visible elements and their refs.

   2. FIND: Search the snapshot output for the target element.
      Match by: visible text, role, label, placeholder, or test ID.
      Extract the element's ref value (e.g., "e12").

   3. ACT: Run the appropriate CLI command with the ref via Bash.
      Example: `playwright-cli -s={session} click e12`

   4. VERIFY: Run `playwright-cli -s={session} snapshot` again.
      Check the updated output for expected outcome.
   ```

5. **Auth loading** (lines 235–258) — replace `browser_run_code` with:
   ```
   playwright-cli -s={session} state-load ".playwright/profiles/{profile}.json"
   playwright-cli -s={session} goto "{base_url}"
   ```
   Then verify with snapshot (expiry detection stays the same logic).

6. **Multi-user execution** (lines 1053–1118) — **MAJOR CHANGE**: Replace tab-based persona switching with separate named sessions:
   ```
   # Before (MCP): one browser, multiple tabs
   browser_tabs action="select" index=[admin_tab_index]

   # After (CLI): separate sessions per persona
   playwright-cli -s=runner-admin goto "{base_url}/admin/users"
   playwright-cli -s=runner-user goto "{base_url}/posts"
   ```
   Each persona gets its own session opened in Phase 2:
   ```
   playwright-cli -s=runner-admin open "{base_url}"
   playwright-cli -s=runner-admin state-load ".playwright/profiles/admin.json"

   playwright-cli -s=runner-user open "{base_url}"
   playwright-cli -s=runner-user state-load ".playwright/profiles/user.json"
   ```
   Cross-persona verification uses the persona's own session — no tab switching needed.

7. **Mobile viewport** (lines 1017–1050) — replace `browser_resize`:
   ```
   playwright-cli -s=runner-mobile resize 393 852
   ```

8. **Constraints section** (line 1257) — replace:
   ```
   # Before
   - **MCP tools only** -- This skill uses Playwright MCP tools (`mcp__playwright__*`)...

   # After
   - **CLI via Bash only** -- This skill uses `playwright-cli` commands via the Bash tool
     for all browser interaction. Every browser action is a Bash call to
     `playwright-cli -s={session} <command>`. It does NOT use MCP tools, generate
     Playwright code, or use `npx playwright test`.
   ```

9. **`browser_wait_for` replacement** — The CLI has no direct `wait_for` equivalent. Replace with a polling pattern:
   ```bash
   # Wait for text "Success" to appear (max 3 seconds, poll every 500ms)
   for i in 1 2 3 4 5 6; do
     OUTPUT=$(playwright-cli -s={session} snapshot --raw 2>&1)
     if echo "$OUTPUT" | grep -q "Success"; then break; fi
     sleep 0.5
   done
   ```
   Document this as a standard pattern in the skill.

10. **`browser_evaluate` with ref replacement** — CLI `eval` supports element targeting:
    ```bash
    playwright-cli -s={session} eval "(element) => {
      if (!element) return { exists: false };
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        exists: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        inViewport: rect.top < window.innerHeight && rect.bottom > 0,
        text: element.textContent?.trim().substring(0, 200)
      };
    }" {ref}
    ```

##### Test Plan: playwright-runner

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T1.1 | Session open + navigate | Start fresh | `playwright-cli -s=test-runner open "https://example.com"` | Session listed, page loads |
| T1.2 | Snapshot → click → snapshot loop | T1.1 done | `snapshot` → find "Learn more" ref → `click {ref}` → `snapshot` | Navigates to IANA page, new snapshot shows IANA content |
| T1.3 | Fill text in field | Open a form page (e.g., httpbin.org/forms/post) | `snapshot` → find field ref → `fill {ref} "test"` → `snapshot` | Field shows entered text |
| T1.4 | Eval with element ref | Any page | `eval "(el) => ({tag: el.tagName, text: el.textContent?.trim()})" {ref}` | Returns JSON with tag and text |
| T1.5 | Screenshot | Any page | `screenshot` | PNG file created in `.playwright-cli/` |
| T1.6 | Mobile viewport | Any page | `resize 393 852` → `snapshot` | Snapshot reflects mobile layout |
| T1.7 | Console errors | Any page | `console error` | Returns error list (or empty) |
| T1.8 | Keyboard press | Form page | `press Tab` | Focus moves to next field (verify via snapshot) |
| T1.9 | Wait-by-polling pattern | SPA page with async load | Poll `snapshot` in loop, check for text | Text found within timeout |
| T1.10 | Dialog handling | Page with alert | `dialog-accept` | Dialog dismissed, page continues |
| T1.11 | Multi-user: separate sessions | Two sessions | Open `-s=runner-admin` and `-s=runner-user`, navigate each to different URLs | Each session has correct URL, no cross-contamination |
| T1.12 | Auth via state-load | Profile JSON exists | `state-load ".playwright/profiles/admin.json"` → `goto` → `snapshot` | Page loads authenticated content, not login |
| T1.13 | Session cleanup | Sessions open | `close` on individual session | Session removed from `list` |
| T1.14 | Go-back navigation | After navigating 2 pages | `go-back` | Returns to previous URL |
| T1.15 | Reload | On a page | `reload` | Page refreshes (verify via snapshot timestamp or content) |

---

#### 2. `commands/run-qa.md` (1220 lines)

**Impact:** HIGH — this is the orchestrator. The migration enables the key architectural win: parallel dispatch.

**Changes:**

1. **Frontmatter** (line 3):
   ```
   # Before
   allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, mcp__playwright__*

   # After
   allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion
   ```

2. **Phase 3 session validation** (lines 312–329) — replace `browser_run_code` with CLI:
   ```
   # Before: load cookies via browser_run_code, navigate, check redirect
   # After:
   playwright-cli -s=qa-preflight open "{base_url}"
   playwright-cli -s=qa-preflight state-load ".playwright/profiles/{profile}.json"
   playwright-cli -s=qa-preflight goto "{base_url}"
   playwright-cli -s=qa-preflight snapshot
   # Check output for login redirect / login UI
   playwright-cli -s=qa-preflight close
   ```

3. **Phase 4: dispatch strategy** (lines 766–788) — **THE BIG CHANGE**. Replace sequential dispatch with parallel:
   ```
   # Before:
   # "Spawn agents sequentially, not in parallel. All agents share the same
   #  Playwright MCP server..."

   # After:
   # Spawn agents IN PARALLEL. Each agent gets its own named session via
   # playwright-cli -s={agent-name}. Sessions are fully isolated — there is
   # no shared browser state.
   #
   # For a typical 35-screen app running `all`, dispatch 5 agents concurrently:
   #   -s=qa-smoke, -s=qa-ux, -s=qa-mobile, -s=qa-perf, -s=qa-adversarial
   #
   # Each agent opens its own session, loads its own auth profile, and
   # operates independently. No browser state clearing between agents.
   ```

4. **Agent spawn templates** (lines 494–763) — replace all inline `browser_run_code` auth JS with CLI:

   Replace this pattern (appears 6 times):
   ```
   To load the auth profile, read the storageState file and run:
     async (page) => {
       const state = <contents of .playwright/profiles/[profile-name].json>;
       await page.context().addCookies(state.cookies);
       ...
     }
   ```

   With:
   ```
   To load the auth profile:
     playwright-cli -s={session} state-load ".playwright/profiles/{profile}.json"

   After loading, verify auth:
     playwright-cli -s={session} goto "{base_url}"
     playwright-cli -s={session} snapshot
     # If snapshot shows login UI or URL is loginUrl, session expired — report and stop.
   ```

   Add session name to each template:
   - Smoke-tester template: `Session name: qa-smoke`
   - UX-auditor template: `Session name: qa-ux`
   - Mobile-ux-auditor template: `Session name: qa-mobile`
   - Performance-profiler template: `Session name: qa-perf`
   - Adversarial-breaker template: `Session name: qa-adversarial`

5. **Mobile-ux-auditor template** — replace `browser_resize`:
   ```
   # Before
   IMPORTANT: Set mobile viewport before inspection:
     browser_resize width=393 height=852

   # After
   IMPORTANT: Set mobile viewport before inspection:
     playwright-cli -s=qa-mobile resize 393 852
   ```

6. **Browser state clearing** (lines 771–781) — **REMOVE ENTIRELY**. With separate sessions, there's no shared state to clear. Each agent opens fresh and closes when done.

7. **Screenshots** — replace `browser_take_screenshot`:
   ```
   playwright-cli -s={session} screenshot
   # Screenshot saved to .playwright-cli/page-{timestamp}.png
   # Copy to ./qa-reports/screenshots/{agent}-{screen}-{timestamp}.png
   ```

8. **Cleanup** — add to end of Phase 5:
   ```
   # After all agents complete and report is generated:
   playwright-cli close-all
   ```

##### Test Plan: run-qa

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T2.1 | Parallel session isolation | None | Open 5 sessions (`qa-smoke`, `qa-ux`, `qa-mobile`, `qa-perf`, `qa-adversarial`) simultaneously, set unique cookies in each | Each session sees only its own cookies |
| T2.2 | Auth state-load in template | Profile JSON exists | `state-load` in each session → `goto` → `snapshot` | Each session authenticated independently |
| T2.3 | Pre-flight session validation | Profile JSON exists | Open `qa-preflight`, `state-load`, `goto`, check snapshot, `close` | Detects valid/expired sessions correctly |
| T2.4 | Concurrent navigation | 5 sessions open | Navigate all 5 to different URLs concurrently | Each resolves to correct URL |
| T2.5 | Close-all cleanup | 5 sessions open | `playwright-cli close-all` | All sessions gone, `list` shows empty |
| T2.6 | Mobile viewport in parallel | `qa-mobile` session open | `resize 393 852` while `qa-ux` is at default viewport | Each session has its own viewport |
| T2.7 | Session naming collision | None | Try to open two sessions with same name | Second call reuses existing session (no crash) |

---

#### 3. `commands/setup-profiles.md` (191 lines)

**Impact:** MEDIUM — interactive flow, needs headed browser for user login.

**Changes:**

1. **Frontmatter** (line 3):
   ```
   # Before
   allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion,
     mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot,
     mcp__playwright__browser_run_code, mcp__playwright__browser_close

   # After
   allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
   ```

2. **Step 1: MCP configuration check** (lines 12–27) — **REPLACE ENTIRELY**. No longer need MCP server. Replace with:
   ```
   ## Step 1: Check CLI Installation

   Verify that @playwright/cli is installed:
     playwright-cli --version

   If not installed:
     npm install -g @playwright/cli@latest
     playwright-cli install
   ```

3. **Step 6: Interactive auth loop** (lines 96–158) — replace MCP calls:

   **Opening browser** (line 101):
   ```
   # Before: browser_navigate to loginUrl (headed by default)
   # After:
   playwright-cli -s=setup-profiles open "{loginUrl}"
   # Note: playwright-cli runs headless by default. For interactive login,
   # the user must manually open the URL in their browser and complete login,
   # then we capture state from a headed session. Alternatively, if headed
   # mode is needed, check for a --headed flag or instruct the user.
   ```

   The CLI supports `--headed` mode. Use it for interactive login:
   ```
   playwright-cli -s=setup-profiles open --headed "{loginUrl}"
   ```
   This opens a visible browser window where the user can log in manually.

4. **Capture storageState** (lines 104–137) — replace `browser_run_code`:
   ```
   # Before: browser_run_code to call page.context().storageState()
   # After:
   playwright-cli -s=setup-profiles state-save ".playwright/profiles/{role}.json"
   ```
   Then capture sessionStorage separately:
   ```
   playwright-cli -s=setup-profiles eval "() => Object.entries(sessionStorage).map(([name, value]) => ({name, value}))"
   ```
   Merge the sessionStorage result into the saved JSON file using the Write tool.

5. **Clear state between profiles** (lines 142–157):
   ```
   # Before: browser_run_code to clear cookies/localStorage/sessionStorage
   # After:
   playwright-cli -s=setup-profiles delete-data
   playwright-cli -s=setup-profiles goto "{next_loginUrl}"
   ```

6. **Close browser** (line 160):
   ```
   # Before: browser_close
   # After:
   playwright-cli -s=setup-profiles close
   ```

7. **Step 7: Update CLAUDE.md** (lines 162–183) — update the suggested CLAUDE.md content:
   ```
   # Before: "To load a profile, use browser_run_code to restore cookies via addCookies()..."
   # After: "To load a profile, use `playwright-cli -s={session} state-load .playwright/profiles/{role}.json`"
   ```

##### Test Plan: setup-profiles

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T3.1 | CLI install check | CLI installed | `playwright-cli --version` | Returns version string |
| T3.2 | Open session | None | `playwright-cli -s=setup-profiles open "https://example.com"` | Session created, page loads |
| T3.3 | State-save format | Session with cookies set | `state-save "test-state.json"` | JSON with `cookies` and `origins` arrays |
| T3.4 | State-save + manual sessionStorage merge | Session with sessionStorage | `state-save` then `eval "() => Object.entries(sessionStorage)..."` | Both files produced, mergeable |
| T3.5 | Delete-data between profiles | Session with cookies/localStorage | `delete-data` → `cookie-list` → `localstorage-list` | Both empty |
| T3.6 | Close session | Session open | `close` | Session gone from `list` |
| T3.7 | Headed mode check | None | `playwright-cli open --help` | Determine if `--headed` flag exists |
| T3.8 | Full round-trip | State saved to JSON | `state-load` in new session → `goto` → `snapshot` | Auth restored correctly |

---

#### 4. `skills/use-profiles/SKILL.md` (104 lines)

**Impact:** MEDIUM — auth loading is the primary function.

**Changes:**

1. **Loading a Profile** (lines 47–78) — replace `browser_run_code` with:
   ```
   ## Loading a Profile

   Before navigating to any authenticated page, load the profile:

   1. Verify the storageState file exists at `.playwright/profiles/<role-name>.json`.

   2. Load the profile into the current session:
      ```
      playwright-cli -s={session} state-load ".playwright/profiles/{role-name}.json"
      ```

   3. If the profile includes a `sessionStorage` field (not part of standard
      storageState), restore it separately after navigating:
      ```
      playwright-cli -s={session} goto "{origin}"
      playwright-cli -s={session} eval "(items) => {
        for (const {name, value} of items) sessionStorage.setItem(name, value);
      }" --arg '{sessionStorage JSON}'
      ```
      Note: If `playwright-cli eval` does not support `--arg`, write a temporary
      JS snippet and use `run-code` or inline the data.

   4. Navigate to the target page. Cookies and localStorage are already set.
   ```

2. **Session Expiry Detection** (lines 82–93) — replace `browser_snapshot`:
   ```
   After loading a profile and navigating:

   1. Run `playwright-cli -s={session} snapshot` via Bash
   2. Check the snapshot output for:
      a. URL redirect to loginUrl
      b. Login-related elements (sign-in forms, "Log in" buttons)
   3. If expired, inform the user to run /setup-profiles
   ```

3. **Remove MCP reference** (line 53): Delete "(MCP tool: `mcp__playwright__browser_run_code`)"

##### Test Plan: use-profiles

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T4.1 | state-load restores cookies | Profile JSON with cookies | `state-load` → `cookie-list` | Cookies present |
| T4.2 | state-load restores localStorage | Profile JSON with origins | `state-load` → `goto origin` → `localstorage-list` | localStorage items present |
| T4.3 | sessionStorage restore via eval | Profile JSON with sessionStorage field | `eval` with sessionStorage items → `sessionstorage-list` | sessionStorage items present |
| T4.4 | Expiry detection — redirect | Expired session, loginUrl set | `state-load` → `goto base_url` → check URL | URL matches loginUrl |
| T4.5 | Expiry detection — login UI | Expired session | `state-load` → `goto` → `snapshot` | Snapshot contains login form elements |
| T4.6 | Valid session | Fresh profile | `state-load` → `goto` → `snapshot` | Snapshot shows authenticated content |

---

### Tier 2: Light MCP Usage (walkthrough phases)

These skills use MCP tools only during their live walkthrough phase (Phase 3 in each). The walkthrough is interactive — the skill navigates the app and presents screenshots to the user.

---

#### 5. `skills/desktop-workflow-generator/SKILL.md`

**Impact:** LOW — only 8 MCP references, all in walkthrough phase.

**Changes:**

Replace walkthrough-phase MCP calls:
```
# Before                                    # After
browser_navigate to the first route    →    playwright-cli -s=gen-desktop goto "{url}"
browser_take_screenshot               →    playwright-cli -s=gen-desktop screenshot
browser_click for clicks              →    playwright-cli -s=gen-desktop click {ref}
browser_snapshot for page state       →    playwright-cli -s=gen-desktop snapshot
```

Add session lifecycle:
```
# Start of walkthrough phase:
playwright-cli -s=gen-desktop open "{base_url}"

# End of walkthrough phase:
playwright-cli -s=gen-desktop close
```

##### Test Plan: desktop-workflow-generator

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T5.1 | Walkthrough navigation | Session open | `goto URL` → `snapshot` | Page content in snapshot |
| T5.2 | Screenshot capture | On a page | `screenshot` | PNG file created |
| T5.3 | Interactive click | On a page with links | `snapshot` → `click {ref}` → `snapshot` | Navigation occurs |
| T5.4 | Session cleanup | Session open | `close` | Session removed |

---

#### 6. `skills/mobile-workflow-generator/SKILL.md`

**Impact:** LOW — 9 MCP references, same as desktop + viewport resize.

**Changes:** Same as desktop-workflow-generator, plus:
```
# Mobile viewport (before any walkthrough step):
playwright-cli -s=gen-mobile resize 393 852
```

##### Test Plan: mobile-workflow-generator

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T6.1 | Mobile viewport set | Session open | `resize 393 852` → `snapshot` | Snapshot reflects mobile layout |
| T6.2 | Screenshot at mobile | Viewport set | `screenshot` | PNG at mobile dimensions |
| T6.3 | Navigation + snapshot | Viewport set | `goto URL` → `snapshot` | Mobile content visible |

---

#### 7. `skills/multi-user-workflow-generator/SKILL.md`

**Impact:** LOW-MEDIUM — 9 MCP references, plus auth via `browser_run_code`.

**Changes:** Same as desktop-workflow-generator, plus:
- Replace `browser_run_code` auth restoration with `state-load`
- Use separate sessions per persona during walkthrough:
  ```
  playwright-cli -s=gen-admin open "{base_url}"
  playwright-cli -s=gen-admin state-load ".playwright/profiles/admin.json"

  playwright-cli -s=gen-user open "{base_url}"
  playwright-cli -s=gen-user state-load ".playwright/profiles/user.json"
  ```

##### Test Plan: multi-user-workflow-generator

| # | Test | Setup | Command | Expected |
|---|------|-------|---------|----------|
| T7.1 | Per-persona sessions | Profile JSONs exist | Open 2 sessions, `state-load` each | Each session has correct auth |
| T7.2 | Cross-persona isolation | Both sessions open | Navigate admin to /admin, user to /home | Each sees correct page |
| T7.3 | Screenshot per persona | Both sessions open | `screenshot` in each | Separate PNG files |

---

### Tier 3: No MCP References (no changes needed)

These files are confirmed to have zero Playwright MCP references:

- `skills/desktop-workflow-to-playwright/SKILL.md` — generates Playwright API code, not MCP calls
- `skills/mobile-workflow-to-playwright/SKILL.md` — same
- `skills/multi-user-workflow-to-playwright/SKILL.md` — same
- `skills/adversarial-audit/SKILL.md` — codebase analysis only
- `skills/resilience-audit/SKILL.md` — codebase analysis only
- `skills/keyword-wedge/SKILL.md` — SEO analysis only
- `skills/trust-builder/SKILL.md` — codebase analysis only
- `references/action-mapping.md` — documents Playwright API (for converters), not MCP
- `references/selector-discovery.md` — selector strategy reference
- `agents/*.md` — no `allowed-tools` in frontmatter, receive tools from spawn template
- `scripts/validate-workflows.sh` — deterministic markdown validation

---

## Cross-Cutting Concerns

### 1. `browser_wait_for` Replacement

The CLI has no `wait_for` command. All skills that use `browser_wait_for` must adopt a polling pattern. Define this once in `playwright-runner` and reference it from other skills:

```bash
# Standard wait-for-text pattern (paste into Bash tool)
TIMEOUT=3; INTERVAL=0.5; TEXT="expected text"
for i in $(seq 1 $(echo "$TIMEOUT / $INTERVAL" | bc)); do
  if playwright-cli -s={session} snapshot --raw 2>&1 | grep -q "$TEXT"; then
    echo "FOUND"; break
  fi
  sleep $INTERVAL
done
```

For `textGone` (wait for text to disappear), invert the grep: `grep -q` → `! grep -q`.

### 2. `browser_run_code` Replacement

`browser_run_code` accepted arbitrary async JS functions with page access. The CLI equivalent is `eval` for page-context JS, or `run-code` for Playwright-level code. The key use cases:

| MCP `browser_run_code` Use Case | CLI Replacement |
|---|---|
| `page.context().storageState()` | `state-save <file>` |
| `page.context().addCookies(...)` | `state-load <file>` |
| `page.evaluate(() => localStorage.setItem(...))` | `localstorage-set <key> <value>` |
| `page.evaluate(() => sessionStorage.setItem(...))` | `sessionstorage-set <key> <value>` |
| `page.context().clearCookies()` | `delete-data` |
| `page.evaluate(() => localStorage.clear())` | `localstorage-clear` |
| Custom DOM assertions | `eval "<function>" [element]` |

### 3. `browser_fill_form` Replacement

MCP's `browser_fill_form` filled multiple fields at once. The CLI has no batch equivalent. Replace with sequential `fill` calls:

```bash
playwright-cli -s={session} fill {email-ref} "user@example.com"
playwright-cli -s={session} fill {password-ref} "password123"
playwright-cli -s={session} check {remember-ref}
```

### 4. Multi-User Architecture Change

The most significant behavioral change. MCP used tabs in a single browser; CLI uses separate named sessions.

**Benefits:**
- True isolation (no cookie/localStorage leakage between personas)
- Each persona can be driven by a separate subagent in parallel
- No tab-index bookkeeping

**Breaking change to document:**
- `browser_tabs action="select" index=N` → switch to using the persona's session name
- Tab management commands (`tab-list`, `tab-new`, `tab-select`) are still available within a single session for multi-tab workflows, but persona switching uses session names

### 5. Output Parsing

MCP tools returned structured JSON. CLI commands return markdown-formatted output. Skills that parse MCP tool results must parse CLI output instead:

- **Snapshot:** Returns YAML in a markdown code block with `ref=eN` attributes — same format as MCP
- **Eval:** Returns the JS result in a `### Result` section
- **Screenshot:** Returns a markdown link to the saved file
- **Cookie/storage commands:** Return formatted text

For machine-readable output, use the `--raw` flag:
```bash
playwright-cli -s={session} snapshot --raw
playwright-cli -s={session} eval "() => document.title" --raw
```

### 6. `.playwright-cli/` Directory

The CLI writes snapshots, screenshots, console logs, and videos to `.playwright-cli/` in the working directory. Add to `.gitignore`:
```
.playwright-cli/
```

### 7. CLI Installation Prerequisite

Add to the plugin's setup documentation:
```bash
npm install -g @playwright/cli@latest
playwright-cli install
```

The `playwright-cli install` command initializes the workspace and detects available browsers.

---

## Migration Order

Execute in this order to minimize risk:

| Phase | Files | Rationale |
|---|---|---|
| 1 | `use-profiles/SKILL.md` | Smallest, most self-contained. Validates `state-load` works as auth mechanism. |
| 2 | `setup-profiles.md` | Depends on Phase 1 pattern. Test headed mode support. |
| 3 | `playwright-runner/SKILL.md` | The core engine. Largest change. Validates entire CLI surface area. |
| 4 | `desktop-workflow-generator/SKILL.md` | Light changes, validates walkthrough pattern. |
| 5 | `mobile-workflow-generator/SKILL.md` | Validates viewport + walkthrough. |
| 6 | `multi-user-workflow-generator/SKILL.md` | Validates multi-session persona pattern. |
| 7 | `run-qa.md` | Last — depends on all other patterns being validated. Enables parallel dispatch. |

---

## Resolved Questions

1. **Headed mode for setup-profiles**: ✅ RESOLVED. `playwright-cli open` supports `--headed` flag. Use `playwright-cli -s=setup-profiles open --headed "{loginUrl}"` for interactive login.

2. **`--raw` flag**: ✅ RESOLVED. The global `--raw` flag outputs only the result value without status/code decoration. Available on all commands. `snapshot` also supports `--filename` to save to a file and `--depth` to limit tree depth.

3. **Concurrent session limit**: ~1GB RAM per session. Recommend 16GB for full 5-agent parallel dispatch, 8GB for 3 concurrent. Document in plugin README.

4. **`eval` with arguments**: ✅ RESOLVED. `eval` accepts `<func> [element]` where element is a ref from snapshot. The function signature is `(element) => { ... }` when element is provided. For sessionStorage restoration without element refs, use the dedicated `sessionstorage-set <key> <value>` command instead.

5. **Session reuse on crash**: Yes — each skill should run `playwright-cli list` on startup and close any stale sessions with its naming pattern. Add `playwright-cli close-all` as a safety net at the end of every skill/command. `kill-all` is available for zombie processes.
