# Bill Upload Deployment Guide

> Step-by-step guide for deploying the bill upload system to production

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Testing Procedures](#testing-procedures)
4. [Deployment Steps](#deployment-steps)
5. [Monitoring Setup](#monitoring-setup)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (80%+ coverage)
- [ ] No console errors or warnings
- [ ] ESLint checks passing
- [ ] TypeScript compilation successful
- [ ] Code review completed
- [ ] Documentation updated

### Features

- [ ] Image upload working (camera + gallery)
- [ ] Form validation functioning correctly
- [ ] Merchant selection operational
- [ ] Cashback calculation accurate
- [ ] Progress tracking displaying correctly
- [ ] Error handling comprehensive
- [ ] Retry logic tested
- [ ] Offline support verified

### Performance

- [ ] Page load time < 2s
- [ ] Image compression optimized
- [ ] Form validation < 100ms
- [ ] Upload speed > 500KB/s
- [ ] Memory leaks checked
- [ ] Bundle size acceptable

### Security

- [ ] API endpoints secured
- [ ] Auth token implementation verified
- [ ] File size validation in place
- [ ] Input sanitization implemented
- [ ] HTTPS enforced
- [ ] EXIF data stripped from images

### Accessibility

- [ ] Screen reader compatible
- [ ] Keyboard navigation working
- [ ] Error messages clear
- [ ] Color contrast acceptable
- [ ] Touch targets >= 44px

---

## Environment Setup

### 1. Environment Variables

Create `.env.production`:

```bash
# API Configuration
API_BASE_URL=https://api.production.com
API_TIMEOUT=30000

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_CHUNK_SIZE=524288
MAX_RETRY_ATTEMPTS=3

# Feature Flags
ENABLE_OCR=true
ENABLE_FRAUD_DETECTION=true
ENABLE_OFFLINE_QUEUE=true

# Analytics
ANALYTICS_ENABLED=true
ERROR_REPORTING_ENABLED=true

# Cache Configuration
CACHE_TTL=3600
```

### 2. Build Configuration

Update `app.json`:

```json
{
  "expo": {
    "name": "Your App",
    "version": "1.0.0",
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access to capture bill photos",
        "NSPhotoLibraryUsageDescription": "We need photo library access to select bill images"
      }
    }
  }
}
```

### 3. API Endpoints Configuration

Verify all endpoints are configured:

```typescript
// config/api.config.ts
export const API_ENDPOINTS = {
  BILL_UPLOAD: '/bills/upload',
  BILL_HISTORY: '/bills',
  BILL_DETAIL: '/bills/:id',
  BILL_RESUBMIT: '/bills/:id/resubmit',
  BILL_STATISTICS: '/bills/statistics',
  STORES: '/stores',
  MERCHANT_SEARCH: '/merchants/search',
};
```

---

## Testing Procedures

### 1. Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- bill-upload.test.tsx
```

**Expected Coverage:**
- Overall: >= 80%
- Services: >= 85%
- Utilities: >= 95%
- Components: >= 75%

### 2. Integration Tests

```bash
# Test bill upload flow
npm run test:integration -- bill-upload

# Test offline functionality
npm run test:integration -- offline

# Test error scenarios
npm run test:integration -- errors
```

### 3. E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Test specific scenarios
npm run test:e2e -- --spec "bill-upload.spec.ts"
```

**Test Scenarios:**
- [ ] Upload bill with valid data
- [ ] Handle network errors
- [ ] Retry failed uploads
- [ ] Form validation
- [ ] Offline queue
- [ ] Image capture/selection
- [ ] Merchant search
- [ ] Cashback calculation

### 4. Manual Testing

#### Test Cases

**TC1: Happy Path**
1. Navigate to bill upload page
2. Take photo with camera
3. Select merchant
4. Enter amount (1000)
5. Submit form
6. Verify success message
7. Check bill in history

**TC2: Validation Errors**
1. Try to submit without image
2. Verify error message
3. Add image
4. Enter amount below minimum (25)
5. Verify error message
6. Correct amount
7. Select future date
8. Verify error message

**TC3: Network Error**
1. Disable network
2. Fill and submit form
3. Verify offline queue message
4. Enable network
5. Verify auto-retry
6. Check success

**TC4: Image Quality**
1. Take blurry photo
2. Verify quality warning
3. Retake photo
4. Verify acceptance

### 5. Performance Testing

```bash
# Measure bundle size
npm run analyze-bundle

# Measure load time
npm run measure-perf

# Memory leak check
npm run check-memory
```

**Benchmarks:**
- Initial load: < 2s
- Image preview: < 500ms
- Form submission: < 300ms
- Upload completion: Based on file size and network

---

## Deployment Steps

### Step 1: Prepare Release

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Build production bundle
npm run build:production

# 3. Run final tests
npm test -- --ci

# 4. Create release branch
git checkout -b release/v1.0.0
git add .
git commit -m "Release v1.0.0"
git push origin release/v1.0.0
```

### Step 2: Deploy Backend (if applicable)

```bash
# 1. Deploy backend API
cd backend
npm run deploy:production

# 2. Verify endpoints
curl https://api.production.com/health

# 3. Test bill upload endpoint
curl -X POST https://api.production.com/bills/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "billImage=@test.jpg"
```

### Step 3: Deploy Mobile App

#### For Android

```bash
# 1. Build APK/AAB
eas build --platform android --profile production

# 2. Upload to Google Play Console
# - Internal testing track first
# - Then beta track
# - Finally production (phased rollout)

# 3. Monitor crash reports
```

#### For iOS

```bash
# 1. Build IPA
eas build --platform ios --profile production

# 2. Upload to App Store Connect
# - TestFlight first
# - Then production (phased release)

# 3. Monitor crash reports
```

#### For Web

```bash
# 1. Build web bundle
npm run build:web

# 2. Deploy to hosting
npm run deploy:web

# 3. Verify deployment
curl https://app.production.com
```

### Step 4: Verify Deployment

```bash
# Run smoke tests
npm run test:smoke

# Check critical paths
- Bill upload flow
- Form validation
- Error handling
- Offline support
```

### Step 5: Enable Monitoring

```bash
# Enable error tracking
# Configure alerts
# Set up dashboards
```

---

## Monitoring Setup

### 1. Error Tracking

Configure error tracking service (e.g., Sentry):

```typescript
// config/monitoring.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Authorization;
    }
    return event;
  },
});
```

### 2. Analytics

Track key metrics:

```typescript
// Track upload events
analytics.track('Bill Upload Started', {
  merchantId,
  amount,
  timestamp: Date.now(),
});

analytics.track('Bill Upload Completed', {
  billId,
  duration,
  fileSize,
  success: true,
});

analytics.track('Bill Upload Failed', {
  errorCode,
  errorMessage,
  attempt,
});
```

### 3. Performance Monitoring

```typescript
// Measure critical operations
const startTime = performance.now();
await uploadBill(data);
const duration = performance.now() - startTime;

performance.track('Bill Upload Duration', {
  duration,
  fileSize,
  networkSpeed,
});
```

### 4. Alerts

Configure alerts for:

- Upload failure rate > 5%
- Average upload time > 30s
- Error rate > 10%
- API response time > 5s
- Crash rate > 1%

---

## Rollback Procedures

### Immediate Rollback

If critical issues detected:

```bash
# 1. Revert to previous version
git revert HEAD
git push origin main

# 2. Redeploy previous version
npm run deploy:rollback

# 3. Notify users
# Send in-app message about temporary issues
```

### Gradual Rollback

For phased deployments:

```bash
# 1. Stop rollout
# In App Store Connect / Google Play Console

# 2. Reduce rollout percentage
# From 50% to 0%

# 3. Monitor metrics
# Wait for user feedback

# 4. Decide: fix forward or rollback
```

### Database Rollback

If data migration required:

```bash
# 1. Stop new uploads
# Enable maintenance mode

# 2. Backup current data
npm run backup:database

# 3. Run rollback migration
npm run migrate:rollback

# 4. Verify data integrity
npm run verify:data

# 5. Resume operations
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Upload Failing

**Symptoms:**
- All uploads fail with network error
- Error code: NETWORK_ERROR

**Diagnosis:**
```bash
# Check API connectivity
curl https://api.production.com/health

# Check auth token
curl https://api.production.com/bills \
  -H "Authorization: Bearer $TOKEN"

# Check file size limits
```

**Solutions:**
1. Verify API endpoint is accessible
2. Check auth token expiry
3. Verify file size within limits
4. Check CORS configuration

#### Issue 2: Slow Uploads

**Symptoms:**
- Uploads taking > 1 minute
- Users complaining about speed

**Diagnosis:**
```bash
# Measure upload speed
npm run measure:upload-speed

# Check image compression
npm run analyze:image-size

# Monitor network latency
```

**Solutions:**
1. Increase compression quality
2. Reduce image resolution
3. Implement chunk uploading
4. Optimize API endpoint

#### Issue 3: Form Not Saving

**Symptoms:**
- Form data not persisting
- Draft not restored

**Diagnosis:**
```typescript
// Check AsyncStorage
const data = await AsyncStorage.getAllKeys();
console.log('Stored keys:', data);

// Check storage permissions
// Verify quota limits
```

**Solutions:**
1. Clear AsyncStorage
2. Check storage quota
3. Verify permissions
4. Check for storage errors

#### Issue 4: Camera Not Working

**Symptoms:**
- Camera doesn't open
- Permission denied error

**Diagnosis:**
```typescript
// Check permissions
const { status } = await Camera.requestCameraPermissionsAsync();
console.log('Camera permission:', status);
```

**Solutions:**
1. Request permissions again
2. Guide user to settings
3. Fallback to gallery only
4. Show helpful error message

### Debug Mode

Enable debug logging:

```typescript
// config/debug.ts
export const DEBUG_CONFIG = {
  logUploads: true,
  logValidation: true,
  logErrors: true,
  verboseLogging: process.env.NODE_ENV === 'development',
};

// Usage
if (DEBUG_CONFIG.logUploads) {
  console.log('Upload started:', data);
}
```

### Health Checks

Run health checks:

```bash
# System health
npm run health:check

# Component health
npm run health:components

# API health
npm run health:api
```

---

## Post-Deployment

### 1. Monitor Metrics

**First 24 Hours:**
- Upload success rate
- Error rate
- User feedback
- Crash reports
- Performance metrics

**First Week:**
- Feature adoption
- User retention
- Support tickets
- Performance trends

### 2. User Communication

```markdown
# Release Notes v1.0.0

## New Features
- Bill upload with real-time progress
- Automatic cashback calculation
- Offline support with queue
- Enhanced error messages

## Improvements
- Faster image upload
- Better validation
- Improved user experience

## Bug Fixes
- Fixed camera permission issue
- Improved error handling
- Better offline support
```

### 3. Documentation Updates

- [ ] Update user guide
- [ ] Update API documentation
- [ ] Update troubleshooting guide
- [ ] Update changelog

---

## Checklist Summary

### Pre-Launch
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation updated

### Launch
- [ ] Backend deployed
- [ ] Mobile apps deployed
- [ ] Web app deployed
- [ ] Monitoring enabled
- [ ] Alerts configured

### Post-Launch
- [ ] Metrics monitored
- [ ] User feedback collected
- [ ] Issues triaged
- [ ] Documentation updated
- [ ] Team debriefed

---

**Document Version:** 1.0.0
**Last Updated:** January 2025
**Maintained By:** DevOps Team
