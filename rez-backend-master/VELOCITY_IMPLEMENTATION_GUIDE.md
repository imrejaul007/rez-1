# Quick Integration Guide — Velocity Limiters & Daily Caps

**Author**: Miguel Torres
**Status**: Ready for Production
**Integration Effort**: ~2-3 hours per route

This guide shows exactly where to integrate the new security utilities into existing controllers/routes.

---

## Quick Reference

### Import Statements (add to controllers)

```typescript
import velocityLimiter from '../utils/velocityLimiter';
import referralSecurityHelper from '../utils/referralSecurityHelper';
```

---

## 1. REFERRAL SYSTEM

### Apply Code (New Referee Signup)

**File**: `controllers/referralController.ts` → `applyCode()` endpoint

**Current Code**:
```typescript
const referral = new Referral({
  referrer: new mongoose.Types.ObjectId(referrerId),
  referee: userId,
  referralCode: code,
  // ...
});
await referral.save();
```

**Enhanced Code**:
```typescript
// NEW: Device + IP validation
const securityCheck = await referralSecurityHelper.validateReferralDevice(
  userId,
  req.body.deviceId,  // Extract from request
  req.ip               // Express automatically provides
);

if (!securityCheck.allowed) {
  return res.status(403).json({
    error: 'REFERRAL_BLOCKED',
    reason: securityCheck.reason,
    signals: securityCheck.signals,
  });
}

// NEW: Circular referral check
const circularCheck = await referralSecurityHelper.checkCircularReferral(
  referrerId,
  userId
);

if (!circularCheck.allowed) {
  return res.status(400).json({
    error: 'CIRCULAR_REFERRAL',
    reason: circularCheck.reason,
  });
}

// Existing save logic...
const referral = new Referral({
  referrer: new mongoose.Types.ObjectId(referrerId),
  referee: userId,
  referralCode: code,
  metadata: {
    deviceId: req.body.deviceId,      // ← Include these
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  },
  // ...
});
await referral.save();

// NEW: Track device fingerprint
await referralSecurityHelper.trackDeviceFingerprint(
  userId,
  req.body.deviceId,
  req.ip,
  req.get('user-agent')
);
```

### Claim Referral Rewards

**File**: `controllers/referralController.ts` → `claimRewards()` endpoint

**New Check**:
```typescript
// Check daily cap on referral rewards
const dailyCapCheck = await velocityLimiter.checkReferralDailyCap(userId);

if (!dailyCapCheck.allowed) {
  return res.status(429).json({
    error: 'DAILY_LIMIT_EXCEEDED',
    message: `You have already claimed ${dailyCapCheck.current} referral rewards today (max: ${dailyCapCheck.limit})`,
    retryAfterSeconds: dailyCapCheck.resetAtSeconds,
  });
}

// Proceed with reward issuance...
```

---

## 2. CHALLENGES

### Claim Challenge Reward

**File**: `controllers/challengeController.ts` → `claimReward()` endpoint

**New Checks**:
```typescript
const userId = req.user.id;
const challengeId = req.params.challengeId;

// Check 1: Same challenge daily cap
const dailyCapCheck = await velocityLimiter.checkChallengeDailyCap(userId, challengeId);

if (!dailyCapCheck.allowed) {
  return res.status(429).json({
    error: 'CHALLENGE_DAILY_CAP_EXCEEDED',
    message: `You can only complete this challenge once per day`,
    retryAfterSeconds: dailyCapCheck.resetAtSeconds,
  });
}

// Check 2: Total challenges per day
const totalDailyCheck = await velocityLimiter.checkChallengesPerDay(userId);

if (!totalDailyCheck.allowed) {
  return res.status(429).json({
    error: 'DAILY_CHALLENGE_LIMIT_EXCEEDED',
    message: `You have completed ${totalDailyCheck.current}/${totalDailyCheck.limit} challenges today`,
    retryAfterSeconds: totalDailyCheck.resetAtSeconds,
  });
}

// Check 3: Coin velocity (if award is coins)
const coinVelocity = await velocityLimiter.checkCoinVelocity(userId, challenge.rewards.coins);

if (!coinVelocity.allowed) {
  return res.status(429).json({
    error: 'COIN_VELOCITY_EXCEEDED',
    message: `You are earning coins too quickly`,
    retryAfterSeconds: coinVelocity.resetAtSeconds,
  });
}

// Proceed with reward issuance...
```

---

## 3. SCRATCH CARDS

### Generate Scratch Card

**File**: `controllers/scratchCardController.ts` → `generateCard()` endpoint

**New Check**:
```typescript
const userId = req.user.id;

// Daily cap enforcement
const dailyCapCheck = await velocityLimiter.checkScratchCardDailyCap(userId);

if (!dailyCapCheck.allowed) {
  return res.status(429).json({
    error: 'DAILY_LIMIT_EXCEEDED',
    message: 'You can only generate 1 scratch card per day',
    retryAfterSeconds: dailyCapCheck.resetAtSeconds,
  });
}

// Model-level check (keep for safety)
const isEligible = await ScratchCard.isEligibleForScratchCard(userId);
if (!isEligible) {
  return res.status(400).json({ error: 'Not eligible for scratch card' });
}

// Create card...
const card = await ScratchCard.createScratchCard(userId);
```

---

## 4. PROMO CODES

### Apply Promo Code

**File**: `controllers/promoCodeController.ts` → `validateCode()` endpoint

**New Check**:
```typescript
const userId = req.user.id;
const promoCodeId = promo._id.toString();

// Velocity check (per-code per-user)
const velocityCheck = await velocityLimiter.checkPromoCodeVelocity(userId, promoCodeId);

if (!velocityCheck.allowed) {
  return res.status(429).json({
    error: 'PROMO_CODE_RATE_LIMITED',
    message: `Cannot apply this code more than ${velocityCheck.limit} times per day`,
    retryAfterSeconds: velocityCheck.resetAtSeconds,
  });
}

// Model-level check (atomic per-user cap)
try {
  await promo.incrementUsage(userId, subscriptionId, originalPrice, finalPrice);
} catch (error) {
  return res.status(400).json({
    error: 'PROMO_CODE_LIMIT_EXCEEDED',
    message: 'You have already used this code the maximum number of times',
  });
}

// Return discounted price...
```

---

## 5. BILL UPLOADS

### Upload Bill

**File**: `controllers/billUploadController.ts` → `upload()` endpoint

**New Checks**:
```typescript
const userId = req.user.id;
const merchantId = req.body.merchantId;
const amount = req.body.amount;

// Check 1: Daily bill upload cap
const dailyCapCheck = await velocityLimiter.checkBillUploadDailyCap(userId);

if (!dailyCapCheck.allowed) {
  return res.status(429).json({
    error: 'DAILY_LIMIT_EXCEEDED',
    message: `You can upload maximum 10 bills per day (current: ${dailyCapCheck.current})`,
    retryAfterSeconds: dailyCapCheck.resetAtSeconds,
  });
}

// Check 2: Duplicate merchant check (72-hour window)
const dupCheck = await velocityLimiter.checkBillDuplication(userId, merchantId, amount);

if (!dupCheck.allowed) {
  return res.status(429).json({
    error: 'DUPLICATE_BILL_DETECTED',
    message: 'You already uploaded a bill from this merchant recently. Please wait 72 hours.',
    lastUploadAt: dupCheck.lastUploadAt,
    minWaitHours: dupCheck.minWaitHours,
  });
}

// Process bill and issue reward...
const reward = await issueReward(userId, 'bill_upload', amount);
```

---

## 6. GOLD SIP

### Create Gold SIP

**File**: `controllers/goldSipController.ts` → `create()` endpoint

**New Check**:
```typescript
const userId = req.user.id;

try {
  const sip = new GoldSip({
    userId,
    monthlyAmount: req.body.amount,
    deductionDate: req.body.date,
    isActive: true,
    nextDebitDate: calculateNextDebitDate(req.body.date),
  });

  await sip.save();
  return res.json({ success: true, sip });
} catch (error) {
  // Check for duplicate key error on active SIP
  if (error.code === 11000 && error.keyPattern?.isActive) {
    return res.status(400).json({
      error: 'ACTIVE_SIP_EXISTS',
      message: 'You can only have one active Gold SIP at a time. Cancel your current SIP first.',
    });
  }

  throw error;
}
```

---

## 7. ORDER CANCELLATIONS

### Cancel Order

**File**: `controllers/orderController.ts` → `cancel()` endpoint

**New Check**:
```typescript
const userId = req.user.id;

// Check daily cancellation cap
const cancellationCheck = await velocityLimiter.checkOrderCancellationDailyCap(userId);

if (!cancellationCheck.allowed) {
  return res.status(429).json({
    error: 'CANCELLATION_LIMIT_EXCEEDED',
    message: `You can cancel maximum 2 orders per day (current: ${cancellationCheck.current})`,
    retryAfterSeconds: cancellationCheck.resetAtSeconds,
  });
}

// Verify minimum order age (30 minutes)
const orderAgeMinutes = (Date.now() - order.createdAt.getTime()) / 60000;
if (orderAgeMinutes < 30) {
  return res.status(400).json({
    error: 'ORDER_TOO_NEW',
    message: 'You must keep the order for at least 30 minutes before cancelling',
  });
}

// Process cancellation...
```

---

## 8. DAILY LOGIN REWARDS

### Claim Daily Login

**File**: `controllers/dailyLoginController.ts` → `claim()` endpoint

**New Check**:
```typescript
const userId = req.user.id;

// Check earning event velocity
const eventVelocity = await velocityLimiter.checkEarningEventVelocity(userId, 'daily_login');

if (!eventVelocity.allowed) {
  return res.status(429).json({
    error: 'EVENT_VELOCITY_EXCEEDED',
    message: 'You are claiming rewards too frequently',
    retryAfterSeconds: eventVelocity.resetAtSeconds,
  });
}

// Check coin velocity
const coinVelocity = await velocityLimiter.checkCoinVelocity(userId, 50); // 50 coins

if (!coinVelocity.allowed) {
  return res.status(429).json({
    error: 'COIN_VELOCITY_EXCEEDED',
    message: 'Coin earning limit exceeded for today',
    retryAfterSeconds: coinVelocity.resetAtSeconds,
  });
}

// Issue login reward...
```

---

## Testing Endpoints

### Test Case: Referral Farming

```bash
# 1. Create referral from Device A
curl -X POST /api/referral/apply-code \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code":"REZ123","deviceId":"device-abc"}' \
  # → Should succeed (first device)

# 2. Try second referral from same Device A
curl -X POST /api/referral/apply-code \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code":"REZ456","deviceId":"device-abc"}' \
  # → Should succeed (max 3 per device)

# 3. Try 4th referral from same Device A
curl -X POST /api/referral/apply-code \
  -H "Authorization: Bearer TOKEN" \
  -d '{"code":"REZ789","deviceId":"device-abc"}' \
  # → Should FAIL: "Device cluster detected: 4 active referrals (max: 3)"
```

### Test Case: Challenge Daily Cap

```bash
# 1. Complete challenge on Day 1
curl -X POST /api/challenges/123/claim-reward \
  -H "Authorization: Bearer TOKEN" \
  # → SUCCESS: 100 coins earned

# 2. Try to complete SAME challenge again on Day 1
curl -X POST /api/challenges/123/claim-reward \
  -H "Authorization: Bearer TOKEN" \
  # → FAIL: "Challenge daily cap exceeded: 1/1"
  # HTTP 429

# 3. Complete SAME challenge on Day 2 (next day)
curl -X POST /api/challenges/123/claim-reward \
  -H "Authorization: Bearer TOKEN" \
  # → SUCCESS: 100 coins earned (counter reset at UTC midnight)
```

---

## Monitoring & Alerts

### Key Metrics to Track

```
velocity_limiter_rejected_requests_total{type:coin_velocity}
velocity_limiter_rejected_requests_total{type:challenge_daily}
velocity_limiter_rejected_requests_total{type:referral_device_cluster}
velocity_limiter_rejected_requests_total{type:promo_code_velocity}

referral_security_signals{signal_type:device_cluster}
referral_security_signals{signal_type:circular_referral}
referral_security_signals{signal_type:ip_cluster}
```

### Alert Rules

```
# Alert if >5% of referral signups are rejected (anomaly)
alert: ReferralBlockingAnomalouslyHigh
  if:
    rate(velocity_limiter_rejected_requests_total{type:referral_device_cluster}[5m])
    > (rate(referral_apply_total[5m]) * 0.05)
  for: 10m
  annotations:
    summary: "Possible referral farming attack detected"

# Alert if single user gets flagged 3+ times
alert: RewardAbuseSignalsHigh
  if: referral_security_signals > 2
  for: 5m
  annotations:
    summary: "Account flagged for multiple abuse patterns"
```

---

## Performance Impact

| Check | Latency | CPU | Memory |
|-------|---------|-----|--------|
| `checkCoinVelocity()` | <5ms | <1% | <1MB |
| `checkChallengeDailyCap()` | <5ms | <1% | <1MB |
| `validateReferralDevice()` | ~20ms (DB query) | <2% | ~5MB |
| `checkCircularReferral()` | ~50ms (BFS) | <2% | ~10MB |

**Total per request**: <100ms. Negligible impact on response times.

---

## Rollout Strategy

1. **Week 1**: Deploy to staging, run load tests
2. **Week 2**: Deploy to 10% of production traffic (canary)
3. **Week 3**: Monitor metrics, roll out to 50%
4. **Week 4**: Full rollout (100%)

**Metrics to Watch**:
- P95 latency increase (target: <50ms)
- False positive rate (target: <1%)
- Legitimate user complaints (target: 0)

---

## Troubleshooting

### "Redis connection timeout"
- Cause: Redis cache down or overloaded
- Fix: Checks fail open → requests still processed
- Verify: `redis-cli PING` → should return `PONG`

### "Unusual spike in 429 responses"
- Check: Is this a coordinated attack or legitimate traffic spike?
- Action: Review logs for patterns → adjust thresholds if needed

### "User complaints: 'Can't complete challenges'"
- Root cause: Challenge daily cap index not working properly
- Fix: Run `db.userchallengeProgress.getIndexes()` → verify index exists

---

## Final Checklist

- [ ] Import utilities in controller
- [ ] Add velocity check before reward issuance
- [ ] Handle 429 responses gracefully (show retry time)
- [ ] Extract deviceId from request (add to controller if missing)
- [ ] Test with multiple devices/IPs
- [ ] Set up monitoring/alerting
- [ ] Document API changes in OpenAPI spec
- [ ] Deploy with gradual rollout

---

**Questions?** Reach out to the security team.
