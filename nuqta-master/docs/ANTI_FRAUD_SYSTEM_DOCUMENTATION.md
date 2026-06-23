# Anti-Fraud System Documentation

## Overview

This document describes the comprehensive anti-fraud system implemented for the social media earning feature. The system prevents users from submitting fake posts for unlimited cashback through multiple layers of security and verification.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Submits Post                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Basic URL Validation                         │
│  - Format validation                                         │
│  - Platform verification                                     │
│  - Input sanitization                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Security Check                               │
│  - Device fingerprinting                                     │
│  - Blacklist verification                                    │
│  - VPN/Proxy detection                                       │
│  - Emulator detection                                        │
│  - Trust score calculation                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Fraud Detection                              │
│  - Duplicate URL check (local + backend)                    │
│  - Rate limiting (hourly, daily, weekly)                    │
│  - Submission velocity analysis                              │
│  - Pattern detection                                         │
│  - Risk score calculation                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Instagram Verification (Instagram only)      │
│  - Post existence verification                               │
│  - Account verification                                      │
│  - Content analysis (brand mentions, hashtags)               │
│  - Engagement metrics check                                  │
│  - Post age verification                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Captcha Check (if required)                  │
│  - Risk-based captcha                                        │
│  - Multiple failure protection                               │
│  - Time-based expiry                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              6. Backend Submission                           │
│  - Includes fraud metadata                                   │
│  - Device fingerprint                                        │
│  - Risk scores                                               │
│  - Automatic/manual review routing                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Success/Failure Response                         │
└─────────────────────────────────────────────────────────────┘
```

## Services

### 1. Fraud Detection Service (`fraudDetectionService.ts`)

**Purpose**: Core fraud detection logic including duplicate detection, rate limiting, and pattern analysis.

**Key Features**:
- **Duplicate Detection**: Checks both local storage and backend for previously submitted URLs
- **Rate Limiting**:
  - Max 3 submissions per day
  - Max 10 submissions per week
  - Min 1 hour between submissions
- **Velocity Analysis**: Detects suspicious submission patterns
- **Risk Scoring**: 0-100 scale with configurable thresholds
- **Cooldown Periods**: Automatic blocking after violations

**Configuration**:
```typescript
const FRAUD_CONFIG = {
  MAX_SUBMISSIONS_PER_DAY: 3,
  MAX_SUBMISSIONS_PER_WEEK: 10,
  MIN_TIME_BETWEEN_SUBMISSIONS: 3600000, // 1 hour
  MIN_ACCOUNT_AGE_DAYS: 30,
  MIN_FOLLOWER_COUNT: 100,
  RISK_THRESHOLD_HIGH: 80,
};
```

**Key Functions**:
- `performFraudCheck(url)`: Main entry point for fraud detection
- `checkDuplicateUrl(url)`: Verify URL hasn't been submitted before
- `checkRateLimit()`: Enforce submission rate limits
- `checkSubmissionVelocity()`: Detect automated patterns
- `recordSubmission(url)`: Track successful submissions
- `getFraudStats()`: Get user's fraud statistics

**Risk Scoring Algorithm**:
```
Base Score: 100 (Full Trust)

Critical Factors (immediate block):
- Duplicate URL: +90 points
- Duplicate Image: +85 points

Major Factors:
- Rate Limit Violation: +40 points
- Suspicious Velocity: +35 points
- Multiple Devices: +30 points

Moderate Factors:
- Account Too New: +25 points
- Low Follower Count: +20 points

Risk Levels:
- Low: 0-29
- Medium: 30-59
- High: 60-79
- Critical: 80-100
```

### 2. Instagram Verification Service (`instagramVerificationService.ts`)

**Purpose**: Verifies Instagram posts and accounts via Instagram Graph API integration.

**Key Features**:
- **Post Verification**: Checks if post exists and is accessible
- **Account Verification**: Validates account age, followers, post count
- **Content Analysis**: Verifies brand mentions and required hashtags
- **URL Parsing**: Supports multiple Instagram URL formats
- **Match Scoring**: Calculates how well post meets requirements

**Content Requirements**:
```typescript
REQUIRED_BRAND_MENTIONS = ['@rezapp', '#rezapp', 'rez app']
REQUIRED_HASHTAGS = ['#cashback', '#shopping']
MIN_CAPTION_LENGTH = 20
MAX_POST_AGE_DAYS = 30
CONTENT_MATCH_THRESHOLD = 0.6 // 60%
```

**Key Functions**:
- `verifyInstagramPost(url)`: Full post verification
- `verifyInstagramAccount(username)`: Account-only verification
- `parseInstagramUrl(url)`: Extract post ID and username
- `validateInstagramUrl(url)`: Format validation
- `extractInstagramPostData(url)`: Lightweight data extraction

**Supported URL Formats**:
```
https://instagram.com/p/POST_ID/
https://instagram.com/reel/POST_ID/
https://instagram.com/username/p/POST_ID/
https://instagram.com/username/reel/POST_ID/
```

### 3. Security Service (`securityService.ts`)

**Purpose**: Device fingerprinting, security checks, and threat detection.

**Key Features**:
- **Device Fingerprinting**: Unique device identification
- **Blacklist Checking**: Verify device isn't banned
- **VPN/Proxy Detection**: Identify connection spoofing
- **Emulator Detection**: Block automated bot submissions
- **Multi-Account Detection**: Identify users with multiple accounts
- **Trust Scoring**: Calculate device trustworthiness
- **Captcha Management**: Risk-based captcha verification

**Device Fingerprint Components**:
```typescript
{
  id: string,              // Unique device ID
  platform: string,        // iOS/Android/Web
  osVersion: string,       // OS version
  deviceModel: string,     // Device model
  deviceName: string,      // Device name
  appVersion: string,      // App version
  uniqueId: string,        // Persistent ID
  timestamp: number,       // Creation time
  hash: string            // Fingerprint hash
}
```

**Key Functions**:
- `generateDeviceFingerprint()`: Create unique device ID
- `performSecurityCheck()`: Comprehensive security validation
- `reportSuspiciousActivity()`: Flag suspicious behavior
- `isCaptchaRequired()`: Determine if captcha needed
- `verifyCaptcha(token)`: Verify captcha response
- `getSecurityStats()`: Get device security statistics

**Trust Score Calculation**:
```
Base: 100 (Full Trust)

Deductions:
- Blacklisted: -100 (instant fail)
- Emulator: -30
- VPN/Proxy: -20
- Tor Network: -40
- Multiple Accounts (high): -30
- Multiple Accounts (medium): -15
- Suspicious Activities: -10 each

Thresholds:
- Pass: >= 40
- Suspicious: < 70
```

### 4. Enhanced Social Media API (`socialMediaApi.ts`)

**Purpose**: Integrates all fraud detection services into the submission flow.

**Submission Flow**:
```typescript
async function submitPost(data) {
  // 1. Basic Validation
  validatePlatform()
  validateURL()

  // 2. Security Check
  const security = await securityService.performSecurityCheck()
  if (!security.passed) throw Error()

  // 3. Fraud Detection
  const fraud = await fraudDetectionService.performFraudCheck()
  if (!fraud.allowed) throw Error()

  // 4. Instagram Verification (if Instagram)
  if (platform === 'instagram') {
    const insta = await instagramVerificationService.verifyPost()
    if (!insta.isValid) throw Error()
  }

  // 5. Captcha (if required)
  if (await securityService.isCaptchaRequired()) {
    requireCaptcha()
  }

  // 6. Submit with Fraud Metadata
  return apiClient.post('/social-media/submit', {
    ...data,
    fraudMetadata: {
      deviceId,
      trustScore,
      riskScore,
      riskLevel,
      warnings
    }
  })
}
```

## Admin Dashboard Integration

### Required Backend Endpoints

The following endpoints should be implemented on the backend to support the admin fraud detection dashboard:

#### 1. Get Fraud Analytics
```
GET /api/admin/fraud/analytics
Response: {
  totalSubmissions: number,
  fraudulentSubmissions: number,
  fraudRate: number,
  blockedDevices: number,
  topRiskPatterns: [
    { pattern: string, count: number }
  ],
  recentFlags: [
    { postId, reason, timestamp }
  ]
}
```

#### 2. Get Suspicious Posts
```
GET /api/admin/fraud/suspicious-posts
Query: ?riskLevel=high&page=1&limit=20
Response: {
  posts: [
    {
      id, url, userId, deviceId,
      riskScore, riskLevel,
      flags, submittedAt
    }
  ],
  pagination: { ... }
}
```

#### 3. Blacklist Device
```
POST /api/admin/fraud/blacklist
Body: {
  deviceId: string,
  reason: string,
  duration: number // milliseconds
}
```

#### 4. Review Submission
```
POST /api/admin/fraud/review/:postId
Body: {
  action: 'approve' | 'reject' | 'flag',
  notes: string
}
```

#### 5. Get Device History
```
GET /api/admin/fraud/device/:deviceId
Response: {
  deviceId, trustScore, submissions, flags,
  accounts: [ ... ],
  ipAddresses: [ ... ]
}
```

### Admin Dashboard Features

1. **Fraud Analytics Dashboard**
   - Real-time fraud rate metrics
   - Risk score distribution charts
   - Top fraud patterns
   - Geographic fraud hotspots

2. **Suspicious Posts Queue**
   - Filter by risk level
   - Bulk actions
   - Quick approve/reject
   - Detailed fraud information

3. **Device Management**
   - Blacklist/whitelist devices
   - View device history
   - Multi-account detection
   - Trust score override

4. **Pattern Analysis**
   - Automated pattern detection
   - Custom rule configuration
   - Alert thresholds
   - Trend analysis

5. **User Management**
   - View user submission history
   - Check fraud statistics
   - Temporary blocks
   - Warning system

## Frontend Implementation

### Updated Files

1. **services/fraudDetectionService.ts** ✅
   - Core fraud detection logic
   - 850+ lines of comprehensive checks

2. **services/instagramVerificationService.ts** ✅
   - Instagram Graph API integration
   - 600+ lines of verification logic

3. **services/securityService.ts** ✅
   - Device fingerprinting and security
   - 550+ lines of security measures

4. **services/socialMediaApi.ts** ✅
   - Enhanced with fraud integration
   - 6-step submission process

### Files to Update

5. **app/earn-from-social-media.tsx**
   - Add security requirements display
   - Show rate limit status
   - Add fraud warnings
   - Display submission requirements

6. **hooks/useEarnFromSocialMedia.ts**
   - Integrate fraud checks
   - Handle security errors
   - Add pre-submission validation

7. **app/admin/social-media-posts.tsx**
   - Add fraud indicators
   - Show risk scores
   - Add bulk fraud actions
   - Device management

8. **components/admin/FraudAnalyticsDashboard.tsx** (NEW)
   - Fraud metrics visualization
   - Pattern analysis tools
   - Blacklist management

9. **types/fraud-detection.types.ts** (NEW)
   - TypeScript interfaces
   - Type definitions

## User Experience

### Clear Requirements Display

The earn-from-social-media screen should clearly show:

1. **Submission Requirements**:
   ```
   ✓ Post must be public
   ✓ Must mention @rezapp or #rezapp
   ✓ Include #cashback or #shopping hashtag
   ✓ Account must have 100+ followers
   ✓ Account must be 30+ days old
   ```

2. **Rate Limit Status**:
   ```
   Today's Submissions: 2/3
   Next submission available: 45 minutes
   Weekly limit: 7/10 remaining
   ```

3. **Warnings** (if applicable):
   ```
   ⚠️ Your account has few followers
   ⚠️ Post content match score is low
   ℹ️ Manual review may take up to 48 hours
   ```

### Error Messages

Clear, actionable error messages:

```
❌ "This post has already been submitted"
❌ "Daily submission limit reached (3/3). Try again in 4 hours."
❌ "Post does not mention our brand. Please add @rezapp"
❌ "Your account has been temporarily blocked. Contact support."
❌ "Please disable VPN before submitting"
```

## Backend Requirements

### Database Schema Updates

The backend should store fraud detection metadata:

```sql
-- Add to social_posts table
ALTER TABLE social_posts ADD COLUMN device_id VARCHAR(255);
ALTER TABLE social_posts ADD COLUMN trust_score INTEGER;
ALTER TABLE social_posts ADD COLUMN risk_score INTEGER;
ALTER TABLE social_posts ADD COLUMN risk_level VARCHAR(50);
ALTER TABLE social_posts ADD COLUMN fraud_flags JSON;
ALTER TABLE social_posts ADD COLUMN fraud_warnings JSON;
ALTER TABLE social_posts ADD COLUMN requires_manual_review BOOLEAN DEFAULT FALSE;

-- New table for device tracking
CREATE TABLE device_fingerprints (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  platform VARCHAR(50),
  device_model VARCHAR(255),
  trust_score INTEGER,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  blacklist_until TIMESTAMP,
  created_at TIMESTAMP,
  last_seen TIMESTAMP
);

-- New table for fraud patterns
CREATE TABLE fraud_patterns (
  id UUID PRIMARY KEY,
  pattern_type VARCHAR(100),
  device_id VARCHAR(255),
  user_id VARCHAR(255),
  details JSON,
  severity VARCHAR(50),
  detected_at TIMESTAMP
);

-- New table for submission history
CREATE TABLE submission_history (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  device_id VARCHAR(255),
  post_url TEXT,
  post_id VARCHAR(255),
  ip_address VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_user_id (user_id),
  INDEX idx_post_id (post_id)
);
```

### New API Endpoints Required

1. `/api/social-media/check-duplicate` - Check if URL already submitted
2. `/api/social-media/instagram/verify-post` - Verify Instagram post
3. `/api/social-media/instagram/verify-account` - Verify Instagram account
4. `/api/social-media/instagram/extract-post-data` - Extract post data
5. `/api/security/verify-device` - Verify device fingerprint
6. `/api/security/check-blacklist` - Check if device blacklisted
7. `/api/security/report-suspicious` - Report suspicious activity
8. `/api/security/ip-info` - Get IP information
9. `/api/security/check-multi-account` - Detect multiple accounts

### Instagram Graph API Integration

The backend needs to integrate with Instagram Graph API:

```javascript
// Example backend implementation
const axios = require('axios');

async function verifyInstagramPost(postUrl) {
  const postId = extractPostId(postUrl);

  // Call Instagram Graph API
  const response = await axios.get(
    `https://graph.instagram.com/${postId}`,
    {
      params: {
        fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count',
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN
      }
    }
  );

  return response.data;
}
```

## Testing

### Test Cases

1. **Duplicate Detection**:
   - Submit same URL twice
   - Submit same post ID with different URL format
   - Submit from different device

2. **Rate Limiting**:
   - Submit 4 posts in one day
   - Submit posts within 1 hour
   - Submit 11 posts in one week

3. **Security**:
   - Submit from emulator
   - Submit with VPN enabled
   - Submit from blacklisted device

4. **Instagram Verification**:
   - Submit invalid URL
   - Submit private post
   - Submit deleted post
   - Submit post without brand mention

5. **Content Requirements**:
   - Post without hashtags
   - Post without brand mention
   - Short caption (< 20 chars)
   - Old post (> 30 days)

### Test Accounts

Create test accounts with:
- New account (< 30 days)
- Low followers (< 100)
- Normal account (meets requirements)
- Blacklisted device

## Configuration

### Environment Variables

Add to `.env`:

```env
# Instagram API
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret

# Fraud Detection
FRAUD_DETECTION_ENABLED=true
FRAUD_DETECTION_STRICT_MODE=false
MAX_DAILY_SUBMISSIONS=3
MAX_WEEKLY_SUBMISSIONS=10

# Security
DEVICE_TRUST_THRESHOLD=40
CAPTCHA_ENABLED=true
CAPTCHA_SITE_KEY=your_captcha_site_key

# Admin
FRAUD_ALERT_EMAIL=admin@yourapp.com
FRAUD_ALERT_THRESHOLD=0.15 // 15% fraud rate
```

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  ENABLE_FRAUD_DETECTION: true,
  ENABLE_INSTAGRAM_VERIFICATION: true,
  ENABLE_DEVICE_FINGERPRINTING: true,
  ENABLE_CAPTCHA: false, // TODO: Implement captcha UI
  ENABLE_VPN_BLOCKING: true,
  ENABLE_MULTI_ACCOUNT_DETECTION: true,
  REQUIRE_MANUAL_REVIEW_FOR_NEW_ACCOUNTS: true,
};
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Fraud Rate**: % of submissions flagged as fraudulent
2. **Block Rate**: % of submissions blocked
3. **False Positive Rate**: % of legitimate submissions blocked
4. **Average Risk Score**: Mean risk score of submissions
5. **Duplicate Detection Rate**: % of duplicates caught
6. **Rate Limit Violations**: # of rate limit violations

### Alert Thresholds

- Fraud rate > 15%: Email alert to admin
- Block rate > 30%: Review fraud rules (too strict?)
- False positive rate > 5%: Adjust thresholds
- Spike in submissions from single device: Investigate

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review flagged posts
   - Update blacklist
   - Adjust risk thresholds
   - Clear expired captchas

2. **Monthly**:
   - Analyze fraud patterns
   - Update content requirements
   - Review trust scores
   - Train fraud detection models

3. **Quarterly**:
   - Security audit
   - Performance optimization
   - User feedback review
   - Rule effectiveness analysis

## Future Enhancements

1. **Machine Learning**:
   - Train ML model on fraud patterns
   - Automated pattern detection
   - Predictive risk scoring

2. **Image Analysis**:
   - Perceptual hashing for duplicate images
   - OCR for text verification
   - Brand logo detection

3. **Social Graph Analysis**:
   - Detect bot networks
   - Identify fake accounts
   - Engagement authenticity check

4. **Blockchain Verification**:
   - Immutable submission ledger
   - Proof of authenticity
   - Decentralized verification

5. **Advanced Captcha**:
   - Behavioral biometrics
   - Invisible captcha
   - Risk-adaptive challenges

## Support & Troubleshooting

### Common Issues

**Issue**: Legitimate users getting blocked
**Solution**: Lower trust score threshold, review fraud rules

**Issue**: High false positive rate
**Solution**: Adjust risk scoring weights, add appeal process

**Issue**: Instagram verification failing
**Solution**: Check Instagram API credentials, implement fallback

**Issue**: Rate limits too restrictive
**Solution**: Increase limits or implement tier system

### Debug Mode

Enable debug logging:
```typescript
localStorage.setItem('fraud_detection_debug', 'true');
```

This will log detailed information about each fraud check step.

## Conclusion

This comprehensive anti-fraud system provides multiple layers of protection against fake submissions while maintaining a good user experience for legitimate users. The system is modular, configurable, and can be easily extended with additional checks and verification methods.

Key Success Factors:
✅ Multiple verification layers
✅ Real-time fraud detection
✅ Automatic and manual review options
✅ Clear user feedback
✅ Detailed admin tools
✅ Scalable architecture
✅ Comprehensive logging

The system significantly reduces fraud while allowing legitimate users to earn cashback rewards seamlessly.
