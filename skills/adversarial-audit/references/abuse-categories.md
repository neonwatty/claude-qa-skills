# Abuse Categories

Seven categories of adversarial usage patterns for SaaS and usage-based web applications.

## 1. Quota & Limit Bypass

**What to look for:** Usage caps, storage limits, rate limits, project count limits, file size limits, API call limits.

**Common patterns:**
- Limits checked client-side but not server-side
- Limits checked at request time but not enforced atomically (TOCTOU)
- Rate limits that fail open (allow all requests if rate limit service is down)
- Per-endpoint limits that can be bypassed by hitting a different endpoint for the same resource
- Limits tied to session/IP instead of user identity (bypassable with new sessions)

**Abuse case template:**
```
### [AC-1-XXX] [Short title]
- **Category:** Quota & Limit Bypass
- **Actor:** Confused / Power User / Bad Actor
- **Scenario:** [Step-by-step description of how the abuse works]
- **Impact:** [What happens — resource consumption, cost, broken state]
- **Current protection:** [What exists today, or "None"]
- **Code location:** [File:line where enforcement should exist]
- **Recommended fix:** [Specific technical recommendation]
- **Severity:** Critical / High / Medium / Low / Info
```

## 2. Cost Amplification

**What to look for:** Actions where the operator's cost per request exceeds the user's payment. Third-party API calls (LLM inference, transcription, image processing), compute-intensive operations (video processing, PDF generation), storage operations (S3, CDN), email/SMS sends.

**Common patterns:**
- Free tier users triggering expensive backend operations
- No per-request cost tracking (usage metered by time/count, not actual cost)
- Retry loops that multiply API costs on failure
- Webhook handlers that trigger expensive operations without idempotency
- Fan-out operations (one user action triggers N backend calls)

## 3. Account & Identity Abuse

**What to look for:** Signup flow, email verification, free trial grants, referral programs, invite systems.

**Common patterns:**
- Disposable email addresses accepted for signup (temp-mail.org, guerrillamail)
- No device fingerprinting or IP-based signup throttling
- Referral bonuses credited before the referee becomes a paying user
- Free trial resets on new email with same payment method
- Shared accounts exceeding per-seat pricing

## 4. State Corruption

**What to look for:** Multi-step flows, concurrent requests, browser close mid-operation, state machines with missing transitions.

**Common patterns:**
- Upload started but never completed (orphaned reservations)
- Payment initiated but webhook never received (user has access, operator has no payment)
- Concurrent API calls that race on shared state (double-spend, double-create)
- Browser back/forward creating duplicate submissions
- Stale client state making requests with outdated assumptions

## 5. Subscription & Billing Gaps

**What to look for:** Upgrade/downgrade flows, cancellation, grace periods, proration, balance transfers, coupon/discount logic.

**Common patterns:**
- Downgrade retains resources from higher tier (storage, projects, minutes)
- Cancel during grace period retains access until period ends but balance never expires
- Upgrade gives immediate access to higher limits before payment confirms
- Coupon stacking or applying expired coupons via direct API call
- Free minutes/credits granted on signup that persist across subscription changes

## 6. Resource Exhaustion

**What to look for:** Storage, database rows, queue depth, background job slots, connection pools.

**Common patterns:**
- Create-and-abandon: fill storage/quota, let resources expire, repeat
- Queue flooding: submit many jobs faster than workers can process
- Connection pool exhaustion via many concurrent long-running requests
- Database bloat from soft-deleted records that are never cleaned up
- Reservation systems where reservations outlive their usefulness

## 7. Unprotected Edge Cases

**What to look for:** Boundary values, empty states, concurrent sessions, timezone-dependent logic, encoding edge cases.

**Common patterns:**
- Zero-length files, zero-duration media, empty form submissions
- Files with misleading extensions (rename .exe to .mp3)
- Unicode in filenames/inputs that breaks downstream processing
- Timezone boundaries where billing periods overlap
- Concurrent sessions making conflicting changes to the same resource
- Browser DevTools manipulation of client-side state (localStorage, cookies)

---

## Severity Rubric

| Severity | Revenue Impact | Exploitability | Mitigation |
|----------|---------------|----------------|------------|
| **Critical** | Direct, unbounded | Single action, no special knowledge | None |
| **High** | Significant, bounded | Few steps, discoverable | Partial (bypassable) |
| **Medium** | Moderate | Multi-step, requires specific conditions | Exists but incomplete |
| **Low** | Minor | Complex, unlikely to occur naturally | Mostly effective |
| **Info** | Theoretical | Requires deliberate engineering | Defense-in-depth suggestion |
