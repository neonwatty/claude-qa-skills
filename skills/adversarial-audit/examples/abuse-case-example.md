# Abuse Case Examples

Complete examples across all seven categories, based on common SaaS patterns.

## Quota & Limit Bypass

### [AC-1-001] Rate limit fails open when KV store is unavailable

**Severity:** High
**Category:** Quota & Limit Bypass
**Actor:** Bad Actor
**Verification:** Verified

**Scenario:**
1. The rate limiter uses a Vercel KV store for sliding-window counters
2. If the KV store is unavailable (network issue, quota exceeded), the rate limiter returns `{ success: true }` instead of blocking
3. During a KV outage, all rate limits are effectively disabled
4. A user (or bot) could send unlimited requests to expensive endpoints

**Impact:**
Unbounded API costs during KV outages. Cloud transcription endpoint calls Groq API at ~$0.003/min — without rate limits, a single user could trigger thousands of calls.

**Current Protection:**
Rate limiting exists but fails open. No secondary rate limit (e.g., at CDN/WAF level).

**Code Location:**
- `lib/rateLimit.ts:45` — catch block returns `{ success: true }` on KV error
- `app/api/process/start/route.ts:12` — calls rateLimit() before processing

**Recommended Fix:**
Change fail-open to fail-closed: return `{ success: false }` when KV is unavailable. Add a WAF-level rate limit (Vercel, Cloudflare) as a secondary defense that doesn't depend on application code.

---

## Cost Amplification

### [AC-2-001] Free tier users trigger expensive Step Functions via leftover minutes

**Severity:** Medium
**Category:** Cost Amplification
**Actor:** Power User
**Verification:** Partially Mitigated

**Scenario:**
1. User signs up, gets 60 free cloud minutes
2. User uses 50 minutes of cloud transcription (free, costs operator ~$0.15)
3. User triggers cloud bleeping on a 10-minute file
4. Cloud bleep starts AWS Step Functions pipeline (Lambda chain): ~$0.05 per run
5. User repeats with many small files, consuming remaining 10 free minutes across 10 separate bleep jobs
6. Operator pays ~$0.50 in Step Functions costs for a user who paid $0

**Impact:**
Step Functions cost is per-execution, not per-minute. Many small files cost more than one large file. Free tier users can amplify costs by splitting work across many small jobs.

**Current Protection:**
Free minutes cap total usage, but no per-execution minimum or daily job count limit for free tier.

**Code Location:**
- `app/api/bleep/cloud/route.ts:78` — checks minutes but not job count
- `lib/constants/tierLimits.ts` — no `maxJobsPerDay` for free tier

**Recommended Fix:**
Add a daily job count limit for free tier users (e.g., 3 cloud bleep jobs/day). This bounds the Step Functions cost per free user regardless of how they split their minutes.

---

## Account & Identity Abuse

### [AC-3-001] Unlimited free minutes via disposable email signups

**Severity:** Critical
**Category:** Account & Identity Abuse
**Actor:** Bad Actor
**Verification:** Not Tested

**Scenario:**
1. User creates account with disposable email (tempmail.com, guerrillamail.com)
2. Receives 60 free cloud minutes
3. Uses minutes for cloud transcription
4. Creates new account with different disposable email
5. Repeats indefinitely — 60 free minutes per signup

**Impact:**
Unlimited cloud transcription at operator's expense. No device fingerprinting, IP throttling, or disposable email blocking observed.

**Current Protection:**
Email verification is required (user must click link), but disposable email services support receiving verification emails.

**Code Location:**
- `app/auth/signup/page.tsx` — no email domain validation
- Supabase Auth config — no blocked email domains

**Recommended Fix:**
Block known disposable email domains at signup (use a maintained blocklist like `disposable-email-domains` npm package). Add IP-based signup throttling (max 2 accounts per IP per 24 hours). Consider requiring a phone number or payment method on file for free tier access.

---

## State Corruption

### [AC-4-001] Orphaned storage reservation on interrupted upload

**Severity:** Low
**Category:** State Corruption
**Actor:** Confused User
**Verification:** Partially Mitigated

**Scenario:**
1. User clicks upload, app reserves storage quota (e.g., 500MB)
2. User closes browser tab before upload completes
3. Reservation persists for 15 minutes, blocking subsequent uploads
4. User returns, tries to upload again, gets "insufficient storage" error
5. User must wait up to 15 minutes for reservation to expire

**Impact:**
Poor user experience. User thinks they're out of storage when they're not. May contact support or abandon the app.

**Current Protection:**
Reservations auto-expire after 15 minutes. Expired reservations cleaned up on next reservation attempt.

**Code Location:**
- `supabase/migrations/00052_fix_storage_reservation_founding_cols.sql` — 900-second TTL
- `app/api/storage/presigned-upload/route.ts:34` — creates reservation before upload

**Recommended Fix:**
Reduce TTL to 5 minutes (uploads that take >5 min are rare). Add a client-side `beforeunload` handler that cancels the reservation on tab close. Show a clear message: "Previous upload was interrupted — storage will be available in X minutes."

---

## Subscription & Billing Gaps

### [AC-5-001] Downgrade balance persists indefinitely

**Severity:** Medium
**Category:** Subscription & Billing Gaps
**Actor:** Power User
**Verification:** Verified

**Scenario:**
1. User subscribes to Pro ($19/mo, 480 min/mo)
2. Uses 100 minutes, leaving 380 minutes balance
3. Downgrades to free tier
4. 380 minutes transferred to `free_minutes_remaining` with source='downgrade'
5. Downgrade-sourced balance does NOT have 30-day expiry (only signup grants expire)
6. User uses 380 minutes over several months at no cost
7. Only 12-month inactivity rule would zero the balance

**Impact:**
Users can subscribe for one month, accumulate unused minutes, downgrade, and use them indefinitely. A $19 one-time payment yields potentially months of usage.

**Current Protection:**
12-month inactivity zeroing. But active users who log in occasionally will never trigger this.

**Code Location:**
- `supabase/migrations/00039_usage_system_overhaul.sql:156` — downgrade balance transfer
- `supabase/migrations/00039_usage_system_overhaul.sql:201` — expiry logic excludes source='downgrade'

**Recommended Fix:**
Apply a 90-day expiry to downgrade-sourced balances, same as signup grants but with a longer window. Or cap downgrade balance at 1x the tier's monthly allocation.

---

## Resource Exhaustion

### [AC-6-001] Storage cycling by free-tier users

**Severity:** Low
**Category:** Resource Exhaustion
**Actor:** Bad Actor
**Verification:** Not Tested

**Scenario:**
1. Free user creates 3 projects (max allowed)
2. Uploads large files (up to storage limit)
3. Downloads processed results
4. Lets projects expire after 7 days (auto-deletion)
5. Creates 3 new projects, uploads again
6. Repeats weekly — effectively unlimited processing with free storage cycling

**Impact:**
S3 storage costs for 7-day cycles of free-tier files. Bandwidth costs for repeated uploads/downloads.

**Current Protection:**
7-day auto-deletion limits exposure. Storage quota enforced per-user.

**Code Location:**
- `lib/constants/tierLimits.ts:8` — free tier storage limit
- Supabase cron — project expiry job

**Recommended Fix:**
This is low severity because the 7-day window and storage cap bound the cost. Consider tracking total lifetime storage consumed per free account and applying a monthly cap.

---

## Unprotected Edge Cases

### [AC-7-001] Zero-duration file bypasses per-minute billing

**Severity:** Medium
**Category:** Unprotected Edge Cases
**Actor:** Power User
**Verification:** Not Tested

**Scenario:**
1. User uploads a technically valid audio file with 0.1 seconds of audio
2. Cloud transcription processes it — Groq API charges minimum per call
3. Usage tracking deducts <1 minute (rounds to 0 or 1)
4. If rounded to 0, user gets free transcription calls
5. Repeat with many micro-files to get transcription at no minute cost

**Impact:**
If minute deduction rounds down to 0, user gets unlimited free API calls. Even if rounded to 1, the per-call API cost may exceed what 1 minute of billing covers.

**Current Protection:**
File duration checked (min/max), but minimum threshold unclear from code.

**Code Location:**
- `app/api/process/start/route.ts` — duration validation
- Usage increment function — rounding behavior

**Recommended Fix:**
Enforce a minimum billable duration (e.g., 1 minute per job regardless of actual duration). Always round up, never down. Add a minimum file duration requirement (e.g., 5 seconds).
