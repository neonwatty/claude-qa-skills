# Known Automation Limitations

When testing web apps on mobile platforms, these limitations apply. Specific constraints vary by testing engine.

## Cannot Automate (Must Skip or Flag for Manual Testing)

### 1. Native/System Dialogs
- JavaScript alerts/confirms/prompts
- Download prompts
- System-level alerts (permissions, camera access)
- **Workaround:** Mock in test environment, dismiss before continuing, or flag for manual testing

### 2. Permission Prompts
- Camera/microphone access
- Location access
- Notification permissions
- **Workaround:** Pre-authorize in Settings or flag for manual testing

### 3. Keyboard & Text Input Limitations
- Special characters, emoji, and non-Latin scripts may not be typeable
- Autocorrect interactions
- iOS keyboard behavior differs from desktop
- **Workaround:** Use ASCII only, pre-populate test data, use explicit button taps instead of shortcuts

### 4. External Authentication
- OAuth flows that open new windows or redirect to native apps
- Sign in with Apple on web
- Third-party login popups
- **Workaround:** Use test accounts with web-only auth, flag for manual verification

### 5. File Uploads
- Limited mobile camera/photo library simulation
- Native file picker dialogs
- **Workaround:** Use predefined test files or programmatic file input automation

## Mobile-Specific Challenges

### 1. Touch Gestures
- Complex gestures (pinch-zoom, 3D Touch) not fully supported
- **Workaround:** Test core interactions only

### 2. Network Conditions
- Cannot simulate 3G/4G/5G speeds natively
- **Workaround:** Use network throttling features where available

### 3. Device Sensors
- Accelerometer, gyroscope not available in emulation
- **Workaround:** Manual testing on real devices

### 4. iOS-Specific Features
- Haptic feedback, Dynamic Island not testable
- **Workaround:** Document as manual test cases

## Handling Limited Steps

When a workflow step involves a known limitation:

1. **Mark as [MANUAL]:** Note the step requires manual verification
2. **Pre-configure:** Set up test data or permissions before testing
3. **Document the Limitation:** Record in findings that the step was skipped due to automation limits
4. **Continue Testing:** Don't let one limited step block the entire workflow

### iOS Simulator

Additional limitations specific to iOS Simulator MCP (`ui_type`, `ui_tap`, etc.):

- Safari-specific dialogs ("Add to Home Screen" flow)
- Safari UI interactions (bookmarks, Reading List, History, Share sheet, Settings)
- `ui_type` only supports ASCII printable characters
- **Workaround:** Focus on web app testing, not Safari itself

### Chrome Mobile Viewport

Playwright CLI provides powerful automation but has these additional constraints:

- Browser permission dialogs cannot be automated via standard Playwright tools
- Native browser alerts (`alert()`, `confirm()`, `prompt()`) can be handled by Playwright automatically
- File uploads can be automated via Playwright's file input mechanism
- **Workaround:** Use accessibility snapshots to locate elements, verify mobile viewport size (393x852)

## Error Handling

### Workflow Execution Failures

```python
try:
    run(f"playwright-cli -s={session} click {target_ref}")
except ElementNotFoundError:
    # Take diagnostic screenshot
    run(f"playwright-cli -s={session} screenshot")
    # save to: workflows/screenshots/{workflow}/errors/step-{num}-not-found.png

    # Try alternative selector
    snapshot = run(f"playwright-cli -s={session} snapshot")
    alternative_ref = find_alternative_element(snapshot, target_description)

    if alternative_ref:
        run(f"playwright-cli -s={session} click {alternative_ref}")
    else:
        log_finding({
            "severity": "high",
            "category": "workflow_failure",
            "step": num,
            "error": "Element not found",
            "target": target_description,
            "screenshot": f"workflows/screenshots/{workflow}/errors/step-{num}-not-found.png"
        })

        if step.get("required", True):
            raise WorkflowError("Required step failed")
        else:
            print(f"Optional step {num} failed, continuing...")
```

### iOS HIG Evaluation Failures

```python
try:
    measurements = run(f'playwright-cli -s={session} eval "() => iOSHIGAudit.measureTouchTargets()"')
except JavaScriptError as e:
    print("Automated measurement failed, using fallback approach")
    snapshot = run(f"playwright-cli -s={session} snapshot")
    measurements = manual_touch_target_analysis(snapshot)
```

### Fix Application Failures

```python
fix_content = generate_css_fix(finding)

if not validate_css_syntax(fix_content):
    corrected = auto_correct_css(fix_content)
    if validate_css_syntax(corrected):
        fix_content = corrected
    else:
        log_error({
            "fix": finding.id,
            "error": "Invalid CSS generated",
            "action": "Skipped, manual intervention required"
        })
        return
```

## Guidelines and Best Practices

### Workflow Design
1. One user journey per workflow, 5-10 steps maximum
2. Use descriptive targets ("Search icon in header" not "button.search")
3. Include verification steps after actions

### iOS HIG Evaluation
1. Prioritize by user impact (Critical > High > Medium > Low)
2. Provide specific code solutions with HIG references
3. Consider mobile-web vs native app context

### Error Handling
1. Retry transient failures (network timeouts: 2x, element not found: wait and retry)
2. Document persistent issues in findings even if workflow continues
3. Optional steps can fail without aborting; required steps must succeed or abort
