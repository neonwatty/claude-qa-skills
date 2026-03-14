# Report Structure

Template for the final resilience audit report written to `/reports/resilience-audit.md`.

## Template

```markdown
# Resilience Audit Report

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
1. [RF-X-XXX] [Title] — [One-line impact statement]
2. [RF-X-XXX] [Title] — [One-line impact statement]
3. [RF-X-XXX] [Title] — [One-line impact statement]

**Interactive verification:** [Completed / Not performed]
- Verified: [n]
- Handled gracefully: [n]
- Not reproducible: [n]

## Flow-State Map Summary

### Multi-Step Flows Audited
| Flow | Steps | State Dependencies | Entry Points | Issues Found |
|------|-------|-------------------|--------------|-------------|
| [e.g., Checkout] | 4 | cart, auth, address | /checkout (requires cart) | 2 |
| ... | ... | ... | ... | ... |

### State Inventory
| State | Location | Lifecycle | Sync Method | Issues Found |
|-------|----------|-----------|-------------|-------------|
| [e.g., Cart] | localStorage + DB | Session | Polling | 1 |
| ... | ... | ... | ... | ... |

## Findings by Category

### 1. Navigation & Flow Dead Ends
[Findings or "No findings in this category"]

### 2. Race Conditions & Double Actions
[Findings]

### 3. Interrupted Operations
[Findings]

### 4. Cross-Device & Cross-Session
[Findings]

### 5. Input & Data Edge Cases
[Findings]

### 6. State & Timing
[Findings]

### 7. Error Recovery & Empty States
[Findings]

### 8. Unintended Usage Patterns
[Findings]

## Finding Detail Template

### [RF-{category}-{number}] [Short descriptive title]

**Severity:** Critical / High / Medium / Low / Info
**Category:** [Category name]
**User Type:** Confused User / Power User / Chaotic Scenario
**Verification:** Verified / Handled Gracefully / Not Reproducible / Not Tested

**Scenario:**
[Step-by-step description of what the user does]

**Expected Behavior:**
[What should happen if the app handled this gracefully]

**Actual Behavior:**
[What actually happens — or what code analysis suggests would happen]

**Impact:**
[Data loss? Stuck state? Confusion? Degraded experience?]

**Code Location:**
- [file:line] — [what this code does]
- [file:line] — [where the gap is]

**Recommended Fix:**
[Specific, actionable technical recommendation]

**Evidence:**
[Screenshot references if verified, or "Static analysis only"]

---

## Recommendations Summary

### Immediate (Critical + High)
1. [Finding ID] — [One-line fix description]
2. ...

### Short-term (Medium)
1. [Finding ID] — [One-line fix description]
2. ...

### UX Improvements (Low + Info)
1. [Finding ID] — [One-line improvement description]
2. ...

## Positive Findings

[Note areas where the app handles unexpected behavior well — error boundaries, graceful degradation, helpful empty states, good retry logic. This calibrates the report and acknowledges existing resilience.]
```

## Report Guidelines

- **Test the happy path first**: Note what works well before cataloging what breaks
- **Be specific about the scenario**: "User hits Back after step 3 of checkout" not "Back button issues"
- **Include expected vs actual behavior**: Show what graceful handling would look like
- **Suggest defensive patterns**: Link to known solutions (idempotency, saga, beforeunload, error boundaries)
- **Include positive findings**: A section for things the app already handles well
