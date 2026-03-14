# Resilience Categories

Eight categories of unexpected user behavior that web applications must survive gracefully. Derived from James Bach's Heuristic Test Strategy Model, NN/g edge case research, PortSwigger race condition taxonomy, and OWASP misuse case methodology.

## 1. Navigation & Flow Dead Ends

**What to look for:** Multi-step flows (checkout, onboarding, wizards), browser history interactions, deep-linkable states, redirect chains, bookmark-able URLs.

**Checklist:**
- [ ] What happens when the user hits Back mid-checkout/wizard?
- [ ] Can every URL be bookmarked and revisited directly? What state is required?
- [ ] What happens if a user shares a mid-flow URL with someone who hasn't started the flow?
- [ ] Are there redirect chains that can loop? (login → redirect → login)
- [ ] What happens when a deep link points to a deleted or expired resource?
- [ ] Can the user reach a state with no forward or backward path?
- [ ] What happens if the user refreshes mid-flow? Is progress preserved?
- [ ] Does Forward (after Back) replay or duplicate state-changing actions?
- [ ] What happens when browser history contains entries for deleted/expired content?

**Common patterns:**
- Wizard step 3 requires data from step 2, but direct URL access skips step 2
- Back button after form submission triggers re-submission prompt
- OAuth redirect callback hit directly without initiating the OAuth flow
- Expired invitation link shows blank page instead of helpful error

## 2. Race Conditions & Double Actions

**What to look for:** Submit buttons, "like" or "vote" buttons, add-to-cart, any action that creates or mutates server state. Based on PortSwigger's race condition taxonomy.

**Checklist:**
- [ ] Is the submit button disabled after first click? What if JavaScript fails to disable it?
- [ ] What happens with rapid double-click on any state-changing button?
- [ ] Can two browser tabs perform conflicting operations on the same resource simultaneously?
- [ ] Does optimistic UI update get reconciled if the server rejects the action?
- [ ] Are database operations atomic or can concurrent requests interleave?
- [ ] What happens if two tabs both try to edit the same record?
- [ ] Are there "check-then-act" patterns without locks? (check balance → deduct)
- [ ] What happens if the same form is submitted from two tabs simultaneously?

**Sub-types (from PortSwigger taxonomy):**
- **Limit overrun**: Concurrent requests bypass business logic limits (TOCTOU)
- **Hidden multi-step**: Single request triggers multi-step backend sequence with exploitable intermediate state
- **Multi-endpoint**: Parallel requests to different endpoints create inconsistent state
- **Partial construction**: Object partially initialized, leaves system in invalid state

## 3. Interrupted Operations

**What to look for:** File uploads, payment flows, multi-step saves, background jobs, any operation that takes more than a few seconds.

**Checklist:**
- [ ] What happens if the user closes the tab during a file upload?
- [ ] What happens if the network drops mid-save?
- [ ] If payment succeeds but the post-payment webhook/redirect fails, what state is the user in?
- [ ] Are there orphaned resources from interrupted operations? (temp files, reservations, partial records)
- [ ] Can the user resume an interrupted operation, or must they start over?
- [ ] What happens if a background job completes but the user has navigated away?
- [ ] Is there a `beforeunload` warning for unsaved changes?
- [ ] What happens if the server restarts mid-request?

**Recovery patterns to check for:**
- Idempotency keys on critical mutations (payments, record creation)
- Compensating transactions (saga pattern) for multi-step operations
- Automatic cleanup of orphaned resources (TTL, cron jobs)
- Client-side draft/autosave for long forms

## 4. Cross-Device & Cross-Session

**What to look for:** Session management, localStorage usage, real-time features, multi-device sync.

**Checklist:**
- [ ] What happens if the user starts a flow on desktop and continues on mobile?
- [ ] Does the mobile view support all features the desktop started?
- [ ] What happens with two active sessions making conflicting changes?
- [ ] Is localStorage portable across devices? What happens when it's not?
- [ ] What happens if the user logs in on a new device? Are old sessions invalidated?
- [ ] What happens if a shared/cached device has another user's localStorage?
- [ ] Does the app detect and handle conflicting edits from multiple sessions?
- [ ] What happens if real-time features (WebSocket, SSE) disconnect and reconnect?

## 5. Input & Data Edge Cases

**What to look for:** Form fields, search inputs, file uploads, user-generated content, URL parameters.

**Checklist:**
- [ ] What happens with emoji in text fields? (filenames, usernames, project titles)
- [ ] What happens with Unicode characters? (RTL text, combining characters, zero-width spaces)
- [ ] Does paste behave differently than typing? (formatted text, HTML paste into plain field)
- [ ] Does browser autofill populate fields correctly? (address, credit card, name)
- [ ] What happens with extremely long input? (10,000 character title, 50 character email)
- [ ] What happens with empty/whitespace-only input in required fields?
- [ ] What happens with zero-byte or zero-duration files?
- [ ] What happens if a file's extension doesn't match its actual MIME type?
- [ ] What happens with special characters in filenames? (`file (1).mp3`, `résumé.pdf`, `my file.mp3`)
- [ ] Does server-side validation match client-side validation?

## 6. State & Timing

**What to look for:** Caching, session expiry, scheduled jobs, timezone-dependent logic, eventual consistency.

**Checklist:**
- [ ] What happens if the user's session expires while filling out a long form?
- [ ] Does the form data survive the re-authentication redirect?
- [ ] What happens if cached data is stale when the user takes action on it?
- [ ] Are there timing windows where the UI shows one state but the server has another?
- [ ] What happens at timezone boundaries? (midnight, DST transition, billing period edge)
- [ ] Do scheduled jobs handle clock skew or DST transitions?
- [ ] What happens if a stale browser tab (opened hours ago) submits a form?
- [ ] What happens if a CDN serves a stale page after a deployment?
- [ ] Are there eventual-consistency windows where users see outdated data?

## 7. Error Recovery & Empty States

**What to look for:** Error messages, error boundaries, empty states, retry mechanisms, fallback UI. Based on Nielsen Norman Group's error recovery heuristics.

**Checklist:**
- [ ] Can the user recover from every error state without refreshing?
- [ ] Are error messages specific and actionable? ("Upload failed — file exceeds 500MB limit" vs "Error")
- [ ] Do error messages avoid technical jargon?
- [ ] Is there a clear path forward from every error? (retry button, alternative action, support link)
- [ ] What do empty states look like? (first-time user, deleted all items, search with no results)
- [ ] Do empty states guide the user toward a productive action?
- [ ] Does the retry button actually retry, or does it just re-render the error?
- [ ] What happens when a React/component error boundary catches an error? Can the user continue?
- [ ] Are there loading states for every async operation? Or does the UI freeze/blank?
- [ ] What happens if a third-party dependency fails? (analytics, CDN, payment provider)

## 8. Unintended Usage Patterns

**What to look for:** Feature usage analytics, power-user workflows, API endpoints accessible from browser DevTools.

**Checklist:**
- [ ] Can any feature be used for a purpose other than intended? (transcription tool used as free translator)
- [ ] Are there power-user shortcuts that bypass intended guardrails? (URL manipulation, DevTools)
- [ ] Can the user manipulate client-side state (localStorage, cookies) to change app behavior?
- [ ] Are there hidden API endpoints the UI doesn't expose but the browser can reach?
- [ ] Can URL parameters override server-side settings?
- [ ] Are there workaround flows that skip steps the developer intended to be mandatory?
- [ ] Can the user combine features in ways that produce unexpected results?
- [ ] Does the app handle being embedded in an iframe? (clickjacking, unexpected context)

---

## Severity Rubric

| Severity | User Impact | Frequency | Recovery |
|----------|------------|-----------|----------|
| **Critical** | Data loss, stuck state with no escape, payment charged but no service | Common flow (>10% of users could hit it) | No recovery without support intervention |
| **High** | Confusing state, lost progress, degraded functionality | Uncommon but realistic (power users, mobile users) | Recovery requires refresh or re-doing work |
| **Medium** | Minor confusion, cosmetic issue, suboptimal experience | Specific conditions required | User can recover independently |
| **Low** | Barely noticeable, edge case with workaround | Rare, deliberate, or theoretical | Self-resolving or trivial workaround |
| **Info** | Suggestion for improvement, defense-in-depth | N/A | N/A |
