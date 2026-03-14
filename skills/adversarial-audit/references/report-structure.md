# Report Structure

Template for the final adversarial audit report written to `/reports/adversarial-audit.md`.

## Template

```markdown
# Adversarial Audit Report

**App:** [App name]
**Date:** [Date]
**Scope:** [Full audit / Focused: specific area / Quick scan]
**Base URL:** [URL or "N/A — static analysis only"]

## Executive Summary

**Total findings:** [count]
| Severity | Count |
|----------|-------|
| Critical | [n] |
| High | [n] |
| Medium | [n] |
| Low | [n] |
| Info | [n] |

**Top 3 findings:**
1. [AC-X-XXX] [Title] — [One-line impact statement]
2. [AC-X-XXX] [Title] — [One-line impact statement]
3. [AC-X-XXX] [Title] — [One-line impact statement]

**Interactive verification:** [Completed / Not performed]
- Verified: [n]
- Partially mitigated: [n]
- Not reproducible: [n]

## Economic Surface Map

### Cost-Bearing Resources

| Resource | Trigger | Est. Unit Cost | Volume Limit | Enforcement |
|----------|---------|---------------|--------------|-------------|
| [e.g., Groq API] | Cloud transcription | ~$0.003/min | Tier minutes | API route check |
| [e.g., S3 Storage] | File upload | ~$0.023/GB/mo | Tier storage cap | Reservation function |
| ... | ... | ... | ... | ... |

### Unmetered Resources
[List any cost-bearing actions with no usage tracking or limits]

## Findings by Category

### 1. Quota & Limit Bypass
[Findings or "No findings in this category"]

### 2. Cost Amplification
[Findings]

### 3. Account & Identity Abuse
[Findings]

### 4. State Corruption
[Findings]

### 5. Subscription & Billing Gaps
[Findings]

### 6. Resource Exhaustion
[Findings]

### 7. Unprotected Edge Cases
[Findings]

## Finding Detail Template

### [AC-{category}-{number}] [Short descriptive title]

**Severity:** Critical / High / Medium / Low / Info
**Category:** [Category name]
**Actor:** Confused User / Power User / Bad Actor
**Verification:** Verified / Partially Mitigated / Not Reproducible / Not Tested

**Scenario:**
[Step-by-step description of the abuse pattern]

**Impact:**
[What goes wrong — cost, broken state, user impact, operator impact]

**Current Protection:**
[What exists today. "None" if nothing. Be specific about what IS protected and what ISN'T.]

**Code Location:**
- [file:line] — [what this code does]
- [file:line] — [where the gap is]

**Recommended Fix:**
[Specific, actionable technical recommendation. Include code patterns where helpful.]

**Evidence:**
[Screenshot references if interactive verification was performed, or "Static analysis only"]

---

## Recommendations Summary

### Immediate (Critical + High)
1. [Finding ID] — [One-line fix description]
2. ...

### Short-term (Medium)
1. [Finding ID] — [One-line fix description]
2. ...

### Defense-in-Depth (Low + Info)
1. [Finding ID] — [One-line improvement description]
2. ...
```

## Report Guidelines

- **Be specific**: Include file paths and line numbers, not just "check the auth middleware"
- **Be actionable**: Each recommendation should be implementable without further research
- **Be honest about uncertainty**: If a finding is theoretical, say so
- **Separate facts from speculation**: "The code allows X" vs "A user could potentially Y"
- **Include positive findings**: Note where protections ARE working well
