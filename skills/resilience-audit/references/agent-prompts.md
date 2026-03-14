# Agent Prompts

## Phase 2: Flows & Navigation Agent

```
You are exploring a web application to map all user flows and navigation patterns for a resilience audit.

Find and document:

1. **Routes & pages**: All routes, static and dynamic. Which require auth? Which are deep-linkable?
   - Look in: app router, page files, route config, middleware
   - Document: route table with auth requirements, params, and required state

2. **Multi-step flows**: Checkout, onboarding, wizards, signup, any flow with ordered steps
   - Look in: stepper/wizard components, form state management, URL-based step tracking
   - Document: step sequence, what data each step requires from previous steps, can steps be skipped via URL?

3. **Navigation patterns**: How does the user move between pages? Tab bar, sidebar, breadcrumbs, back links?
   - Look in: layout components, navigation components, Link/router usage
   - Document: navigation type, back-button behavior, history management

4. **Redirect chains**: Auth redirects, OAuth callbacks, payment return URLs, email verification links
   - Look in: middleware, auth callbacks, webhook handlers, email templates
   - Document: redirect sequences, what happens if a redirect target is invalid or expired

5. **Entry points**: Can users enter the app at any URL? What happens with stale/shared/bookmarked URLs?
   - Look in: middleware, route guards, error pages, 404 handling
   - Document: which URLs require prior state, what error handling exists for direct access

Return a flow map: every multi-step flow with its steps, state dependencies, and entry/exit points.
```

## Phase 2: State & Persistence Agent

```
You are exploring a web application to map all client-side and server-side state for a resilience audit.

Find and document:

1. **Client-side state**: React/Vue/Svelte state, context, stores, URL params, localStorage, sessionStorage, cookies
   - Look in: state management (Redux, Zustand, Context), localStorage/sessionStorage usage, cookie handling
   - Document: what's stored where, TTL/expiry, what happens if cleared/corrupted

2. **Server-side state**: Database records, session store, cache layers (Redis, CDN, in-memory)
   - Look in: database schema, session config, cache configuration, CDN setup
   - Document: what's cached where, TTL, invalidation strategy, consistency guarantees

3. **Sync mechanisms**: How does client state stay in sync with server state?
   - Look in: data fetching (SWR, React Query, polling), WebSocket/SSE, optimistic updates
   - Document: sync strategy per data type, what happens on conflict, stale-while-revalidate behavior

4. **Session management**: How are sessions created, maintained, expired, and invalidated?
   - Look in: auth config, session middleware, token refresh logic, logout handler
   - Document: session lifecycle, what happens on expiry mid-action, multi-device session behavior

5. **Form state**: How is form data preserved during long forms or interrupted flows?
   - Look in: form libraries, autosave logic, draft storage, beforeunload handlers
   - Document: which forms have draft saving, what happens on session expiry mid-form

Return a state map: every piece of state with its location, lifecycle, sync mechanism, and what happens if it's stale/missing/corrupted.
```

## Phase 2: Inputs & Forms Agent

```
You are exploring a web application to map all input surfaces and validation for a resilience audit.

Find and document:

1. **Form fields**: Every user input — text fields, dropdowns, checkboxes, file uploads, rich text editors
   - Look in: form components, input schemas, validation libraries (Zod, Yup, etc.)
   - Document: field type, validation rules (client + server), max lengths, required/optional

2. **Client-side validation**: What's validated in the browser before submission?
   - Look in: form validation hooks, Zod/Yup schemas, HTML5 validation attributes
   - Document: which fields have client validation, what type (format, length, required, custom)

3. **Server-side validation**: What's validated on the server after submission?
   - Look in: API route handlers, middleware, database constraints
   - Document: which fields have server validation, does it match client validation?

4. **File uploads**: What types are accepted? Size limits? How are filenames handled?
   - Look in: upload routes, multer/busboy config, S3 upload logic, MIME type checks
   - Document: accepted types, size limits, filename sanitization, what happens with malformed files

5. **User-generated content**: Where does user text appear to other users or in the UI?
   - Look in: display components, markdown renderers, comment/review systems
   - Document: where UGC is rendered, sanitization, what happens with emoji/unicode/HTML

Return an input inventory: every input surface with its validation coverage (client, server, or both), edge cases not covered, and file handling details.
```
