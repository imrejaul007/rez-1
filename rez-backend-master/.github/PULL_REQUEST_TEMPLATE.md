## Summary

<!-- 1-3 sentence description of what this PR does and why -->

## Linked Issue

<!-- Replace with the issue number this PR addresses -->

- Fixes #<!-- issue number -->

## Type

<!-- What kind of change is this? (delete non-applicable) -->
- [ ] Bug Fix
- [ ] Feature
- [ ] Refactor
- [ ] Security Fix
- [ ] CI/CD Improvement
- [ ] Documentation

## Impacted Services

<!-- Which services/packages are changed? -->
- [ ] rez-app-consumer
- [ ] rez-merchant
- [ ] rezadmin
- [ ] rez-web-menu
- [ ] rez-now
- [ ] rezbackend
- [ ] rez-api-gateway
- [ ] rez-auth-service
- [ ] rez-wallet-service
- [ ] rez-payment-service
- [ ] rez-order-service
- [ ] rez-merchant-service
- [ ] rez-catalog-service
- [ ] rez-search-service
- [ ] rez-gamification-service
- [ ] rez-karma-service
- [ ] rez-ads-service
- [ ] rez-marketing-service
- [ ] rez-shared
- [ ] Other: <!-- specify -->

---

## Root Cause Analysis

<!-- REQUIRED for bug fixes: Why did this bug happen? -->

**Root Cause:**

<!-- Explain the underlying reason. Be specific: which line, which assumption, which edge case. -->

**Category:**
- [ ] Logic error (wrong condition, missing validation)
- [ ] Data issue (null/undefined, wrong type, race condition)
- [ ] Integration issue (API contract mismatch, timeout)
- [ ] Configuration error (missing ENV, wrong value)
- [ ] Security issue (injection, auth bypass, data leak)
- [ ] Performance issue (N+1 query, missing index, memory leak)
- [ ] CI/CD issue (missing test, wrong config)
- [ ] Other: <!-- specify -->

---

## Fix Applied

<!-- REQUIRED: What was done to resolve the issue? -->

**Summary of Changes:**

<!-- Bullet points of what changed in each file -->

**Files Changed:**

| File | Change |
|------|--------|
| | |

---

## Prevention

<!-- REQUIRED: How will this bug NOT happen again? Check all that apply. -->

- [ ] Added unit test for the specific edge case
- [ ] Added integration test for the API contract
- [ ] Added architectural fitness test (scripts/arch-fitness/)
- [ ] Added input validation at system boundary
- [ ] Added ENV validation on startup
- [ ] Added error handling for previously-unhandled case
- [ ] Added logging/telemetry for observability
- [ ] Updated API contract documentation
- [ ] Added to error knowledge base (docs/errors/)
- [ ] Added runbook entry
- [ ] No prevention needed (trivial/cosmetic change)

**Prevention Details:**

<!-- Describe the specific test name, CI rule, or validation added -->

---

## Testing

<!-- How was this tested? -->

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manually tested on local
- [ ] Verified on staging
- [ ] No tests needed (config/docs only)

**Test Coverage:**

<!-- What percentage of changed code is covered? -->
<!-- New test files: -->

---

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes — see migration guide below

**Migration Guide (if breaking):**

<!-- How do consumers migrate? -->

---

## Screenshots / Demo (if UI change)

<!-- Before vs after screenshots for UI changes -->

---

## Checklist

- [ ] PR title follows `type(scope): description` format
- [ ] Commits are atomic and follow conventional commit format
- [ ] Code passes all CI checks (lint, typecheck, tests, build)
- [ ] Architecture fitness tests pass
- [ ] No secrets or credentials in code
- [ ] No `Math.random()` for IDs (use `crypto.randomUUID()`)
- [ ] No bespoke idempotency — uses `rez-shared/idempotency`
- [ ] No bespoke enums — uses `rez-shared/enums/`
- [ ] No console.log — uses `rez-shared/telemetry` logger
- [ ] No bespoke buttons — imports Button from `@rez/rez-ui`
- [ ] Branch is up to date with `main`
- [ ] All conversations resolved
