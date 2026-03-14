# Race Condition Patterns

Taxonomy of race conditions in web applications, derived from PortSwigger Web Security Academy research and adapted for resilience auditing. These are not traditional security exploits — they are ways that normal user behavior (double-clicking, multiple tabs, slow networks) can create inconsistent state.

## 1. Limit Overrun (TOCTOU)

**Pattern:** Check-then-act with a time gap between check and action.

**Example:** App checks "does user have < 3 projects?" then creates a project. Two simultaneous requests both pass the check, both create — user ends up with 4 projects.

**What to look for:**
- Any `if (count < limit) { create() }` pattern without a database lock or atomic operation
- Usage quota checks that read, compare, then write in separate operations
- Rate limit checks that aren't atomic

**Detection in code:**
```
// VULNERABLE: read and write are separate operations
const count = await db.projects.count({ userId })
if (count < limit) {
  await db.projects.create({ userId, ... })
}

// SAFE: atomic operation
await db.execute(`
  INSERT INTO projects (user_id, ...)
  SELECT $1, ...
  WHERE (SELECT count(*) FROM projects WHERE user_id = $1) < $2
`, [userId, limit])
```

## 2. Hidden Multi-Step Sequences

**Pattern:** A single API request triggers multiple backend steps, with vulnerable intermediate states.

**Example:** POST /api/signup creates a user, grants free trial, sends welcome email. Between user creation and trial grant, a concurrent request could see the user as existing but with no trial.

**What to look for:**
- API routes that do multiple database writes without a transaction
- Webhook handlers that update multiple tables sequentially
- Background jobs triggered by API routes that assume atomic completion

## 3. Multi-Endpoint Races

**Pattern:** Two different endpoints operate on shared state simultaneously.

**Example:** User adds item to cart (POST /api/cart) while checkout calculates total (GET /api/checkout/total). Cart changes between total calculation and payment processing.

**What to look for:**
- Checkout/payment flows that read cart state at one point and charge at another
- Edit + delete of the same resource from different UI elements
- Settings page save + feature that reads settings simultaneously

## 4. Single-Endpoint Races

**Pattern:** Same endpoint hit simultaneously with different values.

**Example:** User double-clicks "Save" with slightly different form data (autofill changes a field between clicks). Two versions saved — last-write-wins with no conflict detection.

**What to look for:**
- Any form without submit button disabling
- PUT/PATCH endpoints without optimistic concurrency control (ETags, version numbers)
- Endpoints that don't deduplicate by idempotency key

## 5. Partial Construction

**Pattern:** An object is created across multiple steps, leaving it temporarily incomplete.

**Example:** User record created with null email, then email added in a separate update. Between creation and update, another process sees the null-email user and fails.

**What to look for:**
- Multi-table inserts without transactions
- Foreign key relationships set up after initial creation
- File records created before file upload completes

## 6. Client-Side Optimistic Update Conflicts

**Pattern:** UI optimistically updates before server confirmation, then server rejects.

**Example:** User clicks "Like", heart turns red immediately (optimistic), but server returns 429 (rate limited). UI shows liked, server shows not-liked. Refresh reveals the truth.

**What to look for:**
- Any optimistic UI update without a rollback mechanism
- Optimistic updates on operations that can fail (rate limited, quota exceeded, conflict)
- Missing error handling in the optimistic update's catch block

---

## Testing Approach

For each pattern found:
1. **Identify the race window**: How long between check and act? (Network latency = 50-500ms typical)
2. **Assess exploitability**: Can a normal user trigger this? (Double-click = yes. Sub-millisecond timing = no.)
3. **Assess impact**: Does it create inconsistent state? Lost data? Duplicate records?
4. **Check existing protections**: Transactions? Locks? Idempotency keys? Button disabling?
