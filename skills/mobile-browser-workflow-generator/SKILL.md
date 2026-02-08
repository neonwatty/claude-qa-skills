---
name: mobile-browser-workflow-generator
description: Generates, creates, or updates mobile browser workflow files for testing web apps with Chrome mobile viewport emulation. Use this when the user says "generate mobile browser workflows", "create mobile browser workflows", "update mobile browser workflows", or "iterate on mobile browser workflows". Thoroughly explores the web app's codebase to discover all user-facing features, pages, and interactions. Creates comprehensive numbered workflows with substeps that cover the full mobile user experience.
---

# Mobile Browser Workflow Generator Skill

You are a senior QA engineer tasked with creating comprehensive workflow documentation for testing **web applications in Chrome with mobile viewport emulation (iPhone 15 Pro: 393x852)**. Your job is to deeply explore the web application codebase and generate thorough, testable workflows using Playwright MCP that verify the app works correctly and follows iOS UX conventions when viewed on a mobile browser.

**Important:** This skill is for testing web apps (React, Vue, HTML/CSS/JS, etc.) running in Chrome with a mobile viewport. These web apps are intended to become **PWAs or wrapped native apps** (via Capacitor, Tauri, etc.) and should feel **indistinguishable from native iOS apps**. The UX bar is native iOS quality, not just "mobile-friendly web."

## Task List Integration

**CRITICAL:** This skill uses Claude Code's task list system for progress tracking and session recovery. You MUST use TaskCreate, TaskUpdate, and TaskList tools throughout execution.

### Why Task Lists Matter Here
- **Parallel agent tracking:** Monitor 3 exploration agents completing simultaneously
- **Progress visibility:** User sees "Exploring: 2/3 agents complete"
- **Session recovery:** If interrupted, know which agents finished and what they found
- **Iteration tracking:** Track multiple approval rounds with user
- **Mobile-specific tracking:** Record iOS anti-patterns found, HIG compliance checks

### Task Hierarchy
```
[Main Task] "Generate: Mobile Browser Workflows"
  └── [Explore Task] "Explore: Pages & Navigation" (agent)
  └── [Explore Task] "Explore: UI Components & Interactions" (agent)
  └── [Explore Task] "Explore: Data & State" (agent)
  └── [Research Task] "Research: iOS HIG Conventions" (agent)
  └── [Generate Task] "Generate: Workflow Drafts"
  └── [Approval Task] "Approval: User Review #1"
  └── [Write Task] "Write: mobile-browser-workflows.md"
```

### Session Recovery Check
**At the start of this skill, always check for existing tasks:**
```
1. Call TaskList to check for existing mobile browser workflow generator tasks
2. If a "Generate: Mobile Browser Workflows" task exists with status in_progress:
   - Check which exploration tasks completed (read their metadata for findings)
   - Check if iOS HIG research completed
   - Check if drafts were generated
   - Resume from appropriate phase
3. If no tasks exist, proceed with fresh execution
```

## Process

### Phase 1: Assess Current State

**Create the main workflow generator task:**
```
TaskCreate:
- subject: "Generate: Mobile Browser Workflows"
- description: |
    Generate comprehensive mobile browser workflow documentation.
    Starting: assess current state
- activeForm: "Assessing current state"

TaskUpdate:
- taskId: [main task ID]
- status: "in_progress"
```

1. Check if `/workflows/mobile-browser-workflows.md` already exists
2. If it exists, read it and note:
   - What workflows are already documented
   - What might be outdated or incomplete
   - What's missing based on your knowledge of the app
3. Ask the user their goal:
   - **Create new:** Generate workflows from scratch
   - **Update:** Add new workflows for new features
   - **Refactor:** Reorganize or improve existing workflows
   - **Audit:** Check existing workflows against current app state

**Update task with assessment results:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "existingFile": true/false,
    "existingWorkflowCount": [N],
    "userGoal": "create" | "update" | "refactor" | "audit"
  }
```

### Phase 2: Explore the Web Application [DELEGATE TO AGENTS]

**Purpose:** Thoroughly understand the web app by launching multiple Explore agents in parallel. This saves context and allows comprehensive codebase exploration.

**Create exploration tasks before spawning agents:**
```
TaskCreate (3 tasks in parallel):

Task 1:
- subject: "Explore: Pages & Navigation"
- description: "Find all pages, navigation patterns, and entry points"
- activeForm: "Exploring pages"

Task 2:
- subject: "Explore: UI Components & Interactions"
- description: "Find all interactive UI components and touch interactions"
- activeForm: "Exploring components"

Task 3:
- subject: "Explore: Data & State"
- description: "Understand data model and user CRUD actions"
- activeForm: "Exploring data model"

Then for each:
TaskUpdate:
- taskId: [explore task ID]
- addBlockedBy: [main task ID]  # Links to main task
- status: "in_progress"
```

**Use the Task tool to spawn three agents in parallel (all in a single message):**

```
Agent 1 - Pages & Navigation:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to find all pages and navigation patterns.
    This app will be tested in Chrome mobile viewport (iPhone 15 Pro: 393x852).

    ## What to Find

    1. **All Pages/Routes**
       - Search for router configuration (React Router, Next.js pages, Vue Router, etc.)
       - Find all page/view components
       - Identify URL patterns and parameters

    2. **Navigation Patterns**
       - Find navigation components (tabs, sidebars, menus)
       - Identify modal/sheet presentations
       - Map how users move between pages
       - Note any gesture-based navigation

    3. **Entry Points**
       - Find the main entry URL (likely localhost:5173 or similar)
       - Identify deep links or bookmarkable URLs
       - Note any authentication-gated routes

    ## Return Format

    ```
    ## Pages & Navigation Report

    ### All Pages
    | Route | Component | Purpose | Auth Required |
    |-------|-----------|---------|---------------|

    ### Navigation Structure
    - Primary nav: [tab bar / sidebar / etc.]
    - Secondary nav: [description]
    - Modal presentations: [list]

    ### Base URL
    - Development: [URL]
    - Production: [URL if found]
    ```
```

```
Agent 2 - UI Components & Interactions:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to find all interactive UI components.
    This app will be tested in Chrome mobile viewport, so note touch-friendliness.

    ## What to Find

    1. **Interactive Components**
       - Buttons, links, tappable elements
       - Form inputs (text, select, toggle, date picker)
       - Modals, sheets, drawers
       - Drag-drop areas, lists

    2. **Touch Interactions**
       - Find gesture handlers (swipe, pinch, long press)
       - Note touch event listeners
       - Identify touch target sizes (should be 44pt+)

    3. **Component Patterns**
       - Identify component libraries used
       - Note iOS-style vs web-style components
       - Find accessibility labels/attributes

    ## Return Format

    ```
    ## UI Components Report

    ### Interactive Components by Page
    #### [Page Name]
    - Buttons: [list with approximate sizes]
    - Forms: [inputs and their types]
    - Gestures: [swipe/pinch handlers if any]

    ### Touch Considerations
    - Components with small touch targets: [list]
    - Gesture-dependent interactions: [list]

    ### Component Library
    - Using: [library name or "custom"]
    - iOS-native feel: [yes/no/partial]
    ```
```

```
Agent 3 - Data & State:
Task tool parameters:
- subagent_type: "Explore"
- model: "sonnet"
- prompt: |
    You are exploring a web application to understand its data model and user actions.

    ## What to Find

    1. **Data Model**
       - Find state management (Redux, Zustand, Context, etc.)
       - Identify main data entities/types
       - Note data relationships

    2. **User Actions (CRUD)**
       - What can users create?
       - What can users read/view?
       - What can users update/edit?
       - What can users delete?

    3. **API & Persistence**
       - Find API call patterns
       - Identify endpoints used
       - Note localStorage/sessionStorage/cookies usage
       - Find offline/caching strategies

    ## Return Format

    ```
    ## Data & State Report

    ### Data Entities
    | Entity | Properties | CRUD Operations |
    |--------|------------|-----------------|

    ### User Actions
    - Create: [list]
    - Read: [list]
    - Update: [list]
    - Delete: [list]

    ### Persistence
    - API base: [URL if found]
    - Local storage keys: [list]
    - Offline support: [yes/no]
    ```
```

**After each agent returns, update its task:**
```
TaskUpdate:
- taskId: [explore task ID]
- status: "completed"
- metadata: {
    "pagesFound": [count],           # For pages agent
    "componentsFound": [count],      # For components agent
    "touchInteractions": [count],    # For components agent
    "entitiesFound": [count],        # For data agent
    "summary": "[brief summary of findings]"
  }
```

**After all agents return:** Synthesize findings into a feature inventory:
- List all user-facing pages/views
- Group by section of the app
- Note the base URL and navigation paths

**Update main task with exploration summary:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "explorationComplete": true,
    "pagesFound": [total],
    "componentsFound": [total],
    "entitiesFound": [total],
    "baseUrl": "[discovered URL]"
  }
```

### Phase 3: Identify User Journeys

**Update main task for journey identification phase:**
```
TaskUpdate:
- taskId: [main task ID]
- activeForm: "Identifying user journeys"
```

Based on exploration, identify key user journeys:

**Core Journeys** (every user does these):
- Initial page load and onboarding
- Primary task completion
- Navigation between main sections

**Feature Journeys** (specific feature usage):
- Each major feature should have its own workflow
- Include happy path and key variations

**Edge Case Journeys** (important but less common):
- Error handling flows
- Empty states
- Settings/preferences
- Offline behavior
- Permission requests (camera, location, notifications)

**Update main task with journey counts:**
```
TaskUpdate:
- taskId: [main task ID]
- metadata: {
    "coreJourneys": [count],
    "featureJourneys": [count],
    "edgeCaseJourneys": [count],
    "totalWorkflows": [total]
  }
```

### Phase 4: Research iOS HIG Conventions [DELEGATE TO AGENT]

**Purpose:** For each major screen type identified, research what good iOS UX looks like. The app should feel indistinguishable from a native iOS app. Delegate this to an agent to save context.

**Create iOS HIG research task:**
```
TaskCreate:
- subject: "Research: iOS HIG Conventions"
- description: |
    Research iOS Human Interface Guidelines conventions for identified screen types.
    Screen types: [list from Phase 3]
- activeForm: "Researching iOS conventions"

TaskUpdate:
- taskId: [research task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

**Use the Task tool to spawn a UX research agent:**

```
Task tool parameters:
- subagent_type: "general-purpose"
- model: "sonnet"
- prompt: |
    You are researching iOS UX conventions for a mobile browser workflow generator.
    The web app being tested should feel like a native iOS app when viewed on mobile.

    ## Screen Types to Research
    [Include list of screen types identified from Phase 2/3, e.g.:]
    - Login screen
    - Settings page
    - List view
    - Detail view
    - Onboarding flow
    - Search interface

    ## Your Task

    For each screen type:

    1. **Search for reference examples** using WebSearch:
       - "iOS [screen type] design Dribbble"
       - "best iOS [screen type] UI examples"
       - "[well-known iOS app like Airbnb/Spotify] [screen type] screenshot"
       - "iOS Human Interface Guidelines [component]"

    2. **Visit 2-3 reference examples** to understand iOS conventions

    3. **Document iOS UX conventions** for each screen type

    ## Return Format

    For each screen type, return:
    ```
    ### Screen: [Screen Type]
    **Reference Examples:** [iOS apps compared]
    **Expected iOS Conventions:**
    - [Convention 1 - specific to iOS]
    - [Convention 2]
    - [Convention 3]
    **Anti-patterns to flag (things that feel "webby"):**
    - [Anti-pattern 1 - why it breaks iOS feel]
    - [Anti-pattern 2]
    ```

    ## Example Output

    ### Screen: Login Screen
    **Reference Examples:** Airbnb, Spotify, Instagram
    **Expected iOS Conventions:**
    - Large, centered logo or app name
    - Email/password fields using native iOS text field styling
    - Social login buttons with standard iOS button height (50pt)
    - "Forgot Password" as text link, not button
    - Sign up CTA clearly visible but secondary to login
    - Keyboard avoidance - form should scroll when keyboard appears
    **Anti-patterns to flag:**
    - Web-style dropdown for country code (should use iOS picker)
    - Tiny touch targets on social buttons (<44pt)
    - Hamburger menu visible on login screen
    - Material Design styled inputs
```

**After agent returns:**
```
TaskUpdate:
- taskId: [research task ID]
- status: "completed"
- metadata: {
    "screenTypesResearched": [count],
    "iosConventionsDocumented": [count],
    "antiPatternsIdentified": [count],
    "referenceAppsCompared": ["Airbnb", "Spotify", "Instagram"]
  }
```

Include iOS UX expectations in workflows so the executor knows what to verify for each screen type.

### Phase 5: Generate Workflows

**Create workflow generation task:**
```
TaskCreate:
- subject: "Generate: Workflow Drafts"
- description: |
    Generate [N] mobile browser workflow drafts based on exploration and HIG research.
    Core: [count], Feature: [count], Edge Case: [count]
- activeForm: "Generating mobile browser workflow drafts"

TaskUpdate:
- taskId: [generate task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

For each journey, create a workflow with this structure:

```markdown
## Workflow: [Descriptive Name]

> [Brief description of what this workflow tests and why it matters]

**URL:** [https://localhost:5173/app or production URL]
**Device:** iPhone 15 Pro (393x852)

1. [Top-level step]
   - [Substep with specific detail]
   - [Substep with expected outcome]
2. [Next top-level step]
   - [Substep]
3. Verify [expected final state]
```

**Guidelines for writing steps:**
- Be specific: "Tap the blue 'Add' button in the top-right corner" not "Tap add"
- Include expected outcomes: "Verify the modal sheet slides up" not just "Open modal"
- Use consistent language: Navigate, Tap, Type, Verify, Swipe, Long press, Wait
- Use mobile-specific terminology: "Tap" not "Click", "Swipe" not "Scroll"
- Group related actions under numbered steps with substeps
- Include wait conditions where animations or loading matters

### Phase 6: Organize & Draft

**Mark generation task as complete:**
```
TaskUpdate:
- taskId: [generate task ID]
- status: "completed"
- metadata: {
    "workflowsGenerated": [count],
    "totalSteps": [count],
    "coreWorkflows": [list of names],
    "featureWorkflows": [list of names],
    "edgeCaseWorkflows": [list of names],
    "iosHigChecksIncluded": true
  }
```

**Update main task for organization phase:**
```
TaskUpdate:
- taskId: [main task ID]
- activeForm: "Organizing mobile browser workflows"
```

Structure the document:

```markdown
# Mobile Browser Workflows

> Auto-generated workflow documentation for [App Name]
> Last updated: [Date]
> Base URL: [https://localhost:5173/app or production URL]
> Platform: Web app tested in Chrome with mobile viewport
> Device: iPhone 15 Pro (393x852)

## Quick Reference

| Workflow | Purpose | Steps |
|----------|---------|-------|
| [Name] | [Brief] | [Count] |

---

## Core Workflows

### Workflow: [Name]
...

## Feature Workflows

### Workflow: [Name]
...

## Edge Case Workflows

### Workflow: [Name]
...
```

**Do not write to file yet - proceed to Phase 7 for user approval first.**

### Phase 7: Review with User (REQUIRED)

**This step is mandatory. Do not write the final file without user approval.**

**Create approval task:**
```
TaskCreate:
- subject: "Approval: User Review #1"
- description: |
    Present mobile browser workflows to user for approval.
    Workflows: [count]
    Awaiting user decision.
- activeForm: "Awaiting user approval"

TaskUpdate:
- taskId: [approval task ID]
- addBlockedBy: [main task ID]
- status: "in_progress"
```

After generating the workflows, use `AskUserQuestion` to get explicit approval:

1. **Present a summary** to the user:
   - Total workflows generated (list each by name)
   - Screens/features covered
   - iOS HIG checks included
   - Any gaps or areas you couldn't fully cover
   - Anything that needs manual verification

2. **Use AskUserQuestion** to ask:
   - "Do these workflows cover all the key user journeys?"
   - Provide options: Approve / Add more workflows / Modify existing / Start over

3. **If user wants additions or changes:**

   **Update approval task as needing changes:**
   ```
   TaskUpdate:
   - taskId: [approval task ID]
   - subject: "Approval: User Review #1 - changes requested"
   - status: "completed"
   - metadata: {"decision": "changes_requested", "feedback": "[user feedback]"}
   ```

   **Create new approval task for next round:**
   ```
   TaskCreate:
   - subject: "Approval: User Review #2"
   - description: |
       Second review round after changes.
       Changes made: [list of changes]
   - activeForm: "Awaiting user approval (round 2)"
   ```

   - Ask specifically what workflows to add or modify
   - Generate the additional/modified workflows
   - Return to step 1 and present updated summary
   - Repeat until user approves

4. **Only after explicit approval:**

   **Update approval task as approved:**
   ```
   TaskUpdate:
   - taskId: [approval task ID]
   - subject: "Approval: User Review #[N] - approved ✅"
   - status: "completed"
   - metadata: {"decision": "approved", "reviewRounds": [N]}
   ```

   Write to `/workflows/mobile-browser-workflows.md`

**Example AskUserQuestion usage:**

```
Question: "I've identified [N] workflows covering [screens/features]. Do these look complete?"
Options:
- "Yes, looks good - write the file"
- "Add more workflows"
- "Modify some workflows"
- "Let me describe what's missing"
```

### Phase 8: Write File and Complete

**Create write task:**
```
TaskCreate:
- subject: "Write: mobile-browser-workflows.md"
- description: "Write approved mobile browser workflows to file"
- activeForm: "Writing mobile browser workflow file"

TaskUpdate:
- taskId: [write task ID]
- status: "in_progress"
```

**Write the file to `/workflows/mobile-browser-workflows.md`**

**Mark write task as complete:**
```
TaskUpdate:
- taskId: [write task ID]
- status: "completed"
- metadata: {"outputPath": "/workflows/mobile-browser-workflows.md", "workflowCount": [N]}
```

**Mark main task as complete:**
```
TaskUpdate:
- taskId: [main task ID]
- status: "completed"
- metadata: {
    "outputPath": "/workflows/mobile-browser-workflows.md",
    "workflowCount": [N],
    "reviewRounds": [N],
    "explorationAgents": 3,
    "iosHigResearch": true,
    "baseUrl": "[URL]"
  }
```

**Final summary from task data:**
```
## Mobile Browser Workflows Generated

**File:** /workflows/mobile-browser-workflows.md
**Workflows:** [count from task metadata]
**Review rounds:** [count from approval task metadata]
**Base URL:** [from main task metadata]
**Device:** iPhone 15 Pro (393x852)

### Exploration Summary
- Pages found: [from explore task metadata]
- UI components found: [from explore task metadata]
- Data entities: [from explore task metadata]

### iOS HIG Research
- Screen types researched: [from research task metadata]
- Conventions documented: [from research task metadata]
- Anti-patterns to check: [from research task metadata]

### Workflows Created
[List from generate task metadata]

The workflows are ready to be executed with Playwright MCP.
```

### Session Recovery

If resuming from an interrupted session:

**Recovery decision tree:**
```
TaskList shows:
├── Main task in_progress, no explore tasks
│   └── Start Phase 2 (exploration)
├── Main task in_progress, some explore tasks completed
│   └── Check which agents finished, spawn remaining
├── Main task in_progress, all explore tasks completed, no research task
│   └── Start Phase 4 (iOS HIG research)
├── Main task in_progress, research completed, no generate task
│   └── Start Phase 5 (generate workflows)
├── Main task in_progress, generate completed, no approval task
│   └── Start Phase 7 (user review)
├── Main task in_progress, approval task in_progress
│   └── Present summary to user again
├── Main task in_progress, approval completed (approved), no write task
│   └── Start Phase 8 (write file)
├── Main task completed
│   └── Show final summary
└── No tasks exist
    └── Fresh start (Phase 1)
```

**Resuming with partial exploration:**
If some exploration agents completed but others didn't:
1. Read completed agent findings from task metadata
2. Spawn only the missing agents
3. Combine all findings when all complete

**Always inform user when resuming:**
```
Resuming mobile browser workflow generation session:
- Exploration: [N]/3 agents complete
- iOS HIG Research: [complete/pending]
- Workflows generated: [count or "pending"]
- Approval: [status]
- Resuming: [next action]
```

## Workflow Writing Standards

**Step Types:**

| Action | Format | Example |
|--------|--------|---------|
| Navigate | Navigate to [URL] | Navigate to http://localhost:5173/ |
| Tap | Tap [specific element] | Tap the "Save" button |
| Type | Type "[text]" in [field] | Type "john@email.com" in email field |
| Swipe | Swipe [direction] on [element/screen] | Swipe left on the list item |
| Long press | Long press [element] | Long press the photo thumbnail |
| Verify | Verify [expected state] | Verify success message appears |
| Wait | Wait for [condition] | Wait for loading indicator to disappear |
| Scroll | Scroll [direction] to [element/position] | Scroll down to "Settings" section |

## Automation-Friendly Workflow Guidelines

When writing workflows, consider what can and cannot be automated by Playwright MCP in Chrome mobile viewport:

### Mark Non-Automatable Steps

Use `[MANUAL]` tag for steps that require manual verification:

```markdown
3. Grant camera permission
   - [MANUAL] Click "Allow" on browser permission prompt
   - Note: Browser permission dialogs cannot be automated in Playwright

4. Test OAuth login flow
   - [MANUAL] Complete OAuth authentication in popup window
   - Note: OAuth popups may require manual interaction
```

### Known Automation Limitations

These interactions **cannot** be automated and should include `[MANUAL]` tags or workarounds:

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| Browser permission dialogs | Camera, Location, Notifications | Mark [MANUAL], pre-configure permissions |
| OAuth popups | Third-party login flows | Mark [MANUAL] or use test auth endpoints |
| File uploads | Native file picker dialogs | Use Playwright's file input automation |
| Native browser alerts | alert(), confirm(), prompt() | Playwright can handle these automatically |
| Print dialogs | Print preview | Mark [MANUAL] |
| System-level interactions | Clipboard, native share sheet | May have limited support |

### Playwright MCP Capabilities

Playwright MCP provides powerful automation for mobile browser testing:

**What CAN be automated:**
- Navigation and URL changes
- Element clicks/taps (with coordinate-based interaction)
- Text input and form filling
- Drag and drop operations
- Scrolling and swiping gestures
- JavaScript execution in page context
- Screenshot capture
- Network request monitoring
- Console message reading
- File input via programmatic upload

**Best practices:**
- Use accessibility snapshots to locate elements
- Verify mobile viewport size (393x852)
- Include wait conditions for animations
- Test touch target sizes (44x44pt minimum)
- Check safe area content positioning

### Include Prerequisites for Automation

When workflows require specific setup:

```markdown
## Workflow: Photo Upload Flow

**Prerequisites for automation:**
- Browser permissions pre-configured for camera/files
- Test image files accessible at known paths
- Mobile viewport set to iPhone 15 Pro (393x852)

> Tests uploading a new photo via file input.

1. Open photo upload interface
   ...
```

### Mobile-Specific Considerations

**Touch targets:**
```markdown
4. Verify touch target sizes
   - Verify all interactive elements are at least 44x44pt
   - Verify adequate spacing between tappable elements (8pt minimum)
   - Verify thumb reach zones for primary actions
```

**Safe areas:**
```markdown
5. Verify safe area handling
   - Verify content respects iPhone notch/Dynamic Island
   - Verify no important content in top 44pt or bottom 34pt
   - Verify navigation bar accounts for safe area insets
```

**Orientation:**
```markdown
6. Test orientation changes [MANUAL]
   - [MANUAL] Rotate device to landscape
   - Verify layout adapts correctly
   - Verify navigation remains accessible
   - [MANUAL] Rotate back to portrait
```

**Substep Format:**
- Use bullet points under numbered steps
- Include specific selectors or descriptions
- Note expected intermediate states
- Use mobile interaction terminology

**Example Workflow:**

```markdown
## Workflow: Create New Item

> Tests the complete flow of creating a new item from the home page.

**URL:** http://localhost:5173/
**Device:** iPhone 15 Pro (393x852)

1. Navigate to the app
   - Navigate to http://localhost:5173/
   - Wait for home page to load
   - Verify navigation is visible

2. Open creation flow
   - Tap the "+" button in top-right corner
   - Wait for modal animation to complete
   - Verify "New Item" modal appears
   - Verify form fields are empty

3. Fill in item details
   - Tap the "Title" text field
   - Type "My Test Item"
   - Tap the "Category" dropdown
   - Select "Personal" from the list
   - Verify selection is shown

4. Save the item
   - Tap "Save" button
   - Wait for modal to close
   - Verify item appears in list
   - Verify item shows "My Test Item" title

5. Verify persistence
   - Refresh the page
   - Wait for content to reload
   - Verify "My Test Item" still appears in list

6. Verify mobile UX conventions
   - Verify "Save" button was at least 44x44pt
   - Verify form scrolled when keyboard appeared
   - Verify modal slid up from bottom (iOS pattern)
   - Verify navigation follows iOS conventions
```

## Native iOS Feel Requirements

Since these web apps will become PWAs or wrapped apps, they must feel **native to iOS**:

**Navigation (must feel like native iOS):**
- Use tab bars for primary navigation, not hamburger menus
- Navigation should push/pop like native UINavigationController
- Back gestures should work naturally (or provide back button)
- Modals should slide up from bottom like native sheets

**Touch & Interaction:**
- All tap targets must be at least 44x44pt
- Consider thumb reach zones for primary actions
- Animations should feel native (spring physics, not CSS ease-in-out)
- Provide appropriate visual feedback for taps

**Components (should match native iOS):**
- Use iOS-style pickers, not web dropdowns
- Toggle switches, not checkboxes
- iOS-style action sheets, not Material Design
- Native-feeling form inputs

**Visual Design:**
- Follow iOS Human Interface Guidelines typography
- Subtle shadows and rounded corners (not Material elevation)
- SF Pro or system font stack
- iOS color semantics (system colors, semantic backgrounds)

**Device Considerations:**
- Safe area insets on notched devices (iPhone 15 Pro)
- Keyboard avoidance for forms
- Support both portrait and landscape if appropriate
- Test responsive behavior at 393x852 viewport

## iOS Platform UX Anti-Patterns

Since the goal is a **native iOS feel**, check for these anti-patterns that make web apps feel like web apps instead of native iOS apps:

### Navigation Anti-Patterns
| Anti-Pattern | iOS Convention | What to Check |
|--------------|----------------|---------------|
| Hamburger menu (☰) | Tab bar at bottom | Primary navigation should use tab bar, not hidden drawer |
| Floating Action Button (FAB) | Navigation bar buttons | Primary actions belong in top-right nav bar, not floating circle |
| Breadcrumb navigation | Back button + title | iOS uses single back button with previous screen title |
| Bottom sheets for navigation | Modal presentations or push | Navigation should push onto stack, not slide up sheets |
| Nested hamburger menus | Flat tab structure | iOS prefers flat hierarchy with tabs, not deep menu nesting |

### Interaction Anti-Patterns
| Anti-Pattern | iOS Convention | What to Check |
|--------------|----------------|---------------|
| Tiny tap targets (<44pt) | Minimum 44x44pt touch targets | All interactive elements should be easily tappable |
| Text-only buttons | Styled buttons or icons | Primary actions should have clear button styling |
| Swipe-only actions | Swipe + visible alternative | Critical actions need visible UI, not just swipe gestures |
| Long press as primary action | Long press for secondary | Long press should reveal options, not be required |
| Pull-to-refresh everywhere | Only in scrollable lists | Pull-to-refresh is for list content, not all screens |

### Visual Anti-Patterns
| Anti-Pattern | iOS Convention | What to Check |
|--------------|----------------|---------------|
| Custom form controls | Native UIKit/SwiftUI appearance | Use iOS-styled Picker, DatePicker, Toggle, not custom widgets |
| Web-style dropdowns | iOS Picker wheels or menus | Dropdowns should use native picker presentation |
| Dense information layout | Generous spacing and hierarchy | iOS favors readability over density |
| Material Design styling | iOS Human Interface Guidelines | Avoid Android-specific visual patterns |
| Fixed headers that cover content | iOS navigation bar behavior | Headers should integrate with iOS navigation system |

### Component Anti-Patterns
| Anti-Pattern | iOS Convention | What to Check |
|--------------|----------------|---------------|
| Toast notifications | iOS alerts or banners | Use native alert styles, not Android-style toasts |
| Snackbars | Action sheets or alerts | Bottom notifications should follow iOS patterns |
| Cards with heavy shadows | Subtle iOS card styling | iOS uses subtle shadows and rounded corners |
| Outlined text fields | iOS text field styling | Text fields should match iOS native appearance |
| Checkboxes | iOS Toggle switches or checkmarks | Use SF Symbols checkmarks or Toggle for boolean states |

### Workflow UX Verification Steps

When writing workflows, include verification steps for platform appropriateness:

```markdown
## Workflow: [Name]

...

6. Verify iOS platform conventions
   - Verify primary navigation uses tab bar (not hamburger menu)
   - Verify interactive elements are at least 44x44pt
   - Verify forms use iOS-style components (Picker, Toggle, etc.)
   - Verify navigation follows iOS back-button pattern
   - Verify visual styling follows iOS Human Interface Guidelines
   - Verify content respects safe areas (top 44pt, bottom 34pt)
   - Verify animations feel native (spring physics)
```

## Handling Updates

When updating existing workflows:

1. **Preserve working workflows** - Don't rewrite what works
2. **Mark deprecated steps** - If UI changed, note what's outdated
3. **Add new workflows** - Append new features as new workflows
4. **Version notes** - Add changelog comments for significant changes
5. **Update device viewport** - Ensure workflows note iPhone 15 Pro (393x852)
