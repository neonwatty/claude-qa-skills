---
name: ios-workflow-generator
description: Generates, creates, or updates iOS workflow files for testing web apps in Safari on the iOS Simulator. Use this when the user says "generate ios workflows", "create ios workflows", "update ios workflows", or "iterate on ios workflows". Thoroughly explores the web app's codebase to discover all user-facing features, pages, and interactions. Creates comprehensive numbered workflows with substeps that cover the full user experience when viewed on iOS Safari.
---

# iOS Workflow Generator Skill

You are a senior QA engineer tasked with creating comprehensive workflow documentation for testing **web applications in Safari on the iOS Simulator**. Your job is to deeply explore the web application codebase and generate thorough, testable workflows that verify the app works correctly and follows iOS UX conventions when viewed on mobile Safari.

**Important:** This skill is for testing web apps (React, Vue, HTML/CSS/JS, etc.) running in Safari on the iOS Simulator. These web apps are intended to become **PWAs or wrapped native apps** (via Capacitor, Tauri, Electron, etc.) and should feel **indistinguishable from native iOS apps**. The UX bar is native iOS quality, not just "mobile-friendly web."

## Process

### Phase 1: Assess Current State

1. Check if `/workflows/ios-workflows.md` already exists
2. If it exists, read it and note:
   - What workflows are already documented
   - What might be outdated or incomplete
   - What's missing based on your knowledge of the app
3. Ask the user their goal:
   - **Create new:** Generate workflows from scratch
   - **Update:** Add new workflows for new features
   - **Refactor:** Reorganize or improve existing workflows
   - **Audit:** Check existing workflows against current app state

### Phase 2: Explore the Web Application

Launch multiple Explore agents in parallel to thoroughly understand the web app:

**Agent 1: Pages & Navigation**
- Find all routes/pages in the app (React Router, Next.js pages, Vue Router, etc.)
- Identify navigation patterns (tabs, sidebars, menus, modals)
- Map out the user flow between pages
- Find the app's entry URL and any deep links

**Agent 2: UI Components & Interactions**
- Find key interactive components (buttons, forms, lists, drag-drop)
- Identify touch-friendly elements and their sizes
- Note text inputs, selects, toggles, date pickers
- Find gesture handlers (swipe, pinch, touch events)

**Agent 3: Data & State**
- Understand the data model (state management, API calls)
- Identify user actions and state changes
- Find network calls and API interactions
- Note persistence (localStorage, cookies, etc.)

Synthesize findings into a feature inventory:
- List all user-facing pages/views
- Group by section of the app
- Note the base URL and navigation paths

### Phase 3: Identify User Journeys

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

### Phase 3.5: Research UX Conventions

For each major screen type identified, research what good UX looks like:

1. **Identify screen types** in your feature inventory (e.g., login screen, settings page, list view, detail view, onboarding flow, search interface)

2. **Search for reference examples** using WebSearch:
   - Search for 2-3 well-known apps with similar functionality
   - OR search for 2-3 screens of similar type from design resources
   - Example searches:
     - "iOS login screen design Dribbble"
     - "best iOS settings UI examples"
     - "iOS list view design patterns 2024"
     - "[specific app name] iOS screenshots"

3. **Document UX conventions** for each screen type:
   ```markdown
   ### Screen: Login Screen
   **Reference Examples:** Airbnb, Spotify, Instagram
   **Expected iOS Conventions:**
   - Large, centered logo or app name
   - Email/password fields using native iOS text field styling
   - Social login buttons with standard iOS button height (50pt)
   - "Forgot Password" as text link, not button
   - Sign up CTA clearly visible but secondary to login
   **Anti-patterns to flag:**
   - Web-style dropdown for country code
   - Tiny touch targets on social buttons
   - Hamburger menu visible on login screen
   ```

4. **Include UX expectations in workflows** so the executor knows what to verify

### Phase 4: Generate Workflows

For each journey, create a workflow with this structure:

```markdown
## Workflow: [Descriptive Name]

> [Brief description of what this workflow tests and why it matters]

**URL:** [https://localhost:5173/app or production URL]

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
- Use consistent language: Launch, Tap, Type, Verify, Swipe, Long press, Wait
- Note accessibility labels when available: "Tap button with label 'Submit'"
- Group related actions under numbered steps with substeps
- Include wait conditions where animations or loading matters

### Phase 5: Organize & Draft

Structure the document:

```markdown
# iOS Workflows

> Auto-generated workflow documentation for [App Name]
> Last updated: [Date]
> Base URL: [https://localhost:5173/app or production URL]
> Platform: Web app tested in Safari on iOS Simulator

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
   - Screens/features covered
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

4. **Only after explicit approval**, write to `/workflows/ios-workflows.md`

**Example AskUserQuestion usage:**

```
Question: "I've identified [N] workflows covering [screens/features]. Do these look complete?"
Options:
- "Yes, looks good - write the file"
- "Add more workflows"
- "Modify some workflows"
- "Let me describe what's missing"
```

## Workflow Writing Standards

**Step Types:**

| Action | Format | Example |
|--------|--------|---------|
| Open | Open Safari and navigate to [URL] | Open Safari and navigate to http://localhost:5173/ |
| Tap | Tap [specific element] | Tap the "Save" button |
| Type | Type "[text]" in [field] | Type "john@email.com" in email field |
| Swipe | Swipe [direction] on [element/screen] | Swipe left on the list item |
| Long press | Long press [element] | Long press the photo thumbnail |
| Verify | Verify [expected state] | Verify success message appears |
| Wait | Wait for [condition] | Wait for loading indicator to disappear |
| Scroll | Scroll [direction] to [element/position] | Scroll down to "Settings" section |

## Automation-Friendly Workflow Guidelines

When writing workflows, consider what can and cannot be automated by the iOS Simulator MCP:

### Text Input Limitations

The `ui_type` tool only supports ASCII printable characters. For special text:

**Instead of:**
```markdown
- Type "Hello 👋 World" in the message field
- Type "Café résumé" in the search field
```

**Write:**
```markdown
- Type "Hello World" in the message field
- Note: Emoji cannot be automated, test manually if needed
- Type "Cafe resume" in the search field (ASCII only)
- Note: For accented characters, pre-populate test data
```

### Mark Non-Automatable Steps

Use `[MANUAL]` tag for steps that require manual verification:

```markdown
3. Grant camera permission
   - [MANUAL] Tap "Allow" on system permission dialog
   - Note: System permission dialogs cannot be automated
   - Pre-configure: Settings > Privacy > Camera > [App] = On

4. Authenticate with Face ID
   - [MANUAL] Complete Face ID authentication
   - Note: Biometric auth requires simulator menu interaction
```

### Known Automation Limitations

These interactions **cannot** be automated and should include `[MANUAL]` tags or workarounds:

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| Permission dialogs | Camera, Location, Notifications | Mark [MANUAL], pre-configure in Settings |
| System alerts | Battery, Updates, iCloud | Skip or mark [MANUAL] |
| Biometrics | Face ID, Touch ID | Mark [MANUAL] or use passcode fallback |
| System UI | Control Center, Notification Center | Mark [MANUAL] |
| Special characters | Emoji, non-ASCII text | Use ASCII only, pre-populate data |
| Hardware buttons | Home, Power, Volume | Use Simulator menu or mark [MANUAL] |
| App Store | Purchases, Reviews | Use sandbox accounts, mark [MANUAL] |

### Include Prerequisites for Automation

When workflows require specific setup:

```markdown
## Workflow: Photo Capture Flow

**Prerequisites for automation:**
- Simulator permissions pre-configured: Settings > Privacy > Camera > [App] = On
- Photos library should contain test images
- Location services enabled for app

> Tests capturing and saving a new photo.

1. Open camera
   ...
```

### Pre-Configuration Checklist

Include this section when workflows need system setup:

```markdown
**Simulator Setup (one-time):**
1. Device > Erase All Content and Settings (clean slate)
2. Launch app once to trigger permission prompts
3. Grant all required permissions manually
4. Install test data/photos if needed
5. Sign into test accounts
```

**Substep Format:**
- Use bullet points under numbered steps
- Include accessibility labels when known
- Note expected intermediate states

**Example Workflow:**

```markdown
## Workflow: Create New Item

> Tests the complete flow of creating a new item from the home page.

**URL:** http://localhost:5173/

1. Open the app in Safari
   - Open Safari and navigate to http://localhost:5173/
   - Wait for home page to load
   - Verify navigation is visible

2. Navigate to creation flow
   - Tap the "+" button in top-right corner
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
   - Refresh the page (pull down or reload)
   - Verify "My Test Item" still appears in list
```

## Native iOS Feel Requirements

Since these web apps will become PWAs or wrapped apps, they must feel **native to iOS**:

**Navigation (must feel like native iOS):**
- Use tab bars for primary navigation, not hamburger menus
- Navigation should push/pop like native UINavigationController
- Back gestures should work naturally
- Modals should slide up from bottom like native sheets

**Touch & Interaction:**
- All tap targets must be at least 44x44pt
- Consider thumb reach zones for primary actions
- Animations should feel native (spring physics, not CSS ease-in-out)
- Haptic feedback patterns where appropriate

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
- Safe area insets on notched devices
- Keyboard avoidance for forms
- Support both portrait and landscape if needed
- Test on different iPhone screen sizes (SE, standard, Pro Max)

## iOS Platform UX Anti-Patterns

Since the goal is a **native iOS feel**, check for these anti-patterns that make web apps feel like web apps instead of native iOS apps:

### Navigation Anti-Patterns
| Anti-Pattern | iOS Convention | What to Check |
|--------------|----------------|---------------|
| Hamburger menu (☰) | Tab bar at bottom | Primary navigation should use UITabBarController/TabView, not hidden drawer |
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
| Custom form controls | Native UIKit/SwiftUI components | Use native Picker, DatePicker, Toggle, not custom widgets |
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
   - Verify forms use native iOS components (Picker, Toggle, etc.)
   - Verify navigation follows iOS back-button pattern
   - Verify visual styling follows iOS Human Interface Guidelines
```

## Agent Prompts

When launching Explore agents, use prompts like:

**Pages Agent:**
"Find all pages/routes and navigation in this web app. Look for: React Router routes, Next.js pages, Vue Router, navigation components, links, programmatic navigation. Report: list of all pages/routes with their navigation relationships and URLs."

**Components Agent:**
"Find all interactive UI components in this web app. Look for: buttons, form inputs, modals, dropdowns, drag-drop handlers, touch event handlers, click handlers. Report: list of interactive elements grouped by page with their purposes."

**State Agent:**
"Find the data model and user actions in this web app. Look for: state management (Redux, Zustand, Context), API calls, form submissions, localStorage/sessionStorage usage. Report: list of data entities and actions users can take."

**UX Patterns Agent:**
"Identify UI patterns used in this web app and evaluate them for iOS Safari appropriateness. Look for: navigation patterns, touch target sizes, form components, modal presentations, gesture handlers. Report: list of UI patterns and flag any that would look or feel wrong on iOS Safari (too small touch targets, desktop-only patterns, etc.)."
