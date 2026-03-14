# Finding Examples

Complete examples across all eight categories, based on common web application patterns.

## Navigation & Flow Dead Ends

### [RF-1-001] Direct URL to checkout step 3 shows blank form

**Severity:** High
**Category:** Navigation & Flow Dead Ends
**User Type:** Confused User
**Verification:** Verified

**Scenario:**
1. User completes checkout steps 1-2, reaches step 3 (payment)
2. User bookmarks the URL: `/checkout/payment`
3. Later, user opens the bookmark in a new session
4. Checkout step 3 renders with empty shipping address and no cart items
5. User submits the empty form — validation error with no way to go back to step 1

**Expected Behavior:**
Redirect to step 1 if required state (cart, shipping address) is missing. Or display a message: "Your checkout session has expired. Start a new checkout."

**Actual Behavior:**
Blank form renders. Submit button is active. Submitting shows validation errors but no link to restart checkout.

**Code Location:**
- `app/checkout/payment/page.tsx:15` — component renders without checking for required state
- `lib/checkout/context.tsx:42` — checkout context provides empty defaults instead of redirecting

**Recommended Fix:**
Add a route guard to `/checkout/payment` that checks for cart items and shipping address. If missing, redirect to `/checkout` (step 1) with a toast message explaining why.

---

## Race Conditions & Double Actions

### [RF-2-001] Double-click on "Create Project" creates two projects

**Severity:** Medium
**Category:** Race Conditions & Double Actions
**User Type:** Confused User
**Verification:** Verified

**Scenario:**
1. User fills out "New Project" form
2. User double-clicks "Create" button (common on slower connections when first click has no visible feedback)
3. Two POST requests fire to `/api/projects`
4. Both pass the project count limit check (user has 2/3 allowed)
5. Both create successfully — user now has 4 projects (exceeding the 3-project limit)

**Expected Behavior:**
Second click should be ignored. Button should disable immediately on first click with a loading spinner.

**Actual Behavior:**
Two identical projects created. Project count limit exceeded.

**Code Location:**
- `components/CreateProjectForm.tsx:67` — submit handler doesn't disable button or prevent double-submit
- `app/api/projects/route.ts:23` — count check is not atomic with creation

**Recommended Fix:**
1. Disable submit button immediately on click with `setIsSubmitting(true)` before the API call
2. Add an idempotency key to the create request (generate on form mount, send with POST)
3. Make the server-side count check atomic: `INSERT ... WHERE (SELECT count(*) ...) < limit`

---

## Interrupted Operations

### [RF-3-001] Network drop mid-save loses form data with no recovery

**Severity:** Critical
**Category:** Interrupted Operations
**User Type:** Confused User
**Verification:** Verified

**Scenario:**
1. User spends 10 minutes filling out a detailed form (project settings, descriptions, tags)
2. User clicks "Save"
3. Network drops during the request (mobile user entering elevator, coffee shop WiFi blip)
4. Request fails silently — no error toast, no retry prompt
5. User navigates away thinking it saved
6. Returns later to find none of the changes persisted

**Expected Behavior:**
Show a clear error: "Save failed — connection lost. Your changes are preserved. [Retry] [Save as Draft]." Form data should remain in the form fields even after the error.

**Actual Behavior:**
No error shown. Form data lost on navigation. No autosave or draft mechanism.

**Code Location:**
- `components/ProjectSettingsForm.tsx:89` — fetch call has no error handling in the catch block
- No autosave or draft mechanism exists for this form

**Recommended Fix:**
1. Add error handling with a visible toast: "Save failed. Retrying..." with automatic retry
2. Implement periodic autosave to localStorage (every 30 seconds while form is dirty)
3. Add a `beforeunload` handler when form has unsaved changes
4. On form mount, check localStorage for a draft and offer to restore it

---

## Cross-Device & Cross-Session

### [RF-4-001] Desktop-started workflow breaks on mobile continuation

**Severity:** Medium
**Category:** Cross-Device & Cross-Session
**User Type:** Power User
**Verification:** Partially Mitigated

**Scenario:**
1. User starts editing a complex document on desktop with drag-and-drop features
2. User shares the URL to their phone to continue editing on mobile
3. Mobile view doesn't support drag-and-drop — reordering functionality is missing
4. User taps "Save" on mobile — the order from the previous desktop session is preserved
5. But if the user tries to reorder on mobile, there's no UI for it — they're stuck

**Expected Behavior:**
Mobile view should provide an alternative interaction for reordering (e.g., move-up/move-down buttons, long-press menu). Or clearly indicate: "Reordering is available on desktop only."

**Actual Behavior:**
Reorder feature silently absent on mobile. No indication it exists or how to access it.

**Code Location:**
- `components/ItemList.tsx:34` — drag-and-drop renders only when `window.matchMedia('(pointer: fine)')` is true
- No fallback UI for touch devices

**Recommended Fix:**
Add a touch-friendly reorder mechanism (long-press + move, or explicit up/down arrows). If not feasible immediately, show a banner on mobile: "Some editing features are available on desktop."

---

## Input & Data Edge Cases

### [RF-5-001] Emoji in project title breaks PDF export

**Severity:** Medium
**Category:** Input & Data Edge Cases
**User Type:** Power User
**Verification:** Verified

**Scenario:**
1. User creates a project with title "My Project 🎵🔇"
2. Project works fine in the web UI
3. User clicks "Export to PDF"
4. PDF generation crashes — the font doesn't support emoji characters
5. User gets a generic "Export failed" error with no explanation

**Expected Behavior:**
Either render emoji correctly in PDF (use a Unicode-capable font), or strip emoji during export with a note: "Some special characters were removed for PDF compatibility."

**Actual Behavior:**
PDF export crashes. Generic error message.

**Code Location:**
- `lib/pdf/generator.ts:112` — uses a font without emoji support
- `lib/pdf/generator.ts:98` — no input sanitization before rendering

**Recommended Fix:**
Use a Unicode-capable font (Noto Color Emoji as fallback) in the PDF generator. Or sanitize emoji from text before PDF rendering with `title.replace(/\p{Emoji}/gu, '')` and add a note about removed characters.

---

## State & Timing

### [RF-6-001] Session expires during checkout — payment form data lost

**Severity:** Critical
**Category:** State & Timing
**User Type:** Confused User
**Verification:** Verified

**Scenario:**
1. User starts checkout, fills shipping address (step 1), selects shipping method (step 2)
2. User gets distracted — phone call, lunch, leaves tab open for 45 minutes
3. Session expires (30-minute timeout)
4. User returns, enters payment details (step 3), clicks "Place Order"
5. Server redirects to login page (session expired)
6. After re-login, user is redirected to homepage — not back to checkout
7. All checkout progress (address, shipping selection) is lost

**Expected Behavior:**
After re-login, redirect user back to checkout with their progress preserved. Store checkout state server-side (tied to user, not session) or in localStorage as backup.

**Actual Behavior:**
Checkout state stored only in session. Session expiry wipes it. Post-login redirect goes to homepage.

**Code Location:**
- `middleware.ts:45` — auth redirect doesn't preserve the attempted URL
- `lib/checkout/context.tsx` — checkout state is session-only, no persistence layer

**Recommended Fix:**
1. Store the attempted URL in the login redirect: `/login?redirect=/checkout/payment`
2. Persist checkout state to the database (keyed by user ID) so it survives session expiry
3. On checkout page load, check for saved checkout state and offer to resume

---

## Error Recovery & Empty States

### [RF-7-001] Search with no results shows blank area — no guidance

**Severity:** Low
**Category:** Error Recovery & Empty States
**User Type:** Confused User
**Verification:** Verified

**Scenario:**
1. User searches for "xyzabc123" (no matching results)
2. Search results area shows completely blank — no message, no suggestions
3. User isn't sure if the search executed, is loading, or found nothing

**Expected Behavior:**
Show a helpful empty state: "No results found for 'xyzabc123'. Try a different search term, or [browse all projects]."

**Actual Behavior:**
Blank white space below search bar. No loading indicator either, so unclear if search completed.

**Code Location:**
- `components/SearchResults.tsx:28` — renders `null` when results array is empty
- No empty state component exists for search

**Recommended Fix:**
Add an empty state component: "No results found for '[query]'" with suggestions (try different terms, browse all, clear filters). Also add a loading skeleton while search is in progress.

---

## Unintended Usage Patterns

### [RF-8-001] Browser DevTools can modify client-side feature flags

**Severity:** Medium
**Category:** Unintended Usage Patterns
**User Type:** Power User
**Verification:** Verified

**Scenario:**
1. App stores feature flags in localStorage: `{ "premium_features": false }`
2. User opens DevTools → Application → Local Storage
3. User changes `premium_features` to `true`
4. Refreshes page — premium UI elements now visible (but backend still enforces limits)
5. User can see premium features, click premium buttons, then gets confusing API errors

**Expected Behavior:**
Feature flags should be server-authoritative. Client-side flags should be for UI hints only, with server-side enforcement on every action. Or: don't expose flag names in localStorage.

**Actual Behavior:**
Premium UI renders based on localStorage flag. Server correctly blocks premium API calls, but error messages say "Unauthorized" instead of "Upgrade to Premium to use this feature."

**Code Location:**
- `lib/featureFlags.ts:12` — reads flags from localStorage
- `app/api/*/route.ts` — server checks are correct but error messages are generic

**Recommended Fix:**
1. Fetch feature flags from server on page load, don't trust localStorage
2. If keeping localStorage for offline/fast rendering, always verify server-side before enabling premium flows
3. Improve API error messages: distinguish "not authenticated" from "not on correct tier"
