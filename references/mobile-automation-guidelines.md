# Automation-Friendly Workflow Guidelines

When writing workflows, consider what can and cannot be automated by the testing platform.

## Text Input Limitations

Some tools have character restrictions. For special text:

**Instead of:**
```markdown
- Type "Hello :wave: World" in the message field
- Type "Cafe resume" in the search field
```

**Write:**
```markdown
- Type "Hello World" in the message field
- Note: Emoji cannot be automated, test manually if needed
- Type "Cafe resume" in the search field (ASCII only)
- Note: For accented characters, pre-populate test data
```

## Mark Non-Automatable Steps

Use `[MANUAL]` tag for steps that require manual verification:

```markdown
3. Grant camera permission
   - [MANUAL] Tap "Allow" on permission dialog
   - Note: Permission dialogs cannot be automated
   - Pre-configure permissions if possible

4. Authenticate with biometrics
   - [MANUAL] Complete biometric authentication
   - Note: Biometric auth requires manual interaction
```

## Known Automation Limitations

These interactions **cannot** be automated and should include `[MANUAL]` tags or workarounds:

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| Permission dialogs | Camera, Location, Notifications | Mark [MANUAL], pre-configure permissions |
| Biometrics | Face ID, Touch ID | Mark [MANUAL] or use passcode fallback |
| OAuth popups | Third-party login flows | Mark [MANUAL] or use test auth endpoints |
| System-level interactions | Clipboard, native share sheet | May have limited support |
| Print dialogs | Print preview | Mark [MANUAL] |

## Include Prerequisites for Automation

When workflows require specific setup:

```markdown
## Workflow: Photo Upload Flow

**Prerequisites for automation:**
- Permissions pre-configured for camera/files
- Test image files accessible at known paths
- Mobile viewport set to iPhone 15 Pro (393x852)

> Tests uploading a new photo.

1. Open photo upload interface
   ...
```

## Platform-Specific Notes

### iOS Simulator (Safari)

**Additional limitations specific to iOS Simulator MCP (`ui_type`, `ui_tap`, etc.):**

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| System alerts | Battery, Updates, iCloud | Skip or mark [MANUAL] |
| System UI | Control Center, Notification Center | Mark [MANUAL] |
| Special characters | Emoji, non-ASCII text | Use ASCII only, pre-populate data |
| Hardware buttons | Home, Power, Volume | Use Simulator menu or mark [MANUAL] |
| App Store | Purchases, Reviews | Use sandbox accounts, mark [MANUAL] |

**Pre-Configuration Checklist:**

```markdown
**Simulator Setup (one-time):**
1. Device > Erase All Content and Settings (clean slate)
2. Launch app once to trigger permission prompts
3. Grant all required permissions manually
4. Install test data/photos if needed
5. Sign into test accounts
```

### Mobile Browser (Chrome Viewport)

**Playwright CLI provides powerful automation for mobile browser testing.**

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

**Additional limitations specific to Playwright CLI:**

| Limitation | Example | Recommendation |
|------------|---------|----------------|
| Browser permission dialogs | Camera, Location, Notifications | Mark [MANUAL], pre-configure permissions |
| File uploads | Native file picker dialogs | Use Playwright's file input automation |
| Native browser alerts | alert(), confirm(), prompt() | Playwright can handle these automatically |

**Best practices:**
- Use accessibility snapshots to locate elements
- Verify mobile viewport size (393x852)
- Include wait conditions for animations
- Test touch target sizes (44x44pt minimum)
- Check safe area content positioning
