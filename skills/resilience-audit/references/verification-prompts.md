# Verification Prompts

## Phase 4: Interactive Verification Agent

```
You are verifying resilience findings against a live web application running at [BASE_URL]. Your job is to attempt each scenario and record how the app actually behaves.

For each finding provided:

1. **Set up**: Navigate to the relevant page or start the relevant flow
2. **Reproduce**: Follow the scenario steps exactly
3. **Record**: For each step, note whether the app:
   - **Handles gracefully** (clear message, preserves data, offers recovery path)
   - **Degrades partially** (works but with confusing UX, lost data, or visual glitch)
   - **Breaks** (stuck state, blank page, error with no recovery, data loss)
4. **Evidence**: Capture a screenshot at the moment of failure or graceful handling
5. **Classify**:
   - **Verified** — app breaks or degrades as described
   - **Handled Gracefully** — app handles the scenario well (downgrade or remove finding)
   - **Not Reproducible** — couldn't trigger the scenario in browser

**Scenario-specific techniques:**

For **Navigation Dead Ends**:
- Use browser Back/Forward buttons through multi-step flows
- Directly navigate to mid-flow URLs in a fresh tab
- Bookmark a URL, navigate away, then return to the bookmark

For **Double Actions**:
- Rapid-click submit buttons (use browser DevTools to slow network: Network tab → Throttle → Slow 3G)
- Open the same form in two tabs, submit both
- Click a button, then quickly navigate away and back

For **Interrupted Operations**:
- Start a file upload, then navigate away mid-upload
- Disable network in DevTools mid-save (Network tab → Offline toggle)
- Close and reopen the tab during a long operation

For **Input Edge Cases**:
- Paste emoji into text fields: 🎵🔇💀
- Paste extremely long text (1000+ characters) into short fields
- Use browser autofill on forms
- Submit empty or whitespace-only required fields

For **Session & Timing**:
- Open a form, wait 30+ minutes, then submit (or clear cookies manually to simulate expiry)
- Open the app in two browser profiles simultaneously

For **Error Recovery**:
- Trigger errors intentionally (invalid input, network off) and check recovery paths
- Navigate to a 404 page and check for useful navigation

**Important guidelines:**
- Do NOT test anything that would affect real users or production data
- Use a test account if possible
- Note when a scenario requires conditions you can't reproduce in browser (e.g., server restart, webhook failure)
- For timing-dependent scenarios, note "Timing-dependent — manual testing recommended"

**Evidence directory:**
/reports/resilience-audit-evidence/
├── screenshots/
│   ├── RF-1-001-before.png
│   ├── RF-1-001-after.png
│   └── ...
└── verification-log.md
```

## Browser Setup Instructions

Before verification:
1. Call `tabs_context_mcp` to get browser context
2. Create a dedicated tab via `tabs_create_mcp`
3. Navigate to the base URL
4. Log in or create a test account
5. Store the tab ID for all subsequent interactions
6. Open DevTools Network tab for throttling and offline simulation
