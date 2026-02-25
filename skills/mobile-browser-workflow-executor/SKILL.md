---
name: mobile-browser-workflow-executor
description: Executes mobile browser workflows from /workflows/mobile-browser-workflows.md using Playwright MCP with mobile viewport emulation. Use this when the user says "run mobile browser workflows", "execute mobile browser workflows", or "test mobile browser workflows". Tests each workflow step by step in a mobile Chrome viewport (393x852), captures before/after screenshots, audits iOS HIG anti-patterns, documents issues, and generates HTML reports with device frame mockups.
---

# Mobile Browser Workflow Executor

This skill executes mobile browser workflows defined in `/workflows/mobile-browser-workflows.md` using Playwright MCP as the primary engine, with Claude-in-Chrome as an optional alternative. It emulates a mobile viewport (393x852 - iPhone 14 Pro dimensions), validates workflows step-by-step, audits for iOS Human Interface Guidelines (HIG) anti-patterns, captures visual evidence with device frame mockups, and generates comprehensive reports.

## Overview

The mobile browser workflow executor combines the automation capabilities of browser-workflow-executor with the iOS HIG validation logic from ios-workflow-executor, adapted for mobile web testing in Chrome. It tests mobile-optimized web interfaces, identifies platform-specific UX issues, and provides actionable recommendations for iOS-compliant mobile web experiences.

### Key Features

- **Mobile viewport emulation**: 393x852px (iPhone 14 Pro)
- **Mobile user agent spoofing**: iOS Safari 17.0
- **Dual engine support**: Playwright MCP (primary) and Claude-in-Chrome (alternative)
- **iOS HIG validation**: Tab bar patterns, touch target sizes, native component usage
- **Visual documentation**: Before/after screenshots with CSS device frame mockups
- **Session recovery**: Task-based progress tracking with restoration
- **Parallel fix execution**: Multi-agent workflow for rapid remediation
- **Comprehensive reporting**: HTML and Markdown reports with visual evidence

## Execution Modes

### Audit Mode (Default)
Executes workflows, captures findings, generates reports. Does not modify code.

```bash
# User invocation
"Run mobile browser workflows"
"Execute mobile browser workflows in audit mode"
"Test mobile browser workflows"
```

### Fix Mode
Executes audit, then automatically remediates identified issues with user approval.

```bash
# User invocation
"Run mobile browser workflows and fix issues"
"Execute mobile browser workflows in fix mode"
"Test and fix mobile browser workflows"
```

## Workflow File Format

Workflows are defined in `/workflows/mobile-browser-workflows.md`:

```markdown
## Workflow: Product Search Flow

**URL**: https://example.com
**Description**: User searches for a product on mobile

### Steps

1. **Navigate to homepage**
   - Action: Navigate
   - Target: https://example.com

2. **Tap search icon**
   - Action: Tap
   - Target: Search icon in header
   - Expected: Search input appears

3. **Enter search query**
   - Action: Type
   - Target: Search input
   - Value: "running shoes"

4. **Submit search**
   - Action: Tap
   - Target: Search button
   - Expected: Results page loads

5. **Verify results**
   - Action: Verify
   - Target: Product grid
   - Expected: At least 3 products visible
```

### Supported Actions

- **Navigate**: Load a URL
- **Tap**: Click an element (mobile-optimized)
- **Type**: Enter text into input
- **Swipe**: Scroll gesture (up/down/left/right)
- **Wait**: Pause for element or duration
- **Verify**: Assert element presence/state
- **Screenshot**: Capture visual evidence

## 12-Phase Execution Flow

### Phase 1: Read Workflows & Initialize Task List

**Objective**: Parse workflow definitions and establish session recovery infrastructure.

**Steps**:
1. Check for existing session state: `.claude/tasks/mobile-browser-workflow-executor-session.json`
2. If session exists, prompt user: "Resume previous session or start fresh?"
3. Read `/workflows/mobile-browser-workflows.md`
4. Parse workflow structure (name, URL, steps, expected outcomes)
5. Create master task hierarchy

**Task Creation**:

```python
# Master task
TaskCreate(
    name="mobile-browser-workflow-execution",
    description="Execute all mobile browser workflows with iOS HIG validation",
    metadata={
        "session_id": "mbwe-20260208-143022",
        "mode": "audit",  # or "fix"
        "engine": "playwright",  # or "claude-in-chrome"
        "total_workflows": 5
    }
)

# Per-workflow tasks
TaskCreate(
    name="workflow-product-search",
    description="Execute Product Search Flow workflow",
    parent_id="mobile-browser-workflow-execution",
    metadata={
        "url": "https://example.com",
        "steps": 5,
        "status": "pending"
    }
)
```

**Session Recovery Decision Tree**:

```
Session file exists?
├─ YES
│  ├─ Prompt: "Resume session mbwe-20260208-143022? (Y/N)"
│  ├─ User says YES
│  │  ├─ Load session state
│  │  ├─ TaskList → identify incomplete tasks
│  │  ├─ Skip to first incomplete phase
│  │  └─ Continue execution
│  └─ User says NO
│     ├─ Archive old session
│     ├─ Create new session
│     └─ Start from Phase 1
└─ NO
   ├─ Create new session file
   └─ Start from Phase 1
```

**Session State Structure**:

```json
{
  "session_id": "mbwe-20260208-143022",
  "created_at": "2026-02-08T14:30:22Z",
  "mode": "audit",
  "engine": "playwright",
  "current_phase": 3,
  "workflows": [
    {
      "name": "Product Search Flow",
      "status": "completed",
      "findings": 2,
      "screenshots": ["before-001.png", "after-001.png"]
    },
    {
      "name": "Checkout Process",
      "status": "in_progress",
      "current_step": 3,
      "findings": 0
    }
  ],
  "total_findings": 2,
  "last_updated": "2026-02-08T14:45:10Z"
}
```

**Output**: Parsed workflows, session initialized, task hierarchy created.

---

### Phase 2: Initialize Mobile Browser

**Objective**: Launch browser with mobile viewport and user agent configuration.

**Engine Selection**:

Prompt user at start:
```
Which browser engine would you like to use?
1. Playwright MCP (recommended - better mobile emulation)
2. Claude-in-Chrome (alternative - uses existing browser)

Default: Playwright MCP
```

**Playwright MCP Initialization**:

```javascript
// 1. Resize viewport to mobile dimensions
await browser_resize({
  width: 393,
  height: 852
});

// 2. Override user agent via evaluate
await browser_evaluate({
  function: `() => {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  }`
});

// 3. Set mobile viewport meta tag emulation
await browser_evaluate({
  function: `() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
  }`
});

// 4. Enable touch events
await browser_evaluate({
  function: `() => {
    document.documentElement.style.touchAction = 'manipulation';
  }`
});
```

**Claude-in-Chrome Initialization**:

```javascript
// 1. Get tab context
await tabs_context_mcp({ createIfEmpty: true });

// 2. Resize window (best effort)
await resize_window({
  tabId: TAB_ID,
  width: 393,
  height: 852
});

// 3. Override user agent
await javascript_tool({
  tabId: TAB_ID,
  action: 'javascript_exec',
  text: `
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  `
});
```

**Mobile Viewport Specifications**:

| Device | Width | Height | DPR |
|--------|-------|--------|-----|
| iPhone 14 Pro (default) | 393 | 852 | 3 |
| iPhone SE | 375 | 667 | 2 |
| Pixel 7 | 412 | 915 | 2.625 |

**Task Update**:

```python
TaskUpdate(
    task_id="mobile-browser-workflow-execution",
    status="in_progress",
    metadata={
        "phase": 2,
        "engine": "playwright",
        "viewport": "393x852",
        "user_agent": "iOS Safari 17.0"
    }
)
```

**Output**: Browser launched with mobile viewport (393x852) and iOS user agent.

---

### Phase 2.5: Capture Before State

**Purpose:** Capture the pristine app state before any workflow steps execute, for a holistic before/after comparison of the overall transformation.

**Create before-state capture task:**
```
TaskCreate:
- subject: "Capture: before state for all workflows"
- description: "Screenshot each workflow's starting page in mobile viewport before any steps execute"
- activeForm: "Capturing before state"

TaskUpdate:
- taskId: [before-state task ID]
- status: "in_progress"
```

For each workflow that will be executed:

1. Navigate to the workflow's starting URL
2. Wait for the page to fully load (2-3 seconds)
3. Take a screenshot of the mobile viewport
4. Save to `workflows/screenshots/before-after/{workflow-name}/before.png`
   - Use Bash to create the directory: `mkdir -p workflows/screenshots/before-after/{workflow-name}`
   - The workflow-name should be kebab-cased from the workflow title
5. Record the starting URL for each workflow (needed later for after-state capture)

```
TaskUpdate:
- taskId: [before-state task ID]
- status: "completed"
```

**Note:** These are different from the per-issue before/after screenshots in Phase 7. Those capture individual issues. These capture the overall app state.

---

### Phase 3: Execute Workflow

**Objective**: Execute workflow steps sequentially, capturing state at each step.

**Action Mapping (Playwright MCP)**:

| Workflow Action | Playwright Tool | Implementation |
|----------------|-----------------|----------------|
| Navigate | `browser_navigate` | `browser_navigate({ url: TARGET })` |
| Tap | `browser_click` | `browser_click({ ref: REF })` with touch event |
| Type | `browser_type` | `browser_type({ ref: REF, text: VALUE })` |
| Swipe Up | `browser_evaluate` | Custom scroll with touch simulation |
| Swipe Down | `browser_evaluate` | Custom scroll with touch simulation |
| Wait | `browser_wait_for` | `browser_wait_for({ text: EXPECTED })` |
| Verify | `browser_snapshot` | Assert element presence |
| Screenshot | `browser_take_screenshot` | Capture visual state |

**Step Execution Template**:

```python
# Before step execution
await browser_snapshot()  # Get current page state
await browser_take_screenshot({
    filename: f"workflows/screenshots/{workflow_name}/before-step-{step_num}.png",
    type: "png"
})

# Execute step based on action type
if action == "Tap":
    # 1. Find element using snapshot
    snapshot = await browser_snapshot()
    # 2. Identify target ref from snapshot
    target_ref = identify_element(snapshot, step.target)
    # 3. Execute tap
    await browser_click({
        element: step.target,
        ref: target_ref
    })

elif action == "Type":
    snapshot = await browser_snapshot()
    target_ref = identify_element(snapshot, step.target)
    await browser_type({
        element: step.target,
        ref: target_ref,
        text: step.value,
        slowly: True  # Trigger mobile keyboard events
    })

elif action == "Swipe":
    direction = step.direction  # up/down/left/right
    await browser_evaluate({
        function: f`() => {{
            const scrollDistance = {400 if direction in ['up', 'down'] else 300};
            const direction = '{direction}';

            if (direction === 'up') {{
                window.scrollBy({{ top: scrollDistance, behavior: 'smooth' }});
            }} else if (direction === 'down') {{
                window.scrollBy({{ top: -scrollDistance, behavior: 'smooth' }});
            }} else if (direction === 'left') {{
                window.scrollBy({{ left: scrollDistance, behavior: 'smooth' }});
            }} else if (direction === 'right') {{
                window.scrollBy({{ left: -scrollDistance, behavior: 'smooth' }});
            }}
        }}`
    })

elif action == "Verify":
    snapshot = await browser_snapshot()
    element_found = verify_element_presence(snapshot, step.target)
    if not element_found:
        raise WorkflowError(f"Verification failed: {step.expected}")

# After step execution
await browser_wait_for({ time: 1 })  # Allow animations to settle
await browser_take_screenshot({
    filename: f"workflows/screenshots/{workflow_name}/after-step-{step_num}.png",
    type: "png"
})
```

**Touch Event Simulation (Advanced)**:

For scenarios requiring native-like touch events:

```javascript
await browser_evaluate({
  function: `(element) => {
    const rect = element.getBoundingClientRect();
    const touchObj = new Touch({
      identifier: Date.now(),
      target: element,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      radiusX: 2.5,
      radiusY: 2.5,
      rotationAngle: 0,
      force: 1
    });

    const touchEvent = new TouchEvent('touchstart', {
      cancelable: true,
      bubbles: true,
      touches: [touchObj],
      targetTouches: [touchObj],
      changedTouches: [touchObj]
    });

    element.dispatchEvent(touchEvent);
  }`,
  ref: target_ref,
  element: step.target
});
```

**Workflow Execution Loop**:

```python
for workflow in workflows:
    TaskCreate(
        name=f"workflow-{workflow.slug}",
        description=f"Execute {workflow.name}",
        parent_id="mobile-browser-workflow-execution"
    )

    # Navigate to starting URL
    await browser_navigate({ url: workflow.url })
    await browser_wait_for({ time: 2 })

    # Capture initial state
    await browser_take_screenshot({
        filename: f"workflows/screenshots/{workflow.slug}/before/initial.png"
    })

    findings = []

    for step_num, step in enumerate(workflow.steps, 1):
        TaskUpdate(
            task_id=f"workflow-{workflow.slug}",
            metadata={
                "current_step": step_num,
                "total_steps": len(workflow.steps),
                "action": step.action
            }
        )

        try:
            # Execute step (see template above)
            execute_step(step, step_num)

            # Check for iOS HIG violations (quick scan)
            snapshot = await browser_snapshot()
            quick_issues = scan_for_obvious_issues(snapshot)
            findings.extend(quick_issues)

        except Exception as e:
            finding = {
                "workflow": workflow.name,
                "step": step_num,
                "action": step.action,
                "error": str(e),
                "severity": "critical"
            }
            findings.append(finding)

            # Decision: continue or abort?
            if step.get("required", True):
                raise WorkflowError(f"Required step {step_num} failed: {e}")
            else:
                log_warning(f"Optional step {step_num} failed: {e}")
                continue

    # Capture final state
    await browser_take_screenshot({
        filename: f"workflows/screenshots/{workflow.slug}/after/final.png"
    })

    TaskUpdate(
        task_id=f"workflow-{workflow.slug}",
        status="completed",
        metadata={
            "findings": len(findings),
            "screenshots": count_screenshots(workflow.slug)
        }
    )
```

**Error Handling**:

```python
class WorkflowError(Exception):
    pass

def execute_step_with_retry(step, max_retries=2):
    for attempt in range(max_retries):
        try:
            execute_step(step)
            return True
        except TimeoutError:
            if attempt < max_retries - 1:
                log(f"Step timeout, retrying ({attempt + 1}/{max_retries})")
                continue
            else:
                raise WorkflowError(f"Step timed out after {max_retries} attempts")
        except ElementNotFoundError as e:
            # Try alternative selector strategies
            if attempt < max_retries - 1:
                log(f"Element not found, trying alternative strategy")
                continue
            else:
                raise WorkflowError(f"Element not found: {e}")
```

**Output**: All workflow steps executed, screenshots captured, preliminary findings recorded.

---

### Phase 4: UX Platform Evaluation [DELEGATE TO AGENT]

**Objective**: Perform comprehensive iOS HIG validation of mobile web interface.

**IMPORTANT**: This phase MUST be delegated to the Task tool due to its complexity and need for deep analysis across multiple screens and patterns.

**Agent Delegation**:

```python
Task(
    task=f"""
Perform iOS Human Interface Guidelines (HIG) evaluation on mobile browser workflow: {workflow.name}

CONTEXT:
- Workflow URL: {workflow.url}
- Screenshots: workflows/screenshots/{workflow.slug}/
- Browser: Chrome mobile viewport (393x852)
- Engine: {engine}

EVALUATION CRITERIA:

1. NAVIGATION PATTERNS
   - Check for hamburger menus (anti-pattern)
   - Verify iOS-standard tab bar usage
   - Assess navigation bar implementation
   - Verify back button behavior

2. TOUCH TARGET SIZING
   - Measure all interactive elements
   - Minimum: 44x44 points (132x132 CSS pixels at 3x)
   - Check spacing between targets (min 8pt)
   - Verify thumb-reachable zones

3. NATIVE COMPONENT USAGE
   - Identify custom vs native-like controls
   - Check for iOS-standard gestures
   - Verify pull-to-refresh implementation
   - Assess modal presentation styles

4. VISUAL DESIGN
   - Color contrast ratios (WCAG AA minimum)
   - Typography scaling (Dynamic Type)
   - Spacing consistency (8pt grid)
   - Visual hierarchy clarity

5. PLATFORM CONVENTIONS
   - Destructive actions (red, confirmation)
   - Primary actions (blue, prominent)
   - Cancel patterns (top-left or bottom)
   - Alert/dialog styles

METHODOLOGY:
1. Load each screenshot from workflows/screenshots/{workflow.slug}/
2. Use browser_snapshot to analyze DOM structure
3. Use browser_evaluate to measure element dimensions:
   ```javascript
   const elements = document.querySelectorAll('button, a, input, [role="button"]');
   const measurements = Array.from(elements).map(el => ({{
     tag: el.tagName,
     text: el.textContent.trim(),
     width: el.offsetWidth,
     height: el.offsetHeight,
     top: el.offsetTop,
     left: el.offsetLeft,
     computed: window.getComputedStyle(el)
   }}));
   ```
4. Analyze navigation structure:
   ```javascript
   const nav = {{
     hamburger: document.querySelector('[aria-label*="menu" i], .hamburger, #menu-toggle'),
     tabBar: document.querySelector('[role="tablist"], .tab-bar, nav[class*="tab"]'),
     navBar: document.querySelector('header, nav[class*="nav"], [role="navigation"]')
   }};
   ```

OUTPUT FORMAT:
Create findings in this structure:

```markdown
## Finding: [Anti-Pattern Name]

**Severity**: Critical | High | Medium | Low
**Category**: Navigation | Touch Targets | Components | Visual | Platform
**Location**: [Specific element/screen]

**Current Implementation**:
[Description of what exists now]

**iOS HIG Violation**:
[Specific guideline violated with reference]

**Impact**:
- User experience issue
- Accessibility concern
- Platform inconsistency

**Recommended Solution**:
[Specific iOS-native pattern to adopt]

**Implementation**:
```css
/* CSS changes */
.tab-bar {{
  position: fixed;
  bottom: 0;
  height: 49px;
  ...
}}
```

```html
<!-- HTML structure -->
<nav role="tablist" class="tab-bar">
  <button role="tab">Home</button>
  ...
</nav>
```

**Visual Reference**:
[Screenshot showing issue]
```

DELIVERABLE:
Save findings to .claude/plans/mobile-browser-workflow-findings.md with comprehensive analysis and actionable recommendations.
""",
    metadata={
        "phase": 4,
        "workflow": workflow.name,
        "delegation_reason": "Complex iOS HIG analysis requiring deep inspection"
    }
)
```

**iOS HIG Anti-Pattern Checklist**:

```markdown
### Navigation Anti-Patterns

- [ ] **Hamburger Menu** (❌ Anti-pattern)
  - Current: Hidden navigation behind hamburger icon
  - iOS Solution: Tab bar with 3-5 top-level sections
  - Reference: HIG > Navigation > Tab Bars

- [ ] **Desktop-Style Top Nav** (❌ Anti-pattern)
  - Current: Horizontal scrolling top navigation
  - iOS Solution: Navigation bar with hierarchical structure
  - Reference: HIG > Navigation > Navigation Bars

- [ ] **Accordion Menus** (⚠️ Use sparingly)
  - Current: Multi-level collapsible navigation
  - iOS Solution: Hierarchical push navigation
  - Reference: HIG > Navigation > Hierarchical Navigation

### Touch Target Anti-Patterns

- [ ] **Small Buttons** (❌ Anti-pattern)
  - Current: Buttons < 44pt (132px @ 3x)
  - iOS Solution: Minimum 44x44pt touch targets
  - Reference: HIG > Inputs > Buttons

- [ ] **Cramped Spacing** (❌ Anti-pattern)
  - Current: Interactive elements < 8pt apart
  - iOS Solution: Minimum 8pt spacing between targets
  - Reference: HIG > Layout > Spacing

- [ ] **Edge Targets** (⚠️ Context-dependent)
  - Current: Primary actions at top of screen
  - iOS Solution: Place primary actions in thumb zone (bottom 60%)
  - Reference: HIG > Ergonomics > Reachability

### Component Anti-Patterns

- [ ] **Custom Select Dropdowns** (❌ Anti-pattern)
  - Current: Web-style <select> or custom dropdown
  - iOS Solution: Native picker or action sheet
  - Reference: HIG > Components > Pickers

- [ ] **Non-Standard Alerts** (❌ Anti-pattern)
  - Current: Custom modal dialogs
  - iOS Solution: Native alert style with title + message + actions
  - Reference: HIG > Components > Alerts

- [ ] **Material Design Patterns** (⚠️ Platform inconsistency)
  - Current: FAB, snackbar, bottom sheets
  - iOS Solution: iOS-equivalent patterns
  - Reference: HIG > Platform Conventions

### Visual Anti-Patterns

- [ ] **Low Contrast** (❌ Anti-pattern)
  - Current: Contrast ratio < 4.5:1
  - iOS Solution: WCAG AA compliance (4.5:1 minimum)
  - Reference: HIG > Accessibility > Color and Contrast

- [ ] **Fixed Typography** (⚠️ Accessibility issue)
  - Current: Pixel-based font sizes
  - iOS Solution: Relative units supporting Dynamic Type
  - Reference: HIG > Typography > Dynamic Type

- [ ] **Inconsistent Spacing** (⚠️ Visual noise)
  - Current: Random spacing values
  - iOS Solution: 8pt grid system
  - Reference: HIG > Layout > Grid
```

**Measurement Utilities**:

```javascript
// Inject into page for measurement
const iOSHIGAudit = {
  measureTouchTargets: () => {
    const interactive = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [onclick]');
    const results = [];

    interactive.forEach(el => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const dpr = window.devicePixelRatio || 3;

      // Convert CSS pixels to points (divide by DPR)
      const widthPt = rect.width / dpr;
      const heightPt = rect.height / dpr;

      const meetsMinimum = widthPt >= 44 && heightPt >= 44;

      results.push({
        element: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : ''),
        text: el.textContent.trim().substring(0, 30),
        widthPt: widthPt.toFixed(1),
        heightPt: heightPt.toFixed(1),
        meetsMinimum,
        position: {
          top: rect.top,
          left: rect.left,
          inThumbZone: rect.top > (window.innerHeight * 0.4)
        }
      });
    });

    return results;
  },

  detectNavigationPattern: () => {
    const patterns = {
      hamburger: !!document.querySelector('[aria-label*="menu" i], .hamburger, .menu-toggle, #menu-icon'),
      tabBar: !!document.querySelector('[role="tablist"], .tab-bar, nav[class*="bottom"]'),
      navBar: !!document.querySelector('header nav, [role="navigation"]'),
      accordion: !!document.querySelector('[aria-expanded], .accordion, details')
    };

    return patterns;
  },

  checkColorContrast: () => {
    const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li');
    const issues = [];

    textElements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const color = computed.color;
      const bgColor = computed.backgroundColor;

      // Simple contrast check (full implementation would calculate WCAG ratio)
      const textRGB = color.match(/\d+/g).map(Number);
      const bgRGB = bgColor.match(/\d+/g).map(Number);

      const textLuminance = (0.299 * textRGB[0] + 0.587 * textRGB[1] + 0.114 * textRGB[2]) / 255;
      const bgLuminance = (0.299 * bgRGB[0] + 0.587 * bgRGB[1] + 0.114 * bgRGB[2]) / 255;

      const contrast = Math.abs(textLuminance - bgLuminance);

      if (contrast < 0.5) { // Simplified check
        issues.push({
          element: el.tagName,
          text: el.textContent.trim().substring(0, 30),
          contrast: contrast.toFixed(2),
          color,
          bgColor
        });
      }
    });

    return issues;
  }
};

// Execute audit
const auditResults = {
  touchTargets: iOSHIGAudit.measureTouchTargets(),
  navigation: iOSHIGAudit.detectNavigationPattern(),
  contrast: iOSHIGAudit.checkColorContrast()
};

auditResults;
```

**Output**: Comprehensive iOS HIG findings documented in `.claude/plans/mobile-browser-workflow-findings.md`.

---

### Phase 5: Record Findings

**Objective**: Consolidate all findings from workflow execution and UX evaluation.

**Findings File Structure**: `.claude/plans/mobile-browser-workflow-findings.md`

```markdown
# Mobile Browser Workflow Findings
**Session**: mbwe-20260208-143022
**Generated**: 2026-02-08 14:52:10
**Mode**: audit
**Engine**: playwright

---

## Summary

| Metric | Count |
|--------|-------|
| Workflows Executed | 5 |
| Total Findings | 18 |
| Critical | 3 |
| High | 7 |
| Medium | 6 |
| Low | 2 |

---

## Workflow: Product Search Flow

**URL**: https://example.com
**Status**: ✅ Completed
**Duration**: 45s
**Screenshots**: 12

### Finding 1: Hamburger Menu Navigation

**Severity**: High
**Category**: Navigation
**Location**: Global header

**Current Implementation**:
The site uses a hamburger menu icon (☰) in the top-left corner to hide primary navigation. Tapping reveals a full-screen overlay with navigation links.

**iOS HIG Violation**:
Hamburger menus are an anti-pattern on iOS. They hide navigation, requiring extra taps and reducing discoverability. iOS HIG recommends tab bars for top-level navigation.

Reference: [HIG > Navigation > Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

**Impact**:
- Reduces navigation discoverability
- Increases cognitive load (users must remember menu location)
- Adds unnecessary tap to access primary sections
- Inconsistent with iOS platform conventions

**Recommended Solution**:
Replace hamburger menu with iOS-standard tab bar at bottom of screen with 3-5 primary sections:
- Home
- Search
- Categories
- Cart
- Account

**Implementation**:

```html
<!-- Remove hamburger menu -->
<!-- <button class="hamburger-menu">☰</button> -->

<!-- Add tab bar -->
<nav role="tablist" class="tab-bar">
  <button role="tab" aria-selected="true" class="tab-item">
    <svg class="tab-icon"><!-- Home icon --></svg>
    <span class="tab-label">Home</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon"><!-- Search icon --></svg>
    <span class="tab-label">Search</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon"><!-- Categories icon --></svg>
    <span class="tab-label">Categories</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon"><!-- Cart icon --></svg>
    <span class="tab-label">Cart</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon"><!-- Account icon --></svg>
    <span class="tab-label">Account</span>
  </button>
</nav>
```

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 49px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 8px;
  background: none;
  border: none;
  color: #8E8E93;
  transition: color 0.2s;
}

.tab-item[aria-selected="true"] {
  color: #007AFF;
}

.tab-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
```

**Visual Reference**:
- Before: `workflows/screenshots/product-search/before/step-1.png`
- After (mockup): `workflows/screenshots/product-search/mockups/tab-bar.png`

---

### Finding 2: Small Touch Targets on Product Cards

**Severity**: Critical
**Category**: Touch Targets
**Location**: Product grid (search results)

**Current Implementation**:
Product cards have small "Add to Cart" buttons measuring 32x28 CSS pixels (10.7x9.3 points at 3x DPR).

**iOS HIG Violation**:
Touch targets must be at least 44x44 points to ensure comfortable, accurate tapping.

Reference: [HIG > Inputs > Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

**Impact**:
- Difficult to tap accurately (fat finger problem)
- Frustrating user experience
- Accessibility barrier for users with motor impairments
- Increased tap errors and accidental selections

**Recommended Solution**:
Increase button size to minimum 44x44 points (132x132 CSS pixels at 3x). Add padding and increase touch target beyond visual bounds if needed.

**Implementation**:

```css
/* Current (incorrect) */
.product-card .add-to-cart {
  width: 32px;
  height: 28px;
  padding: 4px 8px;
}

/* Fixed (correct) */
.product-card .add-to-cart {
  min-width: 132px; /* 44pt × 3 */
  min-height: 132px; /* 44pt × 3 */
  padding: 12px 24px;
  font-size: 15px;

  /* Ensure touch target even if visual is smaller */
  position: relative;
}

.product-card .add-to-cart::after {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  /* Expand touch target by 8px in all directions */
}
```

**Visual Reference**:
- Before: `workflows/screenshots/product-search/before/step-4.png`
- Measurement overlay: `workflows/screenshots/product-search/analysis/touch-targets.png`

---

### Finding 3: Custom Dropdown for Sorting

**Severity**: Medium
**Category**: Components
**Location**: Search results page (sort controls)

**Current Implementation**:
Custom-built dropdown menu for sort options (Price: Low to High, etc.) using div-based implementation with JavaScript.

**iOS HIG Violation**:
iOS uses native pickers and action sheets for selection. Custom dropdowns lack platform familiarity and may not behave as expected.

Reference: [HIG > Components > Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)

**Impact**:
- Non-standard interaction pattern
- May not respect system font sizes (Dynamic Type)
- Inconsistent with platform conventions
- Potential accessibility issues with screen readers

**Recommended Solution**:
Use native select element styled to match iOS picker appearance, or implement action sheet pattern.

**Implementation**:

```html
<!-- Option 1: Native select (simpler) -->
<select class="ios-picker" aria-label="Sort products">
  <option value="relevance">Most Relevant</option>
  <option value="price-low">Price: Low to High</option>
  <option value="price-high">Price: High to Low</option>
  <option value="rating">Highest Rated</option>
</select>

<!-- Option 2: Action sheet pattern (more iOS-like) -->
<button class="action-sheet-trigger" aria-haspopup="menu">
  Sort: Most Relevant
</button>
<div class="action-sheet" role="menu" hidden>
  <div class="action-sheet-content">
    <button role="menuitem">Most Relevant</button>
    <button role="menuitem">Price: Low to High</button>
    <button role="menuitem">Price: High to Low</button>
    <button role="menuitem">Highest Rated</button>
    <button class="action-sheet-cancel">Cancel</button>
  </div>
</div>
```

```css
/* Native select styling */
.ios-picker {
  min-width: 200px;
  min-height: 44px;
  padding: 12px 16px;
  font-size: 17px;
  border: 1px solid #C7C7CC;
  border-radius: 10px;
  background: white;
  appearance: none;
}

/* Action sheet pattern */
.action-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

.action-sheet-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 14px 14px 0 0;
  padding: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

.action-sheet-content button {
  width: 100%;
  min-height: 57px;
  background: white;
  border: none;
  border-radius: 10px;
  margin-bottom: 8px;
  font-size: 20px;
  color: #007AFF;
}

.action-sheet-cancel {
  font-weight: 600;
  margin-top: 8px;
}
```

**Visual Reference**:
- Current: `workflows/screenshots/product-search/before/step-5.png`
- iOS picker reference: [HIG Screenshots]

---

[Additional findings continue in same format...]

---

## Workflow: Checkout Process

[Findings for next workflow...]

---

## Appendix: iOS HIG Quick Reference

### Touch Target Minimums
- **Standard**: 44x44 points
- **CSS pixels at 3x DPR**: 132x132px
- **Spacing**: Minimum 8pt between targets

### Navigation Patterns
- **Tab Bar**: 3-5 top-level sections, bottom placement
- **Navigation Bar**: Hierarchical navigation, top placement
- **Avoid**: Hamburger menus, horizontal scrolling tabs

### Color & Contrast
- **WCAG AA**: 4.5:1 for normal text
- **WCAG AA Large**: 3:1 for 18pt+ text
- **iOS Dynamic**: Support light/dark mode

### Typography
- **Body**: 17pt (SF Pro)
- **Headline**: 17pt semibold
- **Support**: Dynamic Type scaling

### Platform Colors
- **Blue**: #007AFF (primary actions)
- **Red**: #FF3B30 (destructive)
- **Gray**: #8E8E93 (secondary text)
```

**Task Update**:

```python
TaskUpdate(
    task_id="mobile-browser-workflow-execution",
    status="in_progress",
    metadata={
        "phase": 5,
        "total_findings": 18,
        "findings_by_severity": {
            "critical": 3,
            "high": 7,
            "medium": 6,
            "low": 2
        }
    }
)
```

**Output**: All findings documented in structured Markdown format with implementation guidance.

---

### Phase 6: Generate Audit Report

**Objective**: Present consolidated findings to user with actionable next steps.

**Report Presentation** (terminal output):

```markdown
╔══════════════════════════════════════════════════════════════════╗
║          MOBILE BROWSER WORKFLOW AUDIT COMPLETE                  ║
╚══════════════════════════════════════════════════════════════════╝

Session: mbwe-20260208-143022
Mode: Audit
Engine: Playwright MCP
Duration: 8m 32s

┌──────────────────────────────────────────────────────────────────┐
│ SUMMARY                                                          │
├──────────────────────────────────────────────────────────────────┤
│ Workflows Executed    │ 5                                        │
│ Total Findings        │ 18                                       │
│ Critical Issues       │ 3  ⚠️                                    │
│ High Priority         │ 7  ⚠️                                    │
│ Medium Priority       │ 6                                        │
│ Low Priority          │ 2                                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ TOP CRITICAL ISSUES                                              │
├──────────────────────────────────────────────────────────────────┤
│ 1. Small Touch Targets (Product Cards)                           │
│    Buttons: 32x28px (9.3pt) - Below 44pt minimum                │
│    Impact: Difficult to tap, accessibility barrier              │
│                                                                  │
│ 2. Hamburger Menu Navigation                                     │
│    Anti-pattern: Hidden navigation reduces discoverability      │
│    Solution: iOS tab bar with 5 sections                        │
│                                                                  │
│ 3. Low Color Contrast (Footer Links)                            │
│    Ratio: 2.8:1 - Below WCAG AA 4.5:1 minimum                  │
│    Impact: Readability issues, accessibility violation          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ARTIFACTS GENERATED                                              │
├──────────────────────────────────────────────────────────────────┤
│ Findings Report       │ .claude/plans/mobile-browser-workflow-   │
│                       │ findings.md                              │
│ Screenshots           │ workflows/screenshots/ (48 files)        │
│ Session State         │ .claude/tasks/mbwe-20260208-143022.json │
└──────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════╗
║ NEXT STEPS                                                       ║
╚══════════════════════════════════════════════════════════════════╝

Would you like me to:

1. 🔧 FIX ISSUES AUTOMATICALLY
   I can generate and apply fixes for identified issues with your approval.

2. 📊 GENERATE DETAILED REPORTS
   Create HTML and Markdown reports with visual evidence and metrics.

3. 🔍 DEEP DIVE ON SPECIFIC FINDINGS
   Explore particular issues in detail with additional analysis.

4. ✅ MARK COMPLETE
   Save findings and close session.

Please respond with a number (1-4) or describe what you'd like to do next.
```

**User Decision Points**:

1. **Fix Mode**: Proceed to Phase 8 (Fix Mode Execution)
2. **Reports**: Proceed to Phase 10-11 (HTML/MD report generation)
3. **Deep Dive**: Return to Phase 4 with specific focus
4. **Complete**: Skip to Phase 12 (wrap-up)

**Task Update**:

```python
TaskUpdate(
    task_id="mobile-browser-workflow-execution",
    status="completed",
    metadata={
        "phase": 6,
        "audit_complete": True,
        "awaiting_user_decision": True
    }
)
```

**Output**: Summary report presented, user prompted for next steps.

---

### Phase 7: Screenshot Management

**Objective**: Organize and optimize screenshots for reporting.

**Directory Structure**:

```
workflows/
├── screenshots/
│   ├── product-search-flow/
│   │   ├── before/                    (per-issue before screenshots)
│   │   │   ├── initial.png
│   │   │   ├── step-1.png
│   │   │   ├── step-2.png
│   │   │   └── ...
│   │   ├── after/                     (per-issue after screenshots)
│   │   │   ├── step-1.png
│   │   │   ├── step-2.png
│   │   │   ├── final.png
│   │   │   └── ...
│   │   ├── analysis/
│   │   │   ├── touch-targets-overlay.png
│   │   │   ├── navigation-pattern.png
│   │   │   └── contrast-check.png
│   │   └── mockups/
│   │       ├── tab-bar-solution.png
│   │       └── fixed-touch-targets.png
│   ├── checkout-process/
│   │   └── [same structure]
│   └── ...
├── before-after/                      (holistic before/after per workflow)
│   ├── product-search-flow/
│   │   ├── before.png                 (starting page before any steps)
│   │   └── after.png                  (starting page after all fixes)
│   ├── checkout-process/
│   │   ├── before.png
│   │   └── after.png
│   └── ...
└── mobile-before-after-report.html    (side-by-side comparison report)
```

**Screenshot Optimization**:

```python
from PIL import Image
import os

def optimize_screenshots(workflow_slug):
    """Compress and optimize screenshots for web delivery"""
    screenshot_dir = f"workflows/screenshots/{workflow_slug}"

    for root, dirs, files in os.walk(screenshot_dir):
        for file in files:
            if file.endswith('.png'):
                filepath = os.path.join(root, file)
                img = Image.open(filepath)

                # Resize if too large (max 1200px width)
                if img.width > 1200:
                    ratio = 1200 / img.width
                    new_size = (1200, int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                # Save with optimization
                img.save(filepath, optimize=True, quality=85)

                # Also save WebP version for modern browsers
                webp_path = filepath.replace('.png', '.webp')
                img.save(webp_path, 'WEBP', quality=80)
```

**Annotation Generation**:

Create annotated screenshots highlighting issues:

```python
from PIL import Image, ImageDraw, ImageFont

def annotate_touch_target_issue(screenshot_path, elements_below_minimum):
    """Draw red boxes around touch targets below 44pt minimum"""
    img = Image.open(screenshot_path)
    draw = ImageDraw.Draw(img)

    for element in elements_below_minimum:
        x, y, width, height = element['bounds']

        # Draw red rectangle
        draw.rectangle(
            [(x, y), (x + width, y + height)],
            outline='red',
            width=3
        )

        # Add measurement label
        label = f"{element['width_pt']}×{element['height_pt']}pt"
        draw.text(
            (x, y - 20),
            label,
            fill='red',
            font=ImageFont.truetype('Arial', 16)
        )

    # Save annotated version
    output_path = screenshot_path.replace('/before/', '/analysis/')
    img.save(output_path)

    return output_path
```

**Device Frame Wrapping** (for reports):

Generate device frame mockups:

```python
def wrap_in_device_frame(screenshot_path):
    """Wrap screenshot in iPhone device frame for realistic presentation"""
    screenshot = Image.open(screenshot_path)

    # Device frame dimensions (iPhone 14 Pro)
    frame_width = 393 + 24  # Add border
    frame_height = 852 + 48  # Add border + notch area

    # Create new image with device frame
    device_frame = Image.new('RGB', (frame_width, frame_height), color='#1a1a1a')

    # Paste screenshot into frame
    device_frame.paste(screenshot, (12, 36))

    # Draw rounded corners (simplified - full implementation would use masking)
    draw = ImageDraw.Draw(device_frame)

    # Draw notch (simplified rectangle)
    notch_width = 120
    notch_height = 30
    notch_x = (frame_width - notch_width) // 2
    draw.rectangle(
        [(notch_x, 8), (notch_x + notch_width, 8 + notch_height)],
        fill='#1a1a1a'
    )

    # Save framed version
    output_path = screenshot_path.replace('.png', '-framed.png')
    device_frame.save(output_path)

    return output_path
```

**Output**: Organized, optimized screenshots ready for report inclusion.

---

### Phase 8: Fix Mode Execution [DELEGATE TO AGENTS]

**Objective**: Automatically remediate identified issues with user approval.

**IMPORTANT**: This phase uses parallel agent delegation for efficient fix execution.

**User Approval Flow**:

```python
# Present fix plan
print("""
╔══════════════════════════════════════════════════════════════════╗
║ FIX MODE: PROPOSED CHANGES                                       ║
╚══════════════════════════════════════════════════════════════════╝

I will create fixes for the following issues:

CRITICAL (3 issues):
  ✓ Small touch targets on product cards
    → Increase button size to 132x132px (44pt @ 3x)
    → Files: styles/product-card.css

  ✓ Hamburger menu navigation
    → Replace with iOS tab bar
    → Files: components/header.html, styles/navigation.css, scripts/nav.js

  ✓ Low color contrast in footer
    → Update colors to meet WCAG AA (4.5:1)
    → Files: styles/footer.css

HIGH (7 issues):
  [List continues...]

Total files to modify: 18
Estimated time: 5-8 minutes

⚠️  IMPORTANT: Changes will be made to your codebase. Please review the
   proposed modifications before I proceed.

Do you want me to:
1. Show detailed diff for each file before applying
2. Apply all fixes and show summary after
3. Fix only critical issues
4. Cancel and generate reports only

Please respond with 1, 2, 3, or 4.
""")

user_choice = await get_user_input()

if user_choice == "1":
    review_mode = "interactive"
elif user_choice == "2":
    review_mode = "batch"
elif user_choice == "3":
    fix_scope = "critical_only"
else:
    return  # Skip fix mode
```

**Parallel Agent Delegation**:

```python
# Group fixes by independence
fix_groups = {
    "navigation": {
        "issues": ["hamburger-menu", "tab-bar-missing"],
        "files": ["components/header.html", "styles/navigation.css"],
        "agent_id": "fix-agent-1"
    },
    "touch-targets": {
        "issues": ["small-buttons-product-card", "cramped-spacing-filters"],
        "files": ["styles/product-card.css", "styles/filters.css"],
        "agent_id": "fix-agent-2"
    },
    "color-contrast": {
        "issues": ["low-contrast-footer", "low-contrast-secondary-text"],
        "files": ["styles/footer.css", "styles/typography.css"],
        "agent_id": "fix-agent-3"
    },
    "components": {
        "issues": ["custom-dropdown", "non-standard-alerts"],
        "files": ["components/sort-dropdown.html", "scripts/alerts.js"],
        "agent_id": "fix-agent-4"
    }
}

# Create parallel agent tasks
agent_tasks = []

for group_name, group_data in fix_groups.items():
    task = Task(
        task=f"""
Fix {group_name} issues in mobile browser workflow.

ISSUES TO FIX:
{format_issues(group_data['issues'])}

FILES TO MODIFY:
{group_data['files']}

CONTEXT:
- Mobile viewport: 393x852px (iPhone 14 Pro)
- Target platform: iOS web
- Design system: iOS HIG compliance
- Browser: Chrome mobile

REQUIREMENTS:
1. Read current implementation from files
2. Apply fixes according to iOS HIG guidelines
3. Maintain existing functionality
4. Preserve surrounding code structure
5. Add comments explaining changes
6. Update related styles for consistency

DELIVERABLES:
- Modified files with fixes applied
- Summary of changes made
- Verification that syntax is valid

REFERENCE:
See .claude/plans/mobile-browser-workflow-findings.md for detailed fix specifications.
""",
        metadata={
            "phase": 8,
            "fix_group": group_name,
            "agent_id": group_data['agent_id'],
            "parallel_execution": True
        }
    )

    agent_tasks.append(task)

# Execute all agents in parallel
TaskCreate(
    name="fix-mode-execution",
    description="Parallel execution of fix agents",
    metadata={
        "agent_count": len(agent_tasks),
        "execution_mode": "parallel"
    }
)

# Wait for all agents to complete
all_agents_complete = wait_for_agents(agent_tasks)

# Collect results
fix_results = []
for agent_task in agent_tasks:
    result = get_agent_result(agent_task)
    fix_results.append(result)
```

**Fix Implementation Template** (for agents):

```python
# Example: Fix touch target size issue

# 1. Read current file
current_css = read_file("styles/product-card.css")

# 2. Identify section to modify
# Current code:
"""
.product-card .add-to-cart {
  width: 32px;
  height: 28px;
  padding: 4px 8px;
  font-size: 12px;
}
"""

# 3. Apply fix
fixed_css = """
.product-card .add-to-cart {
  /* iOS HIG: Minimum 44pt touch target (132px @ 3x DPR) */
  min-width: 132px;
  min-height: 132px;
  padding: 12px 24px;
  font-size: 15px;

  /* Ensure adequate touch target even if visual is smaller */
  position: relative;
}

/* Expand touch target beyond visual bounds if needed */
.product-card .add-to-cart::after {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  /* This expands the clickable area by 8px in all directions */
}
"""

# 4. Write updated file
edit_file("styles/product-card.css", old=current_section, new=fixed_css)

# 5. Log change
log_fix({
    "issue": "Small touch targets on product cards",
    "file": "styles/product-card.css",
    "change_type": "css_modification",
    "lines_changed": "15-28",
    "verification": "Touch target now 132x132px (44pt @ 3x DPR)"
})
```

**Fix Validation**:

After all agents complete:

```python
# Validate syntax
validation_results = []

for fix_result in fix_results:
    for file in fix_result['modified_files']:
        if file.endswith('.css'):
            # Validate CSS
            is_valid = validate_css(file)
        elif file.endswith('.html'):
            # Validate HTML
            is_valid = validate_html(file)
        elif file.endswith('.js'):
            # Validate JavaScript
            is_valid = validate_javascript(file)

        validation_results.append({
            "file": file,
            "valid": is_valid,
            "errors": get_validation_errors(file) if not is_valid else []
        })

# Report validation issues
if any(not r['valid'] for r in validation_results):
    print("⚠️  Validation errors detected:")
    for result in validation_results:
        if not result['valid']:
            print(f"  {result['file']}: {result['errors']}")

    print("\nWould you like me to:")
    print("1. Attempt to fix validation errors")
    print("2. Revert changes and try again")
    print("3. Proceed anyway (not recommended)")
```

**Output**: All fixes applied, validated, and documented.

---

### Phase 9: Local Verification [DELEGATE TO AGENT]

**Objective**: Re-run workflows to verify fixes resolved issues.

**Agent Delegation**:

```python
Task(
    task=f"""
Verify that fixes applied in Phase 8 have resolved identified issues.

VERIFICATION WORKFLOW:
1. Re-execute all mobile browser workflows using Playwright MCP
2. Capture new screenshots in workflows/screenshots/{{workflow}}/fixed/
3. Measure touch targets to confirm 44pt minimum
4. Verify navigation pattern changed from hamburger to tab bar
5. Check color contrast ratios meet WCAG AA (4.5:1)
6. Confirm iOS HIG compliance for all modified components

COMPARISON:
- Before: workflows/screenshots/{{workflow}}/before/
- After: workflows/screenshots/{{workflow}}/fixed/
- Generate side-by-side comparison images

MEASUREMENT TOOLS:
Use the same iOSHIGAudit utilities from Phase 4:
```javascript
const verification = {{
  touchTargets: iOSHIGAudit.measureTouchTargets(),
  navigation: iOSHIGAudit.detectNavigationPattern(),
  contrast: iOSHIGAudit.checkColorContrast()
}};
```

PASS CRITERIA:
- All touch targets ≥ 44pt
- Tab bar navigation detected
- All contrast ratios ≥ 4.5:1
- Zero critical/high iOS HIG violations

DELIVERABLE:
Create verification report at .claude/plans/mobile-browser-workflow-verification.md with:
- Before/after metrics table
- Screenshot comparisons
- Remaining issues (if any)
- Overall PASS/FAIL status
""",
    metadata={
        "phase": 9,
        "verification_type": "post_fix",
        "delegation_reason": "Complex re-execution and measurement workflow"
    }
)
```

**Verification Report Format**:

```markdown
# Mobile Browser Workflow Verification Report

**Session**: mbwe-20260208-143022
**Verification Date**: 2026-02-08 15:15:30
**Fixes Applied**: 18

---

## Verification Summary

| Status | Count |
|--------|-------|
| ✅ Issues Resolved | 16 |
| ⚠️ Issues Remaining | 2 |
| ❌ New Issues Introduced | 0 |

**Overall Status**: ✅ PASS (89% resolution rate)

---

## Metrics Comparison

### Touch Targets

| Element | Before | After | Status |
|---------|--------|-------|--------|
| Product Card Button | 10.7×9.3pt | 44×44pt | ✅ Fixed |
| Filter Checkbox | 16×16pt | 44×44pt | ✅ Fixed |
| Sort Dropdown | 38×32pt | 44×44pt | ✅ Fixed |
| Footer Links | 42×20pt | 44×44pt | ✅ Fixed |

### Navigation Pattern

| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| Primary Nav | Hamburger menu | Tab bar (5 items) | ✅ Fixed |
| Location | Top-left | Bottom | ✅ Fixed |
| Discoverability | Hidden | Always visible | ✅ Fixed |

### Color Contrast

| Element | Before | After | WCAG AA | Status |
|---------|--------|-------|---------|--------|
| Footer Links | 2.8:1 | 5.2:1 | 4.5:1 | ✅ Fixed |
| Secondary Text | 3.1:1 | 4.8:1 | 4.5:1 | ✅ Fixed |
| Placeholder Text | 2.2:1 | 4.6:1 | 4.5:1 | ✅ Fixed |

---

## Remaining Issues

### Issue 1: Custom Date Picker (Medium Priority)

**Status**: Not addressed in fix mode
**Reason**: Requires significant component refactoring
**Recommendation**: Replace with native input type="date" in future sprint

### Issue 2: Horizontal Scroll in Category Nav (Low Priority)

**Status**: Partially resolved
**Remaining**: Desktop breakpoint still uses horizontal scroll
**Recommendation**: Apply mobile-first tab bar pattern to all viewports

---

## Screenshot Comparisons

### Navigation Pattern

**Before** (Hamburger Menu):
![Before Navigation](workflows/screenshots/product-search/before/step-1.png)

**After** (Tab Bar):
![After Navigation](workflows/screenshots/product-search/fixed/step-1.png)

**Change**: Replaced hidden hamburger menu with iOS-standard tab bar. Navigation now always visible, reducing cognitive load.

---

### Touch Targets

**Before** (Small Buttons):
![Before Touch Targets](workflows/screenshots/product-search/analysis/touch-targets-before.png)

**After** (44pt Minimum):
![After Touch Targets](workflows/screenshots/product-search/analysis/touch-targets-after.png)

**Change**: Increased all touch targets to minimum 44×44pt. Buttons now comfortable to tap on mobile devices.

---

## Workflow Execution Results

### Product Search Flow
- Status: ✅ PASS
- Duration: 38s (was 45s)
- Steps: 5/5 successful
- Issues: 0 critical, 0 high

### Checkout Process
- Status: ✅ PASS
- Duration: 52s (was 58s)
- Steps: 8/8 successful
- Issues: 0 critical, 0 high

[Additional workflows...]

---

## Recommendations

1. **Address Remaining Issues**: Schedule follow-up for custom date picker and category nav
2. **Regression Testing**: Add automated tests for touch target sizes
3. **Continuous Monitoring**: Integrate iOS HIG checks into CI/CD pipeline
4. **Documentation**: Update design system with mobile-first patterns
```

**Output**: Verification report confirming fixes resolved issues, with before/after metrics.

---

### Phase 9.5: Capture After State

**Purpose:** Capture the app state after all workflows have been executed and fixes applied, for holistic before/after comparison.

**Create after-state capture task:**
```
TaskCreate:
- subject: "Capture: after state for all workflows"
- description: "Screenshot each workflow's starting page after all fixes are applied"
- activeForm: "Capturing after state"

TaskUpdate:
- taskId: [after-state task ID]
- status: "in_progress"
```

For each workflow that was executed:

1. Navigate to the workflow's starting URL again
2. Wait for the page to fully load (2-3 seconds)
3. Take a screenshot of the mobile viewport
4. Save to `workflows/screenshots/before-after/{workflow-name}/after.png`

```
TaskUpdate:
- taskId: [after-state task ID]
- status: "completed"
```

**Audit-only mode:** In audit mode (no fixes), these screenshots will be identical to the before screenshots. The report will show a "No visual changes" badge for unchanged workflows.

---

### Phase 9.6: Generate Before/After Report [DELEGATE TO AGENT]

**Purpose:** Generate a standalone, self-contained HTML report showing side-by-side before/after screenshots for each workflow, with mobile device frames.

**Create report task:**
```
TaskCreate:
- subject: "Generate: Before/After Report"
- description: "Generate HTML report with side-by-side before/after screenshots"
- activeForm: "Generating before/after report"

TaskUpdate:
- taskId: [before-after report task ID]
- status: "in_progress"
```

**Delegate to a general-purpose agent** using the Task tool:

```
Task tool parameters:
- subagent_type: "general-purpose"
- prompt: |
    Generate a before/after HTML report for mobile browser workflow testing.

    ## Input
    - Read all before/after screenshots from `workflows/screenshots/before-after/`
    - Each workflow subfolder has `before.png` and `after.png`
    - Read the findings from task list or `.claude/plans/mobile-browser-workflow-findings.md` for issue counts

    ## Output
    Write to `workflows/mobile-before-after-report.html`

    ## Requirements
    - Self-contained HTML (all images embedded as base64 using: base64 -i <file>)
    - Side-by-side comparison layout for each workflow
    - Mobile device frame styling (rounded corners, phone bezel)
    - Executive summary: workflows tested, issues found, issues fixed, viewport used
    - Per-workflow section: workflow name, starting URL, before/after images, issue count
    - Clean, minimal CSS with system-ui font
    - No external dependencies
    - If before and after screenshots are identical, show a "No visual changes" badge

    ## HTML Template

    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <title>Before/After Report — Mobile Browser Workflows</title>
      <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #fafafa; }
        .summary { background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #e0e0e0; }
        .workflow-section { margin-bottom: 3rem; border-bottom: 1px solid #eee; padding-bottom: 2rem; }
        .comparison { display: flex; gap: 2rem; align-items: flex-start; justify-content: center; }
        .comparison .panel { flex: 0 1 280px; }
        .device-frame { background: #1a1a1a; border-radius: 32px; padding: 10px; }
        .device-frame img { width: 100%; border-radius: 22px; display: block; }
        .label { font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
        .before .label { color: #d32f2f; }
        .after .label { color: #2e7d32; }
        .stats { display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; }
        .stat { background: #f0f0f0; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; }
        .no-change { background: #fff3cd; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem; color: #856404; }
      </style>
    </head>
    <body>
      <h1>Before / After Report — Mobile Browser</h1>
      <div class="summary">
        <p>Generated: {timestamp}</p>
        <p>Viewport: 393x852 (iPhone 14)</p>
        <p>Workflows tested: {count} | Issues found: {issues} | Issues fixed: {fixed}</p>
      </div>
      <div class="workflow-section">
        <h2>{workflow name}</h2>
        <p>Starting URL: {url}</p>
        <div class="comparison">
          <div class="panel before">
            <div class="label">Before</div>
            <div class="device-frame">
              <img src="data:image/png;base64,{before_b64}" />
            </div>
          </div>
          <div class="panel after">
            <div class="label">After</div>
            <div class="device-frame">
              <img src="data:image/png;base64,{after_b64}" />
            </div>
          </div>
        </div>
        <div class="stats">
          <span class="stat">Issues: {n}</span>
          <span class="stat">Fixed: {n}</span>
        </div>
      </div>
    </body>
    </html>
    ```
```

```
TaskUpdate:
- taskId: [before-after report task ID]
- status: "completed"
```

---

### Phase 10: Generate HTML Report [DELEGATE TO AGENT]

**Objective**: Create comprehensive HTML report with visual documentation and device frame mockups.

**Agent Delegation**:

```python
Task(
    task=f"""
Generate comprehensive HTML report for mobile browser workflow audit.

REQUIREMENTS:
1. Create self-contained HTML file with embedded CSS and images (base64)
2. Include iOS device frame mockups around all screenshots
3. Responsive design (works on mobile and desktop)
4. Dark/light mode support
5. Interactive elements (expand/collapse findings)
6. Print-friendly styles

STRUCTURE:
- Executive Summary
- Metrics Dashboard (charts/graphs)
- Workflow Results (expandable sections)
- Detailed Findings (before/after comparisons)
- iOS HIG Reference Guide
- Appendix (methodology, tools used)

CSS DEVICE FRAME MOCKUP:
Use this CSS to wrap screenshots in realistic iPhone frame:

```css
.device-frame {{
  position: relative;
  width: 393px;
  margin: 0 auto;
  border: 12px solid #1a1a1a;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  background: #1a1a1a;
}}

.device-frame::before {{
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 30px;
  background: #1a1a1a;
  border-radius: 20px;
  z-index: 10;
}}

.device-frame img {{
  width: 100%;
  display: block;
  border-radius: 28px;
}}

.device-comparison {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(393px, 1fr));
  gap: 40px;
  margin: 40px 0;
}}

.device-label {{
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #8E8E93;
}}
```

INTERACTIVE FEATURES:
- Expandable findings (click to show/hide details)
- Image zoom on click
- Smooth scroll to sections
- Copy code snippets button

DATA SOURCES:
- Findings: .claude/plans/mobile-browser-workflow-findings.md
- Verification: .claude/plans/mobile-browser-workflow-verification.md
- Screenshots: workflows/screenshots/

OUTPUT FILE:
Save to: reports/mobile-browser-workflow-audit-{session_id}.html
""",
    metadata={{
        "phase": 10,
        "report_type": "html",
        "delegation_reason": "Complex HTML generation with embedded assets"
    }}
)
```

**HTML Report Template** (for agent):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Browser Workflow Audit Report</title>
    <style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f7;
            --text-primary: #1d1d1f;
            --text-secondary: #6e6e73;
            --accent: #007AFF;
            --border: #d2d2d7;
            --success: #34C759;
            --warning: #FF9500;
            --error: #FF3B30;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #000000;
                --bg-secondary: #1c1c1e;
                --text-primary: #f5f5f7;
                --text-secondary: #8e8e93;
                --border: #38383a;
            }
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
            padding-bottom: 40px;
            border-bottom: 1px solid var(--border);
        }

        h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px;
            margin: 40px 0;
        }

        .metric-card {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid var(--border);
        }

        .metric-value {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .metric-label {
            font-size: 14px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Device Frame Styles */
        .device-frame {
            position: relative;
            width: 393px;
            margin: 0 auto;
            border: 12px solid #1a1a1a;
            border-radius: 40px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            background: #1a1a1a;
        }

        .device-frame::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 30px;
            background: #1a1a1a;
            border-radius: 20px;
            z-index: 10;
        }

        .device-frame img {
            width: 100%;
            display: block;
            border-radius: 28px;
        }

        .device-comparison {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(393px, 1fr));
            gap: 40px;
            margin: 40px 0;
        }

        .device-label {
            text-align: center;
            margin-top: 16px;
            font-size: 14px;
            color: var(--text-secondary);
        }

        /* Finding Card */
        .finding {
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 32px;
            margin: 24px 0;
            border: 1px solid var(--border);
        }

        .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 24px;
            cursor: pointer;
        }

        .severity-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-critical { background: var(--error); color: white; }
        .severity-high { background: var(--warning); color: white; }
        .severity-medium { background: #FF9500; color: white; }
        .severity-low { background: var(--text-secondary); color: white; }

        .code-block {
            background: #1c1c1e;
            color: #f5f5f7;
            padding: 20px;
            border-radius: 12px;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 14px;
            line-height: 1.5;
            margin: 16px 0;
        }

        @media print {
            .device-frame {
                box-shadow: none;
                border: 1px solid #ccc;
            }

            .finding {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Mobile Browser Workflow Audit</h1>
            <p>Session: mbwe-20260208-143022</p>
            <p>Generated: February 8, 2026</p>
        </header>

        <section class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">5</div>
                <div class="metric-label">Workflows Executed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: var(--error);">3</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">18</div>
                <div class="metric-label">Total Findings</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: var(--success);">89%</div>
                <div class="metric-label">Resolution Rate</div>
            </div>
        </section>

        <section>
            <h2>Top Findings</h2>

            <div class="finding">
                <div class="finding-header">
                    <div>
                        <h3>Hamburger Menu Navigation</h3>
                        <p>Product Search Flow</p>
                    </div>
                    <span class="severity-badge severity-high">High</span>
                </div>

                <div class="finding-content">
                    <p><strong>iOS HIG Violation:</strong> Hamburger menus hide navigation and reduce discoverability. iOS recommends tab bars for top-level navigation.</p>

                    <div class="device-comparison">
                        <div>
                            <div class="device-frame">
                                <img src="data:image/png;base64,{BASE64_BEFORE}" alt="Before">
                            </div>
                            <div class="device-label">Before: Hamburger Menu</div>
                        </div>
                        <div>
                            <div class="device-frame">
                                <img src="data:image/png;base64,{BASE64_AFTER}" alt="After">
                            </div>
                            <div class="device-label">After: iOS Tab Bar</div>
                        </div>
                    </div>

                    <h4>Implementation</h4>
                    <pre class="code-block"><code>.tab-bar {
  position: fixed;
  bottom: 0;
  height: 49px;
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}</code></pre>
                </div>
            </div>

            <!-- Additional findings... -->
        </section>
    </div>

    <script>
        // Interactive features
        document.querySelectorAll('.finding-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
        });

        // Image zoom
        document.querySelectorAll('.device-frame img').forEach(img => {
            img.addEventListener('click', () => {
                // Implement lightbox zoom
            });
        });
    </script>
</body>
</html>
```

**Output**: Comprehensive HTML report saved to `reports/mobile-browser-workflow-audit-{session_id}.html`.

---

### Phase 11: Generate Markdown Report [DELEGATE TO AGENT]

**Objective**: Create detailed Markdown report for version control and documentation.

**Agent Delegation**:

```python
Task(
    task=f"""
Generate comprehensive Markdown report for mobile browser workflow audit.

REQUIREMENTS:
1. GitHub-flavored Markdown format
2. Table of contents with anchor links
3. Collapsible sections for findings
4. Relative image links (not base64)
5. Code blocks with syntax highlighting
6. Emoji indicators for status (✅ ⚠️ ❌)

STRUCTURE:
# Mobile Browser Workflow Audit Report

## Table of Contents
- [Executive Summary](#executive-summary)
- [Metrics](#metrics)
- [Workflows](#workflows)
- [Findings](#findings)
- [Recommendations](#recommendations)
- [Appendix](#appendix)

EMOJI LEGEND:
- ✅ Pass / Fixed
- ⚠️ Warning / Partial
- ❌ Fail / Critical
- 🔍 Analysis
- 💡 Recommendation
- 📱 Mobile-specific
- 🎨 Visual/Design
- ♿ Accessibility

COLLAPSIBLE SECTIONS:
Use HTML details/summary for long findings:
```html
<details>
<summary><strong>Finding 1: Hamburger Menu (High)</strong></summary>

[Full finding content...]

</details>
```

DATA SOURCES:
- .claude/plans/mobile-browser-workflow-findings.md
- .claude/plans/mobile-browser-workflow-verification.md

OUTPUT:
Save to: reports/mobile-browser-workflow-audit-{session_id}.md
""",
    metadata={{
        "phase": 11,
        "report_type": "markdown",
        "delegation_reason": "Structured documentation generation"
    }}
)
```

**Markdown Report Structure**:

```markdown
# Mobile Browser Workflow Audit Report

**Session**: mbwe-20260208-143022
**Date**: February 8, 2026
**Mode**: Audit → Fix
**Engine**: Playwright MCP
**Viewport**: 393×852px (iPhone 14 Pro)

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Metrics Dashboard](#metrics-dashboard)
- [Workflow Results](#workflow-results)
- [Detailed Findings](#detailed-findings)
- [iOS HIG Compliance](#ios-hig-compliance)
- [Recommendations](#recommendations)
- [Appendix](#appendix)

---

## Executive Summary

This audit evaluated 5 mobile browser workflows against iOS Human Interface Guidelines, identifying **18 UX issues** across navigation patterns, touch target sizing, component usage, and visual design.

### Key Findings

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Navigation | 0 | 2 | 1 | 0 | 3 |
| Touch Targets | 2 | 1 | 0 | 0 | 3 |
| Components | 0 | 3 | 2 | 1 | 6 |
| Visual Design | 1 | 1 | 3 | 1 | 6 |
| **Total** | **3** | **7** | **6** | **2** | **18** |

### Resolution Status

After fix mode execution:
- ✅ **16 issues resolved** (89%)
- ⚠️ **2 issues remaining** (11%)
- ❌ **0 new issues introduced**

---

## Metrics Dashboard

### Overall Scores

```
iOS HIG Compliance: 89% ⚠️
├─ Navigation:      95% ✅
├─ Touch Targets:  100% ✅
├─ Components:      80% ⚠️
└─ Visual Design:   92% ✅

Accessibility (WCAG AA): 94% ✅
Performance: 87% ✅
```

### Before/After Comparison

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Avg Touch Target Size | 28pt | 44pt | +57% ✅ |
| Color Contrast Ratio | 3.2:1 | 4.9:1 | +53% ✅ |
| Navigation Taps (avg) | 2.4 | 1.0 | -58% ✅ |
| Workflow Duration | 52s | 44s | -15% ✅ |

---

## Workflow Results

### 📱 Product Search Flow

**URL**: https://example.com
**Status**: ✅ Pass
**Duration**: 38s (was 45s, -16%)
**Steps**: 5/5 successful

<details>
<summary>View Steps</summary>

1. ✅ Navigate to homepage (3.2s)
2. ✅ Tap search icon (1.1s)
3. ✅ Enter search query (4.5s)
4. ✅ Submit search (2.8s)
5. ✅ Verify results (1.2s)

**Issues Found**: 3 (all resolved)
- Hamburger menu → Tab bar
- Small touch targets → 44pt minimum
- Custom dropdown → Native select

</details>

**Screenshots**: [View Gallery](workflows/screenshots/product-search-flow/)

---

[Additional workflows...]

---

## Detailed Findings

### Finding 1: Hamburger Menu Navigation ⚠️

**Severity**: High
**Category**: 📱 Navigation
**Status**: ✅ Fixed
**Workflow**: Product Search Flow

#### Current Implementation (Before)

The site used a hamburger menu icon (☰) in the top-left to hide primary navigation:

![Hamburger Menu](workflows/screenshots/product-search-flow/before/step-1.png)

#### iOS HIG Violation

> **Reference**: [HIG › Navigation › Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)

Hamburger menus are an anti-pattern on iOS because they:
- Hide navigation, reducing discoverability
- Require extra taps to access primary sections
- Create cognitive load (users must remember what's hidden)
- Conflict with iOS platform conventions

#### Impact

- 📊 **Discoverability**: Primary navigation hidden from view
- 🎯 **Efficiency**: +1 tap required to access any section
- ♿ **Accessibility**: Screen reader users must hunt for menu
- 📱 **Platform**: Inconsistent with iOS expectations

#### Solution Applied

Replaced hamburger menu with iOS-standard tab bar:

![Tab Bar](workflows/screenshots/product-search-flow/fixed/step-1.png)

**Changes Made**:
- Removed `.hamburger-menu` component
- Added `nav[role="tablist"]` with 5 items
- Positioned at bottom (iOS convention)
- Added translucent background with blur effect

<details>
<summary>View Code Changes</summary>

```html
<!-- REMOVED -->
<button class="hamburger-menu" aria-label="Menu">
  ☰
</button>

<!-- ADDED -->
<nav role="tablist" class="tab-bar">
  <button role="tab" aria-selected="true" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- Home --></svg>
    <span class="tab-label">Home</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- Search --></svg>
    <span class="tab-label">Search</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- Categories --></svg>
    <span class="tab-label">Categories</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- Cart --></svg>
    <span class="tab-label">Cart</span>
  </button>
  <button role="tab" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- Account --></svg>
    <span class="tab-label">Account</span>
  </button>
</nav>
```

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 49px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 8px;
  background: none;
  border: none;
  color: #8E8E93;
  transition: color 0.2s ease;
  cursor: pointer;
}

.tab-item[aria-selected="true"] {
  color: #007AFF;
}

.tab-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

@media (prefers-color-scheme: dark) {
  .tab-bar {
    background: rgba(28, 28, 30, 0.95);
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .tab-item[aria-selected="true"] {
    color: #0A84FF;
  }
}
```

</details>

#### Verification

✅ Tab bar detected in DOM
✅ 5 items present (within 3-5 HIG recommendation)
✅ Bottom placement confirmed
✅ Always visible (no toggle required)
✅ Navigation requires 0 extra taps

**Metrics**:
- Taps to navigate: 2.4 → 1.0 (-58%)
- Navigation discoverability: 45% → 100%

---

[Additional findings...]

---

## Recommendations

### Immediate Actions

1. **Address Remaining Issues**
   - Replace custom date picker with native `<input type="date">`
   - Apply tab bar pattern to desktop breakpoints

2. **Regression Prevention**
   - Add automated touch target size checks to CI
   - Integrate iOS HIG linting into build process

### Long-Term Improvements

1. **Mobile-First Design System**
   - Document iOS-compliant components
   - Create Figma library with HIG patterns
   - Train team on platform conventions

2. **Continuous Validation**
   - Schedule quarterly iOS HIG audits
   - Monitor analytics for navigation patterns
   - A/B test tab bar vs original hamburger

3. **Accessibility Enhancement**
   - Implement Dynamic Type support
   - Test with VoiceOver on real devices
   - Add high contrast mode support

---

## Appendix

### Methodology

1. **Workflow Definition**: Parsed from `/workflows/mobile-browser-workflows.md`
2. **Execution Engine**: Playwright MCP with 393×852px viewport
3. **User Agent**: iOS Safari 17.0
4. **Evaluation Framework**: iOS Human Interface Guidelines
5. **Measurement Tools**: Custom JavaScript utilities + browser APIs
6. **Verification**: Re-execution with before/after comparison

### Tools Used

- **Playwright MCP**: Browser automation
- **Claude Agent SDK**: Multi-agent orchestration
- **iOS HIG Audit Kit**: Custom measurement utilities
- **WCAG Contrast Checker**: Accessibility validation

### Session Artifacts

- **Findings**: `.claude/plans/mobile-browser-workflow-findings.md`
- **Verification**: `.claude/plans/mobile-browser-workflow-verification.md`
- **Screenshots**: `workflows/screenshots/` (64 files)
- **HTML Report**: `reports/mobile-browser-workflow-audit-mbwe-20260208-143022.html`

### References

- [Apple HIG - Navigation](https://developer.apple.com/design/human-interface-guidelines/navigation)
- [Apple HIG - Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple HIG - Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
```

**Output**: Comprehensive Markdown report saved to `reports/mobile-browser-workflow-audit-{session_id}.md`.

---

### Phase 12: Create PR and Monitor CI

**Objective**: Commit changes, create pull request, and monitor CI checks.

**Steps**:

1. **Stage Changes**

```bash
git add -A
```

2. **Create Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(mobile-ux): resolve iOS HIG violations in mobile browser workflows

Fixes identified in mobile browser workflow audit (session mbwe-20260208-143022):

CRITICAL:
- Increase touch targets to 44pt minimum (product cards, filters, footer)
- Replace hamburger menu with iOS tab bar navigation
- Fix color contrast ratios to meet WCAG AA (4.5:1)

HIGH:
- Replace custom dropdowns with native/iOS-style pickers
- Update button styles to match iOS design language
- Fix spacing to use 8pt grid system
- Implement proper modal presentation styles

MEDIUM:
- Update alert dialogs to iOS-standard style
- Add pull-to-refresh gesture support
- Fix visual hierarchy with proper typography scale

Files modified:
- components/header.html, footer.html
- styles/navigation.css, product-card.css, footer.css, filters.css
- scripts/nav.js, sort.js

Audit results:
- 18 issues identified
- 16 issues resolved (89%)
- 2 remaining (documented in reports/)

Reports:
- HTML: reports/mobile-browser-workflow-audit-mbwe-20260208-143022.html
- Markdown: reports/mobile-browser-workflow-audit-mbwe-20260208-143022.md
- Findings: .claude/plans/mobile-browser-workflow-findings.md
EOF
)"
```

3. **Create Branch and Push**

```bash
git checkout -b fix/mobile-ios-hig-violations
git push -u origin fix/mobile-ios-hig-violations
```

4. **Create Pull Request**

```bash
gh pr create --title "fix(mobile-ux): resolve iOS HIG violations" --body "$(cat <<'EOF'
## Summary

This PR resolves iOS Human Interface Guidelines violations identified in mobile browser workflow audit session `mbwe-20260208-143022`.

### Issues Resolved (16/18)

#### Critical
- ✅ Touch targets increased to 44pt minimum (was 10-38pt)
- ✅ Hamburger menu replaced with iOS tab bar
- ✅ Color contrast improved to WCAG AA compliance (4.5:1+)

#### High Priority
- ✅ Custom dropdowns → native/iOS-style pickers
- ✅ Button styles updated to iOS design language
- ✅ 8pt grid system implemented
- ✅ Modal presentation styles standardized

#### Medium Priority
- ✅ Alert dialogs → iOS-standard style
- ✅ Pull-to-refresh gesture added
- ✅ Typography hierarchy improved

### Remaining Issues (2)

- ⚠️ Custom date picker (requires component refactor - future sprint)
- ⚠️ Horizontal scroll in category nav (desktop breakpoint only)

## Test Plan

- [x] All mobile browser workflows execute successfully
- [x] Touch targets measured ≥44pt
- [x] Color contrast ratios verified ≥4.5:1
- [x] Tab bar navigation functional
- [x] Visual regression tests pass
- [ ] Manual QA on iOS Safari (iPhone 14 Pro)
- [ ] VoiceOver accessibility test

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| iOS HIG Compliance | 56% | 89% | +59% |
| Avg Touch Target | 28pt | 44pt | +57% |
| Navigation Taps | 2.4 | 1.0 | -58% |
| Contrast Ratio | 3.2:1 | 4.9:1 | +53% |

## Artifacts

- 📊 [HTML Report](reports/mobile-browser-workflow-audit-mbwe-20260208-143022.html)
- 📝 [Markdown Report](reports/mobile-browser-workflow-audit-mbwe-20260208-143022.md)
- 🔍 [Detailed Findings](.claude/plans/mobile-browser-workflow-findings.md)
- 🖼️ [Screenshots](workflows/screenshots/) (64 files)

## Screenshots

### Navigation: Hamburger → Tab Bar

| Before | After |
|--------|-------|
| ![Before](workflows/screenshots/product-search-flow/before/step-1.png) | ![After](workflows/screenshots/product-search-flow/fixed/step-1.png) |

### Touch Targets: Small → 44pt Minimum

| Before | After |
|--------|-------|
| ![Before](workflows/screenshots/product-search-flow/analysis/touch-targets-before.png) | ![After](workflows/screenshots/product-search-flow/analysis/touch-targets-after.png) |

## Deployment Notes

- No breaking changes
- No database migrations
- CSS and HTML changes only
- Backwards compatible with existing components

## Related Issues

Closes #123 (Mobile navigation UX issues)
Relates to #145 (iOS accessibility improvements)
EOF
)"
```

5. **Monitor CI**

```bash
# Watch CI status
gh pr checks --watch

# If failures occur, investigate
gh pr checks
```

6. **Handle CI Failures**

```python
ci_status = monitor_ci_checks()

if ci_status.has_failures():
    for failure in ci_status.failures:
        if failure.type == "visual_regression":
            # Expected - we changed UI intentionally
            print(f"✓ Visual regression detected (expected): {failure.details}")
            print("  → Update visual baselines after review")

        elif failure.type == "lint":
            # Unexpected - fix immediately
            print(f"✗ Linting error: {failure.details}")
            fix_lint_errors(failure)
            git_commit_and_push("fix: resolve linting errors")

        elif failure.type == "test":
            # Investigate
            print(f"✗ Test failure: {failure.test_name}")
            analyze_test_failure(failure)
```

**Task Completion**:

```python
TaskUpdate(
    task_id="mobile-browser-workflow-execution",
    status="completed",
    metadata={
        "phase": 12,
        "pr_number": pr_number,
        "pr_url": pr_url,
        "ci_status": "passing"
    }
)

# Save final session state
save_session_state({
    "session_id": "mbwe-20260208-143022",
    "status": "completed",
    "completed_at": timestamp,
    "pr_created": pr_url,
    "resolution_rate": "89%",
    "artifacts": {
        "html_report": "reports/mobile-browser-workflow-audit-mbwe-20260208-143022.html",
        "md_report": "reports/mobile-browser-workflow-audit-mbwe-20260208-143022.md",
        "findings": ".claude/plans/mobile-browser-workflow-findings.md",
        "screenshots": 64
    }
})
```

**Output**: PR created, CI passing, session complete.

---

## Task List Integration

This skill uses the Task tool extensively for session management and recovery.

### Task Hierarchy

```
mobile-browser-workflow-execution (master task)
├── workflow-product-search
│   ├── step-1-navigate
│   ├── step-2-tap-search
│   ├── step-3-type-query
│   ├── step-4-submit
│   └── step-5-verify
├── workflow-checkout-process
│   └── [steps...]
├── ux-platform-evaluation (delegated agent)
├── fix-mode-execution (parallel agents)
│   ├── fix-agent-navigation
│   ├── fix-agent-touch-targets
│   ├── fix-agent-color-contrast
│   └── fix-agent-components
├── local-verification (delegated agent)
├── html-report-generation (delegated agent)
└── markdown-report-generation (delegated agent)
```

### Session Recovery

When resuming a session:

1. **Load session state**: `.claude/tasks/mobile-browser-workflow-executor-session.json`
2. **Query incomplete tasks**: `TaskList()` → filter by status != "completed"
3. **Identify resume point**: Find earliest incomplete phase
4. **Skip completed work**: Don't re-execute successful workflows
5. **Continue from breakpoint**: Resume at incomplete phase

**Example Recovery Scenario**:

```
User interrupted session at Phase 4 (UX evaluation in progress)

Recovery sequence:
1. Load session: mbwe-20260208-143022
2. TaskList shows:
   - workflow-product-search: ✅ completed
   - workflow-checkout-process: ✅ completed
   - workflow-cart-management: ⏳ in_progress (Step 3/8)
   - ux-platform-evaluation: ❌ not started
3. Resume decision:
   Option A: Continue workflow-cart-management at Step 4
   Option B: Mark workflow-cart-management completed, proceed to Phase 4
4. User chooses Option A
5. Execute steps 4-8 of cart-management workflow
6. Proceed to Phase 4 (UX evaluation)
```

### Task Metadata Examples

```python
# Master task
TaskCreate(
    name="mobile-browser-workflow-execution",
    description="Execute all mobile browser workflows with iOS HIG validation",
    metadata={
        "session_id": "mbwe-20260208-143022",
        "mode": "audit",
        "engine": "playwright",
        "viewport": "393x852",
        "total_workflows": 5,
        "started_at": "2026-02-08T14:30:22Z"
    }
)

# Workflow task
TaskCreate(
    name="workflow-product-search",
    description="Execute Product Search Flow",
    parent_id="mobile-browser-workflow-execution",
    metadata={
        "url": "https://example.com",
        "total_steps": 5,
        "current_step": 0,
        "findings": []
    }
)

# Step task
TaskCreate(
    name="step-2-tap-search",
    description="Tap search icon in header",
    parent_id="workflow-product-search",
    metadata={
        "action": "Tap",
        "target": "Search icon",
        "expected": "Search input appears"
    }
)

# Update on completion
TaskUpdate(
    task_id="step-2-tap-search",
    status="completed",
    metadata={
        "duration": "1.1s",
        "screenshot_before": "workflows/screenshots/product-search/before/step-2.png",
        "screenshot_after": "workflows/screenshots/product-search/after/step-2.png",
        "issues_found": 0
    }
)

# Delegated agent task
TaskCreate(
    name="ux-platform-evaluation",
    description="Perform iOS HIG evaluation on all workflows",
    parent_id="mobile-browser-workflow-execution",
    metadata={
        "phase": 4,
        "agent_type": "deep_analysis",
        "delegation_reason": "Complex iOS HIG analysis requiring deep inspection"
    }
)
```

---

## MCP Tool Reference

### Playwright MCP Tools (Primary Engine)

| Tool | Purpose | Mobile Usage |
|------|---------|--------------|
| `browser_resize` | Set viewport size | Set to 393x852 (iPhone 14 Pro) |
| `browser_navigate` | Load URL | Navigate to workflow start |
| `browser_snapshot` | Get accessibility tree | Discover elements for interaction |
| `browser_take_screenshot` | Capture visual state | Document before/after states |
| `browser_click` | Click element | Simulate tap interaction |
| `browser_type` | Enter text | Simulate keyboard input |
| `browser_evaluate` | Run JavaScript | Measure elements, override UA, inject utilities |
| `browser_wait_for` | Wait for condition | Wait for elements or time |
| `browser_fill_form` | Fill multiple fields | Batch form completion |
| `browser_select_option` | Select dropdown option | Choose from native select |
| `browser_press_key` | Press keyboard key | Submit forms, navigate |
| `browser_swipe` | Scroll gesture | Mobile-specific scrolling |

### Claude-in-Chrome Tools (Alternative Engine)

| Tool | Purpose | Mobile Usage |
|------|---------|--------------|
| `tabs_context_mcp` | Get tab context | Initialize session |
| `tabs_create_mcp` | Create new tab | Start workflow in fresh tab |
| `resize_window` | Resize browser | Best-effort mobile viewport |
| `navigate` | Load URL | Navigate to workflow start |
| `read_page` | Get accessibility tree | Discover elements |
| `find` | Search for elements | Natural language element discovery |
| `computer` (screenshot) | Capture screen | Document visual state |
| `computer` (left_click) | Click element | Simulate tap |
| `computer` (type) | Enter text | Keyboard input |
| `computer` (scroll) | Scroll page | Simulate swipe |
| `javascript_tool` | Execute JS | Override UA, measure elements |
| `form_input` | Set form values | Batch form completion |

### Tool Selection Strategy

**Use Playwright MCP when**:
- Starting fresh session
- Need precise viewport control
- Require mobile-specific emulation
- Want programmatic element selection

**Use Claude-in-Chrome when**:
- User prefers existing browser
- Need to interact with authenticated sessions
- Want visual debugging in real browser
- Viewport precision less critical

---

## Known Limitations

### Platform Constraints

1. **Native Dialogs**
   - Cannot interact with system-level alerts (permissions, camera access)
   - Workaround: Mock in test environment

2. **File Uploads**
   - Limited mobile camera/photo library simulation
   - Workaround: Use predefined test files

3. **Keyboard Shortcuts**
   - iOS keyboard behavior differs from desktop
   - Workaround: Use explicit button taps instead of shortcuts

4. **OAuth Flows**
   - Third-party auth may redirect to native apps
   - Workaround: Use test accounts with web-only auth

### Mobile-Specific Challenges

1. **Touch Gestures**
   - Complex gestures (pinch-zoom, 3D Touch) not fully supported
   - Workaround: Test core interactions only

2. **Network Conditions**
   - Cannot simulate 3G/4G/5G speeds natively
   - Workaround: Use Playwright's network throttling

3. **Device Sensors**
   - Accelerometer, gyroscope not available in emulation
   - Workaround: Manual testing on real devices

4. **iOS-Specific Features**
   - Haptic feedback, Dynamic Island not testable
   - Workaround: Document as manual test cases

---

## Guidelines and Best Practices

### Workflow Design

1. **Keep Workflows Focused**
   - One user journey per workflow
   - 5-10 steps maximum
   - Clear expected outcomes

2. **Use Descriptive Targets**
   - "Search icon in header" not "button.search"
   - Helps with element discovery
   - Improves error messages

3. **Include Verification Steps**
   - Don't just execute, verify results
   - Check for expected elements after actions
   - Capture screenshots at key moments

### iOS HIG Evaluation

1. **Prioritize User Impact**
   - Critical: Blocks task completion
   - High: Significant frustration
   - Medium: Minor inconvenience
   - Low: Aesthetic preference

2. **Provide Specific Solutions**
   - Don't just identify problems
   - Include code examples
   - Reference HIG documentation
   - Show before/after visuals

3. **Consider Context**
   - Mobile-web vs native app patterns
   - Progressive enhancement
   - Backwards compatibility

### Error Handling

1. **Retry Transient Failures**
   - Network timeouts: retry 2x
   - Element not found: wait and retry
   - Screenshot failures: non-blocking

2. **Document Persistent Issues**
   - Add to findings even if workflow continues
   - Include error messages
   - Suggest alternative approaches

3. **Graceful Degradation**
   - Optional steps can fail without aborting
   - Required steps must succeed or abort
   - Always capture state before failure

---

## Handling Failures

### Workflow Execution Failures

**Scenario**: Step fails due to element not found

```python
try:
    await browser_click({ ref: target_ref })
except ElementNotFoundError:
    # Take diagnostic screenshot
    await browser_take_screenshot({
        filename: f"workflows/screenshots/{workflow}/errors/step-{num}-not-found.png"
    })

    # Try alternative selector
    snapshot = await browser_snapshot()
    alternative_ref = find_alternative_element(snapshot, target_description)

    if alternative_ref:
        await browser_click({ ref: alternative_ref })
    else:
        # Document failure
        log_finding({
            "severity": "high",
            "category": "workflow_failure",
            "step": num,
            "error": "Element not found",
            "target": target_description,
            "screenshot": f"workflows/screenshots/{workflow}/errors/step-{num}-not-found.png"
        })

        # Decide: continue or abort?
        if step.get("required", True):
            raise WorkflowError("Required step failed")
        else:
            print(f"⚠️ Optional step {num} failed, continuing...")
```

### iOS HIG Evaluation Failures

**Scenario**: Measurement script fails to execute

```python
try:
    measurements = await browser_evaluate({
        function: "() => iOSHIGAudit.measureTouchTargets()"
    })
except JavaScriptError as e:
    # Fallback to manual measurement
    print("⚠️ Automated measurement failed, using fallback approach")

    snapshot = await browser_snapshot()
    measurements = manual_touch_target_analysis(snapshot)

    log_warning({
        "issue": "Automated measurement failed",
        "fallback": "Manual analysis used",
        "accuracy": "Lower precision"
    })
```

### Fix Application Failures

**Scenario**: CSS fix causes syntax error

```python
# Validate before applying
fix_content = generate_css_fix(finding)

if not validate_css_syntax(fix_content):
    print(f"❌ Generated CSS is invalid:")
    print(fix_content)

    # Try to auto-correct
    corrected = auto_correct_css(fix_content)

    if validate_css_syntax(corrected):
        print("✓ Auto-corrected syntax error")
        fix_content = corrected
    else:
        # Skip this fix, document issue
        log_error({
            "fix": finding.id,
            "error": "Invalid CSS generated",
            "content": fix_content,
            "action": "Skipped, manual intervention required"
        })
        return
```

---

## Session Recovery Decision Tree

```
┌─────────────────────────────────────────────────────────┐
│ Mobile Browser Workflow Executor Started                │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │ Session file exists?  │
              └───────────────────────┘
                    ↙          ↘
                 YES            NO
                  ↓              ↓
      ┌─────────────────┐   ┌──────────────────┐
      │ Load session    │   │ Create new       │
      │ mbwe-XXXXXX     │   │ session          │
      └─────────────────┘   └──────────────────┘
              ↓                      ↓
      ┌─────────────────┐   ┌──────────────────┐
      │ Prompt user:    │   │ Phase 1:         │
      │ Resume? (Y/N)   │   │ Read workflows   │
      └─────────────────┘   └──────────────────┘
            ↙      ↘
         YES        NO
          ↓          ↓
  ┌──────────┐  ┌──────────┐
  │ TaskList │  │ Archive  │
  │ query    │  │ old      │
  └──────────┘  └──────────┘
          ↓          ↓
  ┌──────────────────────────┐
  │ Find incomplete tasks    │
  └──────────────────────────┘
          ↓
  ┌──────────────────────────────────────────┐
  │ What's incomplete?                       │
  └──────────────────────────────────────────┘
    ↙            ↓            ↓           ↘
Phase 3       Phase 4      Phase 8     Phase 11
(Workflow)   (UX Eval)   (Fix Mode)  (Reports)
    ↓            ↓            ↓           ↓
Resume at    Resume at    Resume at   Resume at
Step X       Evaluation   Fix agent   Report gen
```

---

## Example Invocations

### Basic Audit

```
User: "Run mobile browser workflows"
