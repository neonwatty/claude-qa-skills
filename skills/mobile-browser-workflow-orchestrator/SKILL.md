---
name: mobile-browser-workflow-orchestrator
description: Orchestrates the full mobile browser workflow pipeline - generates, executes, and converts mobile workflows to Playwright tests. Use this when the user says "generate and execute mobile workflows", "run mobile workflow pipeline", "mobile browser test pipeline", or "test mobile experience". Manages configuration (URL, credentials, device), chains generator→executor→converter with approval gates between phases.
---

# Mobile Browser Workflow Orchestrator

## Purpose

Orchestrates the complete mobile browser workflow pipeline by chaining three specialized skills:
1. **mobile-browser-workflow-generator** - Generates workflows
2. **mobile-browser-workflow-executor** - Executes and audits workflows
3. **mobile-browser-workflow-to-playwright** - Converts to Playwright tests

This is a **thin orchestration layer** that manages configuration, sequencing, and approval gates. It does NOT duplicate the logic of sub-skills.

## When to Use

Use this skill when the user requests:
- "Generate and execute mobile workflows"
- "Run mobile workflow pipeline"
- "Mobile browser test pipeline"
- "Test mobile experience end-to-end"
- "Full mobile workflow automation"

## Pipeline Architecture

```
Phase 0: Configuration Management
         ↓
Phase 1: Generate Workflows (mobile-browser-workflow-generator)
         ↓ [approval gate]
Phase 2: Execute Workflows (mobile-browser-workflow-executor)
         ↓ [approval gate]
Phase 3: Convert to Playwright (mobile-browser-workflow-to-playwright)
         ↓
Phase 4: Summary Report
```

## Task List Integration

The orchestrator creates a hierarchical task list:

```
- [ ] Mobile Browser Workflow Pipeline
  - [ ] Phase 0: Configuration Management
  - [ ] Phase 1: Generate Workflows
  - [ ] Phase 2: Execute Workflows
  - [ ] Phase 3: Convert to Playwright
  - [ ] Phase 4: Summary Report
```

Use the Task tool to:
- Create the main pipeline task at start
- Mark phases complete as they finish
- Enable session recovery (resume from incomplete phase)

## Session Recovery

If the conversation is interrupted:
1. Read task list state
2. Identify last completed phase
3. Ask user if they want to resume from next incomplete phase
4. Load configuration from `/workflows/mobile-config.json`
5. Continue pipeline from recovery point

## Phase 0: Configuration Management

### Objective
Establish or confirm the configuration for all pipeline phases.

### Process

1. **Check for existing configuration**
   - Look for `/workflows/mobile-config.json`
   - If exists: read and display to user

2. **Configuration confirmation**
   - Use AskUserQuestion to confirm existing config or request changes
   - Example: "I found existing configuration:\n- URL: https://linkparty.app\n- Environment: production\n- Username: testuser@example.com\n- Device: iPhone 15 Pro\n- Execution Engine: playwright\n\nDo you want to use this configuration or update it?"

3. **Collect missing configuration**
   If no config exists or user wants to update, ask for:
   - **App URL**: Local (http://localhost:3000), staging, or production URL
   - **Environment**: production, staging, development
   - **Test credentials**: Username and password for login flows
   - **Device**: Recommend iPhone 15 Pro (393×852) or offer alternatives
   - **Execution engine**: Playwright (recommended) or Claude-in-Chrome

4. **Write configuration file**
   - Save to `/workflows/mobile-config.json`
   - Validate all required fields are present

### Configuration Schema

```json
{
  "url": "https://example.com",
  "environment": "production",
  "credentials": {
    "username": "testuser@example.com",
    "password": "testpass123"
  },
  "device": {
    "name": "iPhone 15 Pro",
    "width": 393,
    "height": 852,
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  },
  "executionEngine": "playwright"
}
```

### Device Presets

**iPhone 15 Pro** (recommended):
- Width: 393, Height: 852
- User Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15

**iPhone SE**:
- Width: 375, Height: 667
- User Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15

**Samsung Galaxy S24**:
- Width: 360, Height: 800
- User Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile

### Outputs
- `/workflows/mobile-config.json` created/updated
- Configuration values confirmed with user

---

## Phase 1: Generate Workflows

### Objective
Generate mobile-optimized workflows using the mobile-browser-workflow-generator skill.

### Process

Follow the **mobile-browser-workflow-generator** skill's complete process:

1. **Exploration** (Task tool delegates this phase)
   - Navigate to config URL in mobile viewport
   - Identify 5-8 critical user journeys
   - Map mobile-specific interactions (tap, swipe, touch)

2. **Workflow Generation**
   - Create structured workflows with:
     - Title, priority, type (CRUD/Authentication/Navigation)
     - Step-by-step instructions
     - Success criteria
     - Edge cases

3. **User Review & Approval**
   - Present generated workflows
   - User confirms workflows are comprehensive
   - **Approval gate**: Ask "Ready to proceed to execution phase?"

### Outputs
- `/workflows/mobile-browser-workflows.md` (5-8 workflows)
- Task: Mark "Phase 1: Generate Workflows" complete

### Approval Gate
Before proceeding to Phase 2, explicitly ask:
> "I've generated [N] mobile workflows. Ready to proceed to the execution phase?"

Wait for user confirmation.

---

## Phase 2: Execute Workflows

### Objective
Execute workflows, audit for issues, optionally fix problems, generate visual report.

### Process

Follow the **mobile-browser-workflow-executor** skill's complete process:

1. **Setup**
   - Load config from `/workflows/mobile-config.json`
   - Use configured execution engine (Playwright or Claude-in-Chrome)
   - Set mobile viewport from config

2. **Authentication** (if needed)
   - Login using credentials from config
   - Verify logged-in state before workflows

3. **Workflow Execution** (Task tool delegates this phase)
   - Execute each workflow from `/workflows/mobile-browser-workflows.md`
   - Capture screenshots at key steps
   - Record success/failure for each workflow

4. **UX Audit** (Task tool delegates this phase)
   - Analyze for mobile usability issues:
     - Touch target sizes (<44×44 pixels)
     - Text readability (<16px font)
     - Horizontal scrolling
     - Input field accessibility
     - Navigation clarity

5. **Present Findings**
   - Summarize execution results
   - List UX issues by severity (Critical/High/Medium/Low)
   - Ask if user wants fixes applied

6. **Optional: Fix Issues** (Task tool delegates this phase)
   - If user approves, apply fixes to codebase
   - Re-test affected workflows
   - Document fixes applied

7. **Generate Report**
   - Create HTML report with device frames around screenshots
   - Include workflow results, audit findings, fixes (if applied)

### Outputs
- Screenshots: `/workflows/screenshots/*.png`
- HTML Report: `/workflows/mobile-workflow-report.html`
- Findings: Embedded in report
- Task: Mark "Phase 2: Execute Workflows" complete

### Approval Gate
Before proceeding to Phase 3, explicitly ask:
> "Execution complete. Found [N] issues ([Critical/High/Medium/Low]). Ready to convert workflows to Playwright tests?"

Wait for user confirmation.

---

## Phase 3: Convert to Playwright

### Objective
Generate CI-ready Playwright mobile tests from executed workflows.

### Process

Follow the **mobile-browser-workflow-to-playwright** skill's complete process:

1. **Analysis** (Task tool delegates this phase)
   - Read `/workflows/mobile-browser-workflows.md`
   - Read `/workflows/mobile-config.json`
   - Map workflows to Playwright test structure

2. **Test Generation**
   - Generate `e2e/mobile-browser-workflows.spec.ts`
   - Include:
     - Mobile device configuration
     - Fixtures for authentication
     - Test suite with all workflows
     - Mobile-specific assertions
     - Screenshot capture on failure

3. **Test Configuration**
   - Update `playwright.config.ts` with mobile project
   - Add iPhone 15 Pro device preset
   - Configure CI-compatible settings

4. **Documentation**
   - Generate `e2e/README.md` with:
     - Setup instructions
     - How to run tests
     - CI/CD integration guide
     - Troubleshooting

### Outputs
- `/e2e/mobile-browser-workflows.spec.ts`
- `/playwright.config.ts` (updated or created)
- `/e2e/README.md`
- Task: Mark "Phase 3: Convert to Playwright" complete

---

## Phase 4: Summary Report

### Objective
Present a comprehensive summary of the entire pipeline.

### Process

1. **Read task list state**
   - Verify all phases completed
   - Collect metrics from each phase

2. **Generate summary**
   - **Workflows Generated**: Count from Phase 1
   - **Workflows Executed**: Success/failure count from Phase 2
   - **Issues Found**: Categorized by severity from Phase 2
   - **Issues Fixed**: Count (if fixes applied in Phase 2)
   - **Tests Created**: Count from Phase 3

3. **List artifacts**
   - `/workflows/mobile-config.json` - Configuration
   - `/workflows/mobile-browser-workflows.md` - Workflow definitions
   - `/workflows/screenshots/*.png` - Execution screenshots
   - `/workflows/mobile-workflow-report.html` - Visual report
   - `/e2e/mobile-browser-workflows.spec.ts` - Playwright tests
   - `/e2e/README.md` - Test documentation

4. **Next steps**
   - Suggest running Playwright tests: `npx playwright test --project=mobile`
   - Recommend CI integration
   - Offer to re-run pipeline with different configuration

### Output Format

```
Mobile Browser Workflow Pipeline - Complete

WORKFLOWS:
  Generated: 7 workflows
  Executed: 7/7 successful

AUDIT FINDINGS:
  Critical: 0
  High: 2 (touch targets too small)
  Medium: 3 (font size issues)
  Low: 1 (color contrast)

FIXES APPLIED:
  2 issues fixed in /src/components/MobileNav.tsx

PLAYWRIGHT TESTS:
  7 tests generated in /e2e/mobile-browser-workflows.spec.ts

ARTIFACTS:
  ✓ /workflows/mobile-config.json
  ✓ /workflows/mobile-browser-workflows.md
  ✓ /workflows/screenshots/*.png (14 screenshots)
  ✓ /workflows/mobile-workflow-report.html
  ✓ /e2e/mobile-browser-workflows.spec.ts
  ✓ /e2e/README.md

NEXT STEPS:
  1. Run tests: npx playwright test --project=mobile
  2. View report: open /workflows/mobile-workflow-report.html
  3. Add to CI: See /e2e/README.md for GitHub Actions setup
```

---

## Error Handling

### Configuration Errors
- Missing required fields → Re-prompt user for values
- Invalid URL format → Validate and ask for correction
- Unreachable URL → Warn user, offer to continue with alternative

### Phase Failures
- **Phase 1 fails**: Cannot access URL or generate workflows
  - Report error to user
  - Offer to retry with different URL
  - Do NOT proceed to Phase 2

- **Phase 2 fails**: Workflow execution errors
  - Complete as many workflows as possible
  - Report failures in audit
  - Ask user if they want to proceed to Phase 3 despite failures

- **Phase 3 fails**: Test generation errors
  - Report error to user
  - Ensure Phases 1-2 artifacts are preserved
  - Offer to retry Phase 3 only

### Recovery Strategy
1. Mark failed phase in task list
2. Preserve all artifacts from successful phases
3. Ask user: "Phase [N] failed. Do you want to retry this phase or stop?"
4. Allow selective re-execution of failed phase

---

## Key Principles

1. **Thin Orchestration**: This skill does NOT duplicate sub-skill logic. It invokes them.

2. **Configuration-Driven**: All phases use shared config from Phase 0.

3. **Approval Gates**: User explicitly approves before each major phase.

4. **Task Delegation**: Use Task tool for exploration, execution, audit, and fix phases (heavy work).

5. **Session Recovery**: Pipeline can resume from any phase using task list state.

6. **Artifact Preservation**: Each phase produces artifacts that subsequent phases depend on.

7. **User Control**: User decides whether to proceed at each gate, whether to apply fixes, and can modify configuration.

---

## Example Invocation

**User**: "Generate and execute mobile workflows for https://myapp.com"

**Orchestrator**:
1. Phase 0: Asks for credentials, device preference, execution engine
2. Writes `/workflows/mobile-config.json`
3. Phase 1: Invokes mobile-browser-workflow-generator
4. [Approval gate] "5 workflows generated. Proceed to execution?"
5. Phase 2: Invokes mobile-browser-workflow-executor
6. [Approval gate] "Execution complete. 3 UX issues found. Convert to Playwright?"
7. Phase 3: Invokes mobile-browser-workflow-to-playwright
8. Phase 4: Presents summary with all artifacts

---

## Sub-Skill References

This orchestrator chains these skills in sequence:

1. **mobile-browser-workflow-generator**
   - Located: `/skills/mobile-browser-workflow-generator/SKILL.md`
   - Responsibility: Workflow exploration and generation

2. **mobile-browser-workflow-executor**
   - Located: `/skills/mobile-browser-workflow-executor/SKILL.md`
   - Responsibility: Execution, audit, fixes, reporting

3. **mobile-browser-workflow-to-playwright**
   - Located: `/skills/mobile-browser-workflow-to-playwright/SKILL.md`
   - Responsibility: Playwright test generation

---

## Configuration Reference

The `/workflows/mobile-config.json` file is the single source of truth for:
- **URL**: Where to run workflows
- **Environment**: production/staging/development context
- **Credentials**: For login/authentication workflows
- **Device**: Viewport dimensions and user agent
- **Execution Engine**: playwright (recommended) or claude-in-chrome

All three sub-skills read this configuration to ensure consistency across the pipeline.

---

## Success Criteria

Pipeline succeeds when:
- [x] Configuration established and validated
- [x] 5-8 mobile workflows generated
- [x] All workflows executed (with audit findings)
- [x] Playwright tests generated with mobile configuration
- [x] All artifacts created in `/workflows/` and `/e2e/`
- [x] Summary report presented to user

User can then run `npx playwright test --project=mobile` to execute the generated tests in CI/CD.
