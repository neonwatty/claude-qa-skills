# QA Skills Validation System

> Acceptance criteria and quality gates across workflow generators, executors, and converters.

## Problem

The QA workflow skills (generators, runners, converters) need validation at every layer. Without it, the LLM is both producer and judge of its own work, leading to incomplete output and easily-accepted subpar results:

- **Generators** can produce structurally malformed workflows — broken numbering, missing metadata, vague verifications, placeholder text
- **Runners** can claim pass/fail based on subjective visual inspection with no hard evidence
- **Converters** can emit code that doesn't compile

## Terminology

| Term | Meaning |
|------|---------|
| **exists** | Element is present in the DOM |
| **visible** | Element has CSS display/visibility/opacity allowing rendering, and has non-zero dimensions |
| **in-viewport** | Element's bounding rect intersects the browser viewport (on-screen) |

## Architecture

Validation uses three mechanisms: a **validation subagent** that owns all check definitions and runs independently of generators, **programmatic scripts** for deterministic checks, and **prompt-level instructions** in each skill's SKILL.md for execution-time behavior. Validation reports are written to a separate `validation-report.md` alongside workflow files.

```
Validation Subagent              Runner SKILL.md              Converter SKILL.md
┌──────────────────────┐     ┌──────────────────────┐    ┌─────────────────────┐
│ Mechanical Checks    │     │ DOM Assertions       │    │ tsc --noEmit        │
│ (via script)         │     │ Viewport Checks      │    │ 3-attempt fix loop  │
│ Judgment Checks      │     │ Visual Inspection    │    │ Semantic guard      │
│ Route Coverage       │     │ Fail-fast/Thorough   │    │                     │
│ CRUD Gap Detect      │     │ Shadow DOM detect    │    │                     │
│ Validation Table     │     │ Cross-origin detect  │    │                     │
│ (via script)         │     │ State-based waits    │    │                     │
└──────────────────────┘     └──────────────────────┘    └─────────────────────┘
```

Three validation layers, one per skill type. **Layers are independent** — failures in one layer do not block others. The user decides whether to proceed when upstream validation has failed.

| Layer | Skill Type | What It Validates | How |
|-------|-----------|-------------------|-----|
| Generation | Validation Subagent | Structural correctness + completeness | Programmatic mechanical checks, judgment observations, coverage gap detection |
| Execution | Runner | Behavioral verification | DOM assertions via `browser_evaluate`, visual inspection, viewport checks |
| Compilation | Converters | Type safety | `npx tsc --noEmit` with fix loop and semantic guard |

---

## Layer 1: Generator Validation

**Owner:** Validation subagent — a dedicated agent that runs independently of the generator, analyzing generated workflow files after production. This separates the assessor from the producer.

**Files:**
- `agents/validation-subagent.md` (check definitions, single source of truth)
- Analyzes output from: `skills/desktop-workflow-generator/SKILL.md`, `skills/mobile-workflow-generator/SKILL.md`, `skills/multi-user-workflow-generator/SKILL.md`

### Mechanical Checks

Ten deterministic pass/fail checks implemented as a **programmatic script** (not LLM self-assessment). The script runs via Bash after the generator writes workflow files:

| # | Check | Why It Matters |
|---|-------|----------------|
| 1 | Every workflow has complete metadata (auth, priority, estimated-steps) | Converters need metadata to generate test config |
| 2 | Every workflow has >= 3 steps | Fewer than 3 steps isn't testing a real flow |
| 3 | Every workflow has >= 1 Verify step | Without verification it's navigation, not a test |
| 4 | No more than 5 consecutive actions without a Verify | Long action chains without checkpoints are untestable |
| 5 | Step numbering is sequential — no gaps, no duplicates | Broken numbering produces wrong test structure |
| 6 | All actions use recognized verbs (see Recognized Verbs below) | Unknown verbs can't be mapped to Playwright calls |
| 7 | No placeholder text (TODO, TBD, FIXME, [placeholder]) | Placeholders = incomplete work shipped as done |
| 8 | Auth-required workflows have auth preconditions | Missing auth precondition = test fails at setup |
| 9 | Quick Reference row count matches workflow heading count (print both) | Mismatch = internally inconsistent document |
| 10 | Action targets reference an element by visible text, label, ARIA role, or test-id — not generic terms like "the button" or "the field" | Vague targets produce ambiguous selectors |
| 11 | Max 30% of Verify steps are visibility-only (hard gate) | High visibility-only percentage signals shallow verification |

Multi-user generators add:

| 12 | Every step has a persona tag `[User X]` | Missing persona = can't assign to browser context |
| 13 | Every mutation is followed within N steps by a cross-user Verify (default N=3, configurable per-workflow or per-section) | Missing sync defeats multi-user testing purpose |
| 14 | At least 1 User B Verify step per workflow | Ensures cross-user coverage exists |

When mechanical check #4 and destructive-action coverage (below) both apply, the **stricter rule wins** — destructive actions always require a Verify within 2 steps regardless of the general 5-step window.

### Recognized Verbs

Navigate, Click, Type, Select, Check, Uncheck, Toggle, Upload, Download, Drag, Drop, Hover, Scroll, Pause, Clear, Submit, Dismiss, Confirm, Refresh, Verify

> **Note:** "Pause" is the workflow verb for user-visible wait steps. Internal timing mechanisms use `browser_wait_for` — these are distinct concepts.

### Judgment Checks

Five quality checks the validation subagent presents as observations for the user to confirm — not self-assessed verdicts:

| # | Check | What to Report |
|---|-------|----------------|
| 1 | No copy-paste verifications | Flag if same text appears verbatim in 3+ workflows, with count |
| 2 | Verify steps with substance | Count of total Verify steps vs visibility-only (mechanical check #11 enforces the 30% gate; this reports the full breakdown) |
| 3 | Edge case differentiation | Per edge-case workflow: one sentence on what makes it genuinely different |
| 4 | Destructive action coverage | Every delete/remove/publish/submit has a Verify within 2 steps |
| 5 | No duplicate step sequences | No two workflows share identical step sequences |

Multi-user adds:

| 6 | Cross-user verification depth | Count of User B's Verify steps per workflow (mechanical check #14 enforces the >= 1 floor) |

### Validation Table

Every validation run produces a `validation-report.md` file alongside the workflow files. The table is generated **programmatically by script** (not self-reported by the generator LLM):

```
| Workflow | Steps | Verify Steps | Verify-Only-Visible | Max Action Streak | Placeholders | Targets Specific |
| 1. User Login | 8 | 3 | 0 | 2 | 0 | yes |
| 2. Dashboard  | 12 | 4 | 1 | 3 | 0 | yes |
Totals: [T] Verify steps, [V] visibility-only ([P]%)
```

### Route Coverage Gap Detection

Runs after journey list confirmation:

1. Collect all routes discovered by the Routes & Navigation explore agent
2. Cross-reference against the app's route config file(s) or sitemap to catch routes the Explore agent may have missed (dynamic routes, feature-flagged routes, role-gated routes)
3. Collect all Navigate targets from the confirmed journey list
4. Present any uncovered routes to the user, who can: add a journey, mark as intentionally unvisited, or update the Application Map

### CRUD Entity Gap Suggestions

Immediately after route coverage:

1. Collect entities and CRUD operations from the explore agents using a structured output format:
   ```
   | Entity | Create | Read | Update | Delete | State Transitions |
   | User   | yes    | yes  | yes    | no     | activate, suspend  |
   ```
2. Check whether confirmed journeys cover create, read, update, delete, and state transitions
3. Present uncovered operations as natural-language suggestions (not matrices)

### Runner Feedback Loop

When the runner (Layer 2) discovers issues at execution time — ambiguous selectors, missing auth preconditions, un-navigable steps — it produces a `runner-feedback.md` report. The validation subagent consults this report on subsequent generator runs to inform its checks.

---

## Layer 2: Runner Validation

**Location:** Step execution loop in the runner.

**File:** `skills/playwright-runner/SKILL.md`

### Two Rigor Modes

| Aspect | Thorough (default) | Fail-fast |
|--------|-------------------|-----------|
| DOM assertions | Every Verify step | None |
| `browser_wait_for` | Conditional — resolves when expected state appears, 2-3s max timeout | None |
| Viewport intersection | Checks visible-on-screen vs exists-in-DOM (distinguishes "never rendered" from "scrolled out of view") | Not checked |
| Failure behavior | Continue, record evidence | Stop on first failure |
| What it checks | Full QA verification with DOM assertions | Navigation-only — confirms pages load and routes resolve |
| Report format | X passed, Y failed out of N workflows | X passed, Y failed, Z skipped (not attempted) |

### DOM Assertion Pattern

For every Verify step in thorough mode:

```
1. Execute preceding action (navigate, click, type, etc.)
2. browser_wait_for — conditional wait, 2-3s max timeout
   For text-based checks: wait for expected text to appear
   For state-based checks: browser_evaluate polling for attribute/state (disabled, checked, aria-expanded)
3. browser_snapshot — capture accessibility tree
4. Visual inspection — LLM reads snapshot for expected outcome
5. browser_evaluate — DOM assertion via element ref:
   → { exists, visible, inViewport, text, tagName }
6. Record pass/fail with evidence metadata
   If step 4 and step 5 conflict: DOM wins for pass/fail determination, discrepancy is flagged for human review
```

**In-viewport refinement:** The `inViewport` check distinguishes between "never rendered" (element not in DOM or has zero dimensions — failure) and "rendered but scrolled out of view" (element exists with dimensions but bounding rect is outside viewport — not a failure if the user just interacted with it).

### Action Mapping Rules

| Action | Tool | Notes |
|--------|------|-------|
| Refresh | `browser_navigate` to same URL | NOT `location.reload()` — that destroys execution context |
| Scroll to element | `browser_evaluate` with `element.scrollIntoView()` via ref | NOT fabricated CSS selectors |

### Fallback Handling

| Situation | Detection | Behavior |
|-----------|-----------|----------|
| Shadow DOM element | Pre-assertion `browser_evaluate` check: `element.getRootNode() instanceof ShadowRoot` | Flag `dom_check: "text may be inaccurate — shadow DOM element"`, fall back to visual |
| Cross-origin iframe | Pre-assertion `browser_evaluate` check: walk `element.ownerDocument` ancestry for cross-origin frames | Flag `dom_check: "unavailable — iframe context"`, fall back to visual |
| `browser_evaluate` failure (JS error, timeout, stale ref) | Caught at invocation | Fall back to visual, log failure reason in evidence metadata |
| Visual/DOM conflict | Step 4 vs step 5 disagreement | DOM wins for pass/fail; report discrepancy with both results for user review |

### Runner Evidence Log

The validation subagent audits runner output to verify DOM assertions were actually attempted. The runner must produce a structured log per Verify step showing:
- Whether DOM assertion or visual fallback was used
- Reason for fallback (if applicable)
- Both visual and DOM results when both are available

---

## Layer 3: Converter Validation

**Location:** After all test files are written.

**Files:**
- `skills/desktop-workflow-to-playwright/SKILL.md`
- `skills/mobile-workflow-to-playwright/SKILL.md`
- `skills/multi-user-workflow-to-playwright/SKILL.md`

**Prerequisite:** `tsc` must be available. If not installed, the converter installs it or fails with a clear message. Type-checking is not optional.

### Type-Check Process

```bash
# 1. Install dependencies (capture errors for diagnosis)
cd e2e/[platform] && npm install --ignore-scripts 2>&1 | tee /tmp/npm-install.log

# 2. Type-check generated code
cd e2e/[platform] && npx tsc --noEmit
```

Catches missing imports, incorrect Playwright API usage, type mismatches, and selector type errors before tests ever run.

### Error Handling

- Read `tsc` error output, identify file and line, fix the generated code
- After each fix attempt, **write modified files back to disk** before the next `tsc` run
- Re-run `tsc --noEmit` to confirm
- **3-attempt cap** (counted per full `tsc` run): if errors persist after 3 runs, **stop and ask the user** via AskUserQuestion, presenting the remaining errors and waiting for guidance
- **Semantic guard:** the fix loop must NOT modify assertions, selectors, or test intent. Fixes are limited to type annotations, imports, and API usage corrections. If a fix would change what the test checks, escalate to the user instead

---

## Shared Workflow Format Schema

A `docs/workflow-format.md` spec defines the contract between generators and converters:

- Required markdown structure (headings, step format, metadata comments)
- Metadata comment syntax (`<!-- auth: required -->`, `<!-- priority: core -->`, `<!-- estimated-steps: N -->`)
- Step format: `N. Verb target — detail`
- Verify step format and recognized assertion types
- Quick Reference table format
- Multi-user persona tag format

Both generators and converters reference this spec as the canonical format definition.

---

## End-to-End Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: SETUP                                                      │
│                                                                     │
│  /setup-profiles                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Check Playwright MCP configured                           │  │
│  │ 2. Check for existing .playwright/profiles.json              │  │
│  │ 3. Collect per-role: name, login URL, email, password, desc  │  │
│  │ 4. Write profiles.json (gitignored — contains credentials)   │  │
│  │ 5. Update .gitignore (profiles.json + profiles/)             │  │
│  │ 6. Interactive login loop → capture storageState per role     │  │
│  │ 7. Update CLAUDE.md with profile docs                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Outputs:                                                           │
│    .playwright/profiles.json ─── role metadata + credentials        │
│    .playwright/profiles/<role>.json ─── storageState (per role)     │
│    .gitignore updated                                               │
│    CLAUDE.md updated                                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│ GATE CHECK (in skill)   │   │ GATE CHECK (validation subagent)     │
│                         │   │                                      │
│ Before auth phase:      │   │ Post-hoc precondition check:         │
│ 1. profiles.json exists?│   │ 1. profiles.json exists?             │
│ 2. storageState files?  │   │ 2. storageState files present?       │
│ 3. Session expired?     │   │ 3. createdAt > 7 days ago?           │
│    (createdAt > 7 days) │   │ 4. Credentials populated?            │
│                         │   │                                      │
│ If missing/expired:     │   │ Reports warnings for drift/expiry    │
│ → prompt /setup-profiles│   │ even if skill gate was passed         │
└────────────┬────────────┘   └──────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: GENERATE WORKFLOWS                                         │
│                                                                     │
│  desktop-workflow-generator / mobile / multi-user                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Explore codebase (parallel agents)                        │  │
│  │ 2. Confirm journey list + route coverage check               │  │
│  │ 3. CRUD entity gap suggestions                               │  │
│  │ 4. Load profile → interactive walkthrough via Playwright     │  │
│  │ 5. Write workflow markdown files                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Outputs:                                                           │
│    docs/workflows/desktop-workflows.md (or mobile / multi-user)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: VALIDATE WORKFLOWS (Layer 1)                               │
│                                                                     │
│  Validation subagent (independent of generator)                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Run mechanical checks via script                          │  │
│  │ 2. Generate validation table programmatically                │  │
│  │ 3. Present judgment checks to user                           │  │
│  │ 4. Write validation-report.md                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Outputs:                                                           │
│    validation-report.md (alongside workflow files)                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌──────────────────────────┐  ┌──────────────────────────────────────┐
│ STAGE 4a: RUN WORKFLOWS  │  │ STAGE 4b: CONVERT TO PLAYWRIGHT     │
│ (Layer 2)                │  │ (Layer 3)                            │
│                          │  │                                      │
│ playwright-runner        │  │ desktop/mobile/multi-user converter  │
│ ┌──────────────────────┐ │  │ ┌──────────────────────────────────┐ │
│ │ 1. Load profile      │ │  │ │ 1. Read workflow markdown        │ │
│ │ 2. Execute steps     │ │  │ │ 2. Read profiles.json for creds  │ │
│ │    (thorough or      │ │  │ │ 3. Generate auth.setup.ts with   │ │
│ │     fail-fast)       │ │  │ │    email/password from profiles  │ │
│ │ 3. DOM assertions    │ │  │ │ 4. Generate test files           │ │
│ │ 4. Evidence log      │ │  │ │ 5. tsc --noEmit (required)       │ │
│ │ 5. Runner feedback   │ │  │ │ 6. Semantic-guarded fix loop     │ │
│ └──────────────────────┘ │  │ └──────────────────────────────────┘ │
│                          │  │                                      │
│ Outputs:                 │  │ Outputs:                             │
│   execution-report.md    │  │   e2e/[platform]/tests/*.spec.ts    │
│   runner-feedback.md     │  │   e2e/[platform]/auth.setup.ts      │
│   evidence log           │  │   playwright.config.ts              │
│                          │  │   .github/workflows/e2e.yml         │
└──────────────────────────┘  └──────────────────────────────────────┘

Layers are independent — 4a and 4b can run in either order or in parallel.
User decides whether to proceed when upstream validation has failed.
```

### Profile Data Flow

```
/setup-profiles
      │
      ├─► .playwright/profiles.json (gitignored)
      │     ├── role name, loginUrl, description, createdAt
      │     └── email, password (test credentials)
      │
      └─► .playwright/profiles/<role>.json (gitignored)
            └── cookies, origins (localStorage), sessionStorage
                │
                ├──► Generators: load storageState for interactive walkthrough
                ├──► Runner: load storageState for execution
                └──► Converters: read email/password from profiles.json
                     → embed in auth.setup.ts for CI
                     → CI uses GitHub Secrets as override (TEST_EMAIL, TEST_PASSWORD)
```

---

## Design Principles

| Principle | How It's Applied |
|-----------|-----------------|
| Separate assessor from producer | Validation subagent runs independently of generators; programmatic checks replace self-assessment |
| Mechanical checks are actually mechanical | Deterministic checks run as scripts via Bash, not LLM prompt evaluation |
| Evidence over assertion | Validation table generated by script, DOM checks with structured results, type-check with compiler output, stderr captured not suppressed |
| User is the quality gate | Judgment checks surface observations; the user makes the final call. Escalation = stop and ask |
| Explicit contracts | Shared workflow format schema, structured Explore agent output, defined terminology |
| Independent layers | Each layer runs independently; upstream failure does not block downstream. User decides whether to proceed |
| Full-document validation | Mechanical checks always validate the entire document, even in Update mode |

---

## Considered and Deferred

| Approach | Why Deferred |
|----------|-------------|
| Persistent QA ledger (`.qa-state.json`) | Duplicates TaskList session recovery; creates coupling between independent skills |
| Screenshot baselines with pixelmatch | False-positive rate too high for LLM-driven sessions (timing, data, rendering variance) |
| 4-tier rigor profiles (smoke/UX-audit/deep-audit/adversarial) | 2 modes (fail-fast/thorough) cover the practical use cases; time budgets are unenforceable in an LLM context |
| Quality scoring rubric (0-100 per dimension) | No consumer for the scores; the judgment checklist surfaces the same quality concerns conversationally |

> **Removed from deferred:** Validation subagent and Node.js validation library are now part of the design. The smoke-tester agent is deprecated in favor of the runner's fail-fast mode.
