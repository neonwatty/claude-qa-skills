---
name: browser-workflow-generator
description: Generates, creates, or updates browser workflow files. Use this when the user says "generate browser workflows", "create browser workflows", "update browser workflows", or "iterate on browser workflows". Thoroughly explores the app's codebase to discover all user-facing features, routes, and interactions. Creates comprehensive numbered workflows with substeps that cover the full user experience.
---

# Browser Workflow Generator Skill

You are a senior QA engineer tasked with creating comprehensive user workflow documentation. Your job is to deeply explore the application and generate thorough, testable workflows that cover all key user journeys.

## Process

### Phase 1: Assess Current State

1. Check if `/workflows/browser-workflows.md` already exists
2. If it exists, read it and note:
   - What workflows are already documented
   - What might be outdated or incomplete
   - What's missing based on your knowledge of the app
3. Ask the user their goal:
   - **Create new:** Generate workflows from scratch
   - **Update:** Add new workflows for new features
   - **Refactor:** Reorganize or improve existing workflows
   - **Audit:** Check existing workflows against current app state

### Phase 2: Explore the Application

Launch multiple Explore agents in parallel to thoroughly understand the app:

**Agent 1: Routes & Navigation**
- Find all routes/pages in the app
- Identify navigation patterns
- Map out the user flow between pages

**Agent 2: Components & Features**
- Find key interactive components
- Identify major features and their UI
- Note form inputs, buttons, modals, etc.

**Agent 3: State & Data**
- Understand the data model
- Identify CRUD operations users can perform
- Find state management patterns

Synthesize findings into a feature inventory:
- List all user-facing features
- Group by area/section of the app
- Note entry points and exit points

### Phase 3: Identify User Journeys

Based on exploration, identify key user journeys:

**Core Journeys** (every user does these):
- Onboarding/first-time experience
- Primary task completion
- Navigation between main sections

**Feature Journeys** (specific feature usage):
- Each major feature should have its own workflow
- Include happy path and key variations

**Edge Case Journeys** (important but less common):
- Error handling flows
- Empty states
- Settings/preferences
- Account/profile management

### Phase 4: Generate Workflows

For each journey, create a workflow with this structure:

```markdown
## Workflow: [Descriptive Name]

> [Brief description of what this workflow tests and why it matters]

1. [Top-level step]
   - [Substep with specific detail]
   - [Substep with expected outcome]
2. [Next top-level step]
   - [Substep]
3. Verify [expected final state]
```

**Guidelines for writing steps:**
- Be specific: "Click the blue 'Add Guest' button in the toolbar" not "Click add"
- Include expected outcomes: "Verify the modal appears" not just "Open modal"
- Use consistent language: Navigate, Click, Type, Verify, Drag, Select
- Group related actions under numbered steps with substeps
- Include wait conditions where timing matters

### Phase 5: Organize & Write

Structure the final document:

```markdown
# Browser Workflows

> Auto-generated workflow documentation for [App Name]
> Last updated: [Date]

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

**Do not write to file yet - proceed to Phase 6 for user approval first.**

### Phase 6: Review with User (REQUIRED)

**This step is mandatory. Do not write the final file without user approval.**

After generating the workflows, use `AskUserQuestion` to get explicit approval:

1. **Present a summary** to the user:
   - Total workflows generated (list each by name)
   - Features/areas covered
   - Any gaps or areas you couldn't fully cover
   - Anything that needs manual verification

2. **Use AskUserQuestion** to ask:
   - "Do these workflows cover all the key user journeys?"
   - Provide options: Approve / Add more workflows / Modify existing / Start over

3. **If user wants additions or changes:**
   - Ask specifically what workflows to add or modify
   - Generate the additional/modified workflows
   - Return to step 1 and present updated summary
   - Repeat until user approves

4. **Only after explicit approval**, write to `/workflows/browser-workflows.md`

**Example AskUserQuestion usage:**

```
Question: "I've identified [N] workflows covering [areas]. Do these look complete?"
Options:
- "Yes, looks good - write the file"
- "Add more workflows"
- "Modify some workflows"
- "Let me describe what's missing"
```

If user selects "Add more" or "Modify", follow up with another question asking for specifics before proceeding.

## Workflow Writing Standards

**Step Types:**

| Action | Format | Example |
|--------|--------|---------|
| Navigation | Navigate to [URL/page] | Navigate to the dashboard |
| Click | Click [specific element] | Click the "Save" button |
| Type | Type "[text]" in [field] | Type "john@email.com" in the email field |
| Select | Select "[option]" from [dropdown] | Select "Round" from table shape dropdown |
| Drag | Drag [element] to [target] | Drag guest card onto table |
| Verify | Verify [expected state] | Verify success toast appears |
| Wait | Wait for [condition] | Wait for loading spinner to disappear |

## Automation-Friendly Workflow Guidelines

When writing workflows, consider what can and cannot be automated by Claude-in-Chrome:

### Prefer UI Actions Over Keyboard Shortcuts

**Instead of:**
```markdown
- Press Cmd+Z to undo
- Press Cmd+S to save
- Press Delete to remove
```

**Write:**
```markdown
- Click the Undo button in toolbar, OR press Cmd+Z
- Click the Save button, OR press Cmd+S
- Click the Delete button, OR press Delete key
```

### Mark Non-Automatable Steps

Use `[MANUAL]` tag for steps that require manual verification:

```markdown
3. Grant camera permission
   - [MANUAL] Click "Allow" on browser permission prompt
   - Note: Browser permission dialogs cannot be automated

4. Download the report
   - [MANUAL] Click "Download PDF" and verify file saves
   - Note: File download dialogs cannot be automated
```

### Known Automation Limitations

These interactions **cannot** be automated and should include `[MANUAL]` tags or UI alternatives:

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| Keyboard shortcuts | Cmd+Z, Cmd+C, Cmd+V | Provide button alternative |
| Native dialogs | alert(), confirm(), prompt() | Skip or mark [MANUAL] |
| File operations | Upload/download dialogs | Mark [MANUAL] |
| Browser permissions | Camera, location prompts | Mark [MANUAL], pre-configure |
| Pop-up windows | OAuth, new window opens | Document as [MANUAL] |
| Print dialogs | Print preview | Mark [MANUAL] |

### Include Prerequisites for Automation

When workflows require specific setup:

```markdown
## Workflow: Upload Profile Photo

**Prerequisites for automation:**
- Browser must have camera/file permissions pre-configured
- Test file should be accessible at known path

> Tests uploading a new profile photo.

1. Open profile settings
   ...
```

**Substep Format:**
- Use bullet points under numbered steps
- Include specific selectors or descriptions
- Note expected intermediate states

**Example Workflow:**

```markdown
## Workflow: Create New Event with Tables and Guests

> Tests the complete flow of setting up a new seating arrangement from scratch.

1. Enter the application
   - Navigate to https://app.example.com
   - Click "Get Started" or "Try Demo" button
   - Verify canvas view loads with empty state

2. Add a table to the canvas
   - Click "Add Table" button in toolbar
   - Select "Round" from shape options
   - Verify table appears on canvas
   - Verify table shows "0/8 seats" indicator

3. Add a guest
   - Click "Add Guest" button
   - Type "John Smith" in name field
   - Press Enter or click Save
   - Verify guest appears in guest list sidebar

4. Assign guest to table
   - Drag "John Smith" from guest list
   - Drop onto the round table
   - Verify guest name appears at table
   - Verify seat count updates to "1/8 seats"

5. Verify final state
   - Verify guest is no longer in unassigned list
   - Verify table shows assigned guest
   - Verify canvas can be zoomed and panned
```

## Handling Updates

When updating existing workflows:

1. **Preserve working workflows** - Don't rewrite what works
2. **Mark deprecated steps** - If UI changed, note what's outdated
3. **Add new workflows** - Append new features as new workflows
4. **Version notes** - Add changelog comments for significant changes

## Agent Prompts

When launching Explore agents, use prompts like:

**Routes Agent:**
"Find all routes, pages, and navigation in this app. Look for: router configuration, page components, navigation menus, breadcrumbs, URL patterns. Report: list of all accessible pages with their paths and purposes."

**Components Agent:**
"Find all major interactive UI components. Look for: buttons, forms, modals, dropdowns, drag-drop areas, toolbars, sidebars. Report: list of interactive elements grouped by page/feature with their purposes."

**State Agent:**
"Find the data model and user actions. Look for: state management (store, context), API calls, CRUD operations, form submissions. Report: list of actions users can take and data they can manipulate."
