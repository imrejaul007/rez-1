# Anti-Fraud System - Quick Reference Card

## 🚀 Quick Start

### Import Services
```typescript
import fraudDetectionService from '@/services/fraudDetectionService';
import instagramVerificationService from '@/services/instagramVerificationService';
import securityService from '@/services/securityService';
```

### Check Before Submission
```typescript
// 1. Check rate limit
const rateLimit = await fraudDetectionService.checkRateLimit();
if (!rateLimit.allowed) {
  alert(rateLimit.message);
  return;
}

// 2. Check duplicate
const duplicate = await fraudDetectionService.checkDuplicateUrl(url);
if (duplicate.isDuplicate) {
  alert(duplicate.reason);
  return;
}

// 3. Perform security check
const security = await securityService.performSecurityCheck();
if (!security.passed) {
  alert('Security check failed');
  return;
}

// 4. Verify Instagram post (if Instagram)
if (platform === 'instagram') {
  const verification = await instagramVerificationService.verifyInstagramPost(url);
  if (!verification.isValid) {
    alert(verification.errors[0]);
    return;
  }
}

// 5. Submit via enhanced API
const response = await submitPost({ platform, postUrl: url });
```

## 📊 Get User Stats

```typescript
// Fraud stats
const fraudStats = await fraudDetectionService.getFraudStats();
console.log(`Submissions today: ${fraudStats.submissionsToday}/3`);
console.log(`Remaining: ${fraudStats.remainingDailySubmissions}`);

// Security stats
const securityStats = await securityService.getSecurityStats();
console.log(`Trust score: ${securityStats.trustScore}`);
console.log(`Blacklisted: ${securityStats.isBlacklisted}`);
```

## 🎯 Risk Levels

```typescript
// Risk Levels
'low'      // 0-29   - Auto-approve
'medium'   // 30-59  - Standard review
'high'     // 60-79  - Manual review
'critical' // 80-100 - Auto-block

// Trust Scores
70-100 // Trusted device
40-69  // Standard checks
0-39   // Enhanced verification
```

## ⚙️ Configuration

### Fraud Detection
```typescript
MAX_SUBMISSIONS_PER_DAY: 3
MAX_SUBMISSIONS_PER_WEEK: 10
MIN_TIME_BETWEEN_SUBMISSIONS: 3600000 // 1 hour in ms
COOLDOWN_AFTER_REJECTION: 86400000    // 24 hours in ms
```

### Instagram Requirements
```typescript
MIN_ACCOUNT_AGE_DAYS: 30
MIN_FOLLOWER_COUNT: 100
MIN_POST_COUNT: 10
REQUIRED_MENTIONS: ['@rezapp', '#rezapp']
REQUIRED_HASHTAGS: ['#cashback', '#shopping']
MIN_CAPTION_LENGTH: 20
MAX_POST_AGE_DAYS: 30
```

### Security Thresholds
```typescript
TRUST_SCORE_THRESHOLD_LOW: 40    // Minimum to pass
TRUST_SCORE_THRESHOLD_MEDIUM: 70 // Trusted threshold
RISK_THRESHOLD_HIGH: 80          // Auto-block threshold
```

## 🛡️ Security Checks

### Device Fingerprint
```typescript
const fingerprint = await securityService.getDeviceFingerprint();
// Returns: { id, platform, osVersion, deviceModel, hash, ... }
```

### Perform Security Check
```typescript
const check = await securityService.performSecurityCheck();
// Returns: { passed, trustScore, isBlacklisted, isSuspicious, flags }
```

### Report Suspicious Activity
```typescript
await securityService.reportSuspiciousActivity(
  'rapid_submissions',
  { count: 5, timeWindow: '10min' }
);
```

## 📱 Instagram Verification

### Verify Post
```typescript
const result = await instagramVerificationService.verifyInstagramPost(url);
// Returns: { isValid, exists, isAccessible, postData, accountData, warnings }
```

### Parse URL
```typescript
const parsed = instagramVerificationService.parseInstagramUrl(url);
// Returns: { username, postId, postType, isValid }
```

### Validate URL
```typescript
const validation = instagramVerificationService.validateInstagramUrl(url);
// Returns: { isValid, error? }
```

## 🔍 Fraud Detection

### Check Duplicate
```typescript
const duplicate = await fraudDetectionService.checkDuplicateUrl(url);
// Returns: { isDuplicate, existingSubmissionId?, submittedAt?, reason? }
```

### Check Rate Limit
```typescript
const limit = await fraudDetectionService.checkRateLimit();
// Returns: { allowed, remainingSubmissions, resetTime, message? }
```

### Perform Full Fraud Check
```typescript
const fraud = await fraudDetectionService.performFraudCheck(url);
// Returns: {
//   allowed, riskScore, riskLevel,
//   blockedReasons[], warnings[],
//   metadata: { checksPassed, totalChecks, timestamp }
// }
```

### Record Submission
```typescript
await fraudDetectionService.recordSubmission(url);
```

## 🚨 Error Handling

```typescript
try {
  const result = await fraudDetectionService.performFraudCheck(url);

  if (!result.allowed) {
    // Blocked - show user why
    alert(`Submission blocked: ${result.blockedReasons[0]}`);
    return;
  }

  if (result.warnings.length > 0) {
    // Warnings - inform user
    console.warn('Warnings:', result.warnings);
  }

  // Proceed with submission
  await submitPost({ platform, postUrl: url });

} catch (error) {
  console.error('Fraud check failed:', error);
  alert('Unable to verify submission. Please try again.');
}
```

## 📈 Admin Usage

### Get Analytics
```typescript
const analytics = await apiClient.get('/admin/fraud/analytics');
// Returns: { totalSubmissions, fraudRate, topRiskPatterns, ... }
```

### Get Suspicious Posts
```typescript
const posts = await apiClient.get('/admin/fraud/suspicious-posts', {
  riskLevel: 'high',
  page: 1,
  limit: 20
});
```

### Blacklist Device
```typescript
await apiClient.post('/admin/fraud/blacklist', {
  deviceId: 'device_123',
  reason: 'Multiple fake submissions',
  duration: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

## 💡 Common Patterns

### Pre-Submission Validation
```typescript
const validateSubmission = async (url: string) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check rate limit
  const limit = await fraudDetectionService.checkRateLimit();
  if (!limit.allowed) errors.push(limit.message!);

  // Check duplicate
  const dup = await fraudDetectionService.checkDuplicateUrl(url);
  if (dup.isDuplicate) errors.push(dup.reason!);

  // Check security
  const sec = await securityService.performSecurityCheck();
  if (!sec.passed) errors.push('Security check failed');
  if (sec.isSuspicious) warnings.push('Manual review required');

  return { canSubmit: errors.length === 0, errors, warnings };
};
```

### Display Rate Limit Status
```typescript
const RateLimitStatus = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fraudDetectionService.getFraudStats().then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <View>
      <Text>Today: {stats.submissionsToday}/3</Text>
      <Text>Remaining: {stats.remainingDailySubmissions}</Text>
      {stats.isBlocked && <Text>⚠️ Temporarily blocked</Text>}
    </View>
  );
};
```

### Show Security Indicators
```typescript
const SecurityIndicator = () => {
  const [security, setSecurity] = useState(null);

  useEffect(() => {
    securityService.getSecurityStats().then(setSecurity);
  }, []);

  if (!security) return null;

  const color = security.trustScore >= 70 ? 'green' :
                security.trustScore >= 40 ? 'yellow' : 'red';

  return (
    <View>
      <Text style={{ color }}>
        Trust Score: {security.trustScore}
      </Text>
      {security.isBlacklisted && <Text>🚫 Device Blocked</Text>}
    </View>
  );
};
```

## 🐛 Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('fraud_detection_debug', 'true');

// Check fraud detection status
console.log(await fraudDetectionService.getFraudStats());
console.log(await securityService.getSecurityStats());

// Clear local data (for testing)
await fraudDetectionService.clearSubmissionHistory();
await securityService.clearSecurityData();
```

## 📝 Testing

### Test Scenarios
```typescript
// 1. Test duplicate detection
const url = 'https://instagram.com/p/TEST123/';
await fraudDetectionService.recordSubmission(url);
const dup = await fraudDetectionService.checkDuplicateUrl(url);
console.log('Duplicate:', dup.isDuplicate); // Should be true

// 2. Test rate limiting
for (let i = 0; i < 4; i++) {
  const limit = await fraudDetectionService.checkRateLimit();
  console.log(`Attempt ${i + 1}:`, limit.allowed);
  if (limit.allowed) {
    await fraudDetectionService.recordSubmission(`url-${i}`);
  }
}

// 3. Test security check
const security = await securityService.performSecurityCheck();
console.log('Trust score:', security.trustScore);
console.log('Flags:', security.flags);
```

## 🔐 Security Best Practices

1. **Always validate on backend**: Frontend checks are first line of defense only
2. **Log all fraud events**: Track patterns and suspicious activity
3. **Review thresholds regularly**: Adjust based on false positive rate
4. **Update blacklist**: Remove expired blocks, add new threats
5. **Monitor fraud rate**: Alert if > 15%
6. **Test regularly**: Run test submissions to verify system works

## 📞 Support

### Issues
- Legitimate user blocked? Lower trust threshold or whitelist device
- Too many false positives? Adjust risk scoring weights
- Instagram verification failing? Check API credentials

### Performance
- Slow fraud checks? Enable caching, optimize backend
- High memory usage? Reduce cache TTL
- Network errors? Implement retry logic

## 📚 Related Files

- **Services**: `services/fraudDetectionService.ts`, `services/instagramVerificationService.ts`, `services/securityService.ts`
- **Types**: `types/fraud-detection.types.ts`
- **API**: `services/socialMediaApi.ts`
- **Docs**: `ANTI_FRAUD_SYSTEM_DOCUMENTATION.md`, `ANTI_FRAUD_IMPLEMENTATION_GUIDE.md`

---

**Last Updated**: 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
