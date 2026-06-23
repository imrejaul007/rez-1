# Deployment Guide
## Rez App - Step-by-Step Production Deployment

**Version**: 1.0.0
**Last Updated**: 2025-11-14
**Status**: Ready for deployment (Frontend only - pending backend fixes)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Build Configuration](#build-configuration)
4. [iOS Deployment](#ios-deployment)
5. [Android Deployment](#android-deployment)
6. [Web Deployment](#web-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring Setup](#monitoring-setup)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Before You Begin ⚠️

**CRITICAL**: Do not deploy until backend issues are resolved!

Current blockers:
- ❌ Backend authentication token refresh (401 errors)
- ❌ WebSocket connection stability issues
- ❌ API 500 errors on multiple endpoints
- ⚠️ Database incomplete data

**Estimated time to backend readiness**: 2-3 weeks

---

### Frontend Pre-Deployment Checks ✅

Run this checklist before deployment:

```bash
# 1. Verify all tests pass
npm test -- --no-coverage

# Expected: 400+ tests passing, 99%+ pass rate
```

```bash
# 2. Check TypeScript errors
npx tsc --noEmit

# Expected: 0 errors
```

```bash
# 3. Check ESLint warnings
npm run lint

# Expected: < 15 warnings (mostly non-critical)
```

```bash
# 4. Verify environment variables
cat .env.production

# Verify all required variables are set
```

```bash
# 5. Test production build
npm run build

# Should complete without errors
```

### Manual Checks

- [ ] All critical features tested manually
- [ ] Authentication flow works end-to-end
- [ ] Payment integration tested (test mode)
- [ ] Push notifications configured
- [ ] Deep linking tested
- [ ] Offline mode tested
- [ ] All API endpoints responding
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured
- [ ] App icons and splash screens ready

---

## Environment Setup

### 1. Environment Variables

Create `.env.production` file:

```bash
# API Configuration
API_BASE_URL=https://api.production.rezapp.com
API_TIMEOUT=30000
API_VERSION=v1

# Authentication
AUTH_TOKEN_KEY=rez_auth_token
AUTH_REFRESH_KEY=rez_refresh_token
SESSION_TIMEOUT=3600000

# WebSocket
WEBSOCKET_URL=wss://ws.production.rezapp.com
WEBSOCKET_RECONNECT_ATTEMPTS=5
WEBSOCKET_RECONNECT_DELAY=3000

# Storage
ASYNC_STORAGE_PREFIX=@rez_app_prod_

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_UPLOAD_PRESET=production_preset

# Payment
RAZORPAY_KEY_ID=your_production_key_id
STRIPE_PUBLISHABLE_KEY=your_production_key

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your_token

# Error Tracking
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production

# Feature Flags
ENABLE_GAMIFICATION=true
ENABLE_SOCIAL_FEATURES=true
ENABLE_VIDEO_FEATURES=true
ENABLE_AR_FEATURES=false

# App Configuration
APP_VERSION=1.0.0
APP_BUILD_NUMBER=1
ENVIRONMENT=production
DEBUG_MODE=false
```

### 2. Configuration Files

Update `app.json`:

```json
{
  "expo": {
    "name": "Rez App",
    "slug": "rez-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "rezapp",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.rezapp.ios",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.rezapp.android",
      "versionCode": 1
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

## Build Configuration

### Install EAS CLI

```bash
npm install -g eas-cli
```

### Login to Expo

```bash
eas login
```

### Configure EAS Build

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Debug"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "autoIncrement": true,
      "env": {
        "ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./android-service-account.json",
        "track": "production"
      }
    }
  }
}
```

---

## iOS Deployment

### Prerequisites

- Apple Developer Account ($99/year)
- Mac computer with Xcode installed
- App Store Connect access
- Certificates and provisioning profiles

### Step 1: Prepare iOS Assets

```bash
# Generate app icons
npx expo-optimize

# Verify all iOS assets
ls -la assets/images/
# Should see: icon.png, adaptive-icon.png, splash.png
```

### Step 2: Configure App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill in app information:
   - Name: Rez App
   - Bundle ID: com.rezapp.ios
   - SKU: rezapp-ios-001
   - Category: Shopping
4. Upload screenshots (required sizes)
5. Write app description
6. Set privacy policy URL
7. Configure in-app purchases (if any)

### Step 3: Build for iOS

```bash
# Build production iOS app
eas build --platform ios --profile production

# This will:
# 1. Upload code to EAS
# 2. Build on EAS servers
# 3. Generate IPA file
# 4. Provide download link
```

### Step 4: Test iOS Build

```bash
# Install TestFlight build
eas submit --platform ios --profile production --latest

# Add internal testers in App Store Connect
# Test thoroughly before public release
```

### Step 5: Submit to App Store

```bash
# Submit for review
eas submit --platform ios --profile production

# Or manually:
# 1. Download IPA from EAS
# 2. Open Transporter app
# 3. Upload IPA
# 4. Submit in App Store Connect
```

### Step 6: App Store Review

Expected timeline: 1-3 days

Be prepared to answer:
- Privacy policy questions
- Data collection practices
- Account deletion process
- Payment integration details

---

## Android Deployment

### Prerequisites

- Google Play Developer Account ($25 one-time)
- Android keystore file
- Google Play Console access

### Step 1: Generate Android Keystore

```bash
# Generate keystore (one time only)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore rezapp-release.keystore \
  -alias rezapp-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# IMPORTANT: Store keystore password securely!
# If lost, you cannot update your app!
```

### Step 2: Configure Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details:
   - App name: Rez App
   - Package name: com.rezapp.android
   - Category: Shopping
4. Upload screenshots (required sizes)
5. Write app description
6. Set privacy policy URL
7. Complete content rating questionnaire
8. Set up pricing and distribution

### Step 3: Build for Android

```bash
# Build production Android app
eas build --platform android --profile production

# This will:
# 1. Upload code to EAS
# 2. Build AAB (Android App Bundle)
# 3. Sign with your keystore
# 4. Provide download link
```

### Step 4: Test Android Build

```bash
# Create internal testing track
# Upload AAB to Google Play Console
# Add internal testers
# Test thoroughly

# Or use EAS Submit:
eas submit --platform android --profile production --latest
```

### Step 5: Release to Production

1. Go to Google Play Console
2. Navigate to Production track
3. Create new release
4. Upload AAB
5. Write release notes
6. Review and rollout

Options:
- **Staged Rollout**: 5% → 10% → 20% → 50% → 100%
- **Full Rollout**: 100% immediately (risky)

**Recommended**: Start with 5% staged rollout

---

## Web Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure custom domain (optional)
vercel domains add app.rezapp.com
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
npm run build:web
netlify deploy --prod --dir=dist
```

### Option 3: AWS S3 + CloudFront

```bash
# Build for web
npm run build:web

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Web Configuration

Create `vercel.json` or `netlify.toml`:

**Vercel**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## Post-Deployment Verification

### 1. Smoke Tests (5-10 minutes)

Run these tests immediately after deployment:

```bash
# Test checklist
- [ ] App launches successfully
- [ ] Home screen loads
- [ ] User can sign in
- [ ] User can sign up
- [ ] Products load
- [ ] Search works
- [ ] Cart functions
- [ ] Checkout works (test mode)
- [ ] Profile loads
- [ ] Navigation works
- [ ] No crashes in 5 minutes
```

### 2. Monitor Error Rates

Check Sentry dashboard:
- Error rate should be < 0.1%
- No critical errors
- Performance metrics normal

### 3. Check Analytics

Verify events are being tracked:
- App opens
- Screen views
- User actions
- Conversion funnel

### 4. Monitor Performance

Check metrics:
- App startup time < 2s
- API response times < 500ms
- Memory usage < 150MB
- No memory leaks

### 5. User Feedback

Monitor:
- App Store reviews
- Google Play reviews
- Support tickets
- Social media mentions

---

## Rollback Procedures

### If Critical Issues Occur

#### iOS Rollback

1. **Option 1: Remove from Sale**
   - Go to App Store Connect
   - Remove app from sale
   - Fix issues
   - Resubmit

2. **Option 2: Expedited Review**
   - Request expedited review
   - Usually 1-2 hours
   - Use sparingly

#### Android Rollback

1. **Immediate Rollback**
   ```bash
   # In Google Play Console
   1. Go to Production track
   2. Click "Manage release"
   3. Click "Revert to previous version"
   4. Confirm rollback
   ```

2. **Staged Rollout Halt**
   ```bash
   # Halt rollout at current percentage
   1. Pause rollout
   2. Fix issues
   3. Resume or create new release
   ```

#### Web Rollback

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# AWS S3
aws s3 sync s3://your-bucket-name-backup/ s3://your-bucket-name/
```

### Rollback Decision Matrix

| Severity | Action | Timeline |
|----------|--------|----------|
| **Critical** (app crashes) | Immediate rollback | < 15 minutes |
| **High** (major feature broken) | Rollback within 1 hour | < 1 hour |
| **Medium** (minor bug) | Hotfix in next release | 1-2 days |
| **Low** (cosmetic issue) | Fix in regular release | Next sprint |

---

## Monitoring Setup

### 1. Error Tracking (Sentry)

```bash
# Already configured in code
# Verify in Sentry dashboard
# Set up alerts for:
- Error rate > 1%
- New error types
- Performance degradation
- Memory leaks
```

### 2. Analytics (Google Analytics / Mixpanel)

```bash
# Verify events:
- app_open
- screen_view
- user_signup
- user_login
- product_view
- add_to_cart
- purchase_complete
```

### 3. Performance Monitoring

```bash
# Monitor via:
- Firebase Performance
- New Relic (if configured)
- Custom metrics dashboard
```

### 4. User Feedback

Set up:
- In-app feedback form
- Email support
- Social media monitoring
- Review monitoring (App Annie)

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Issue**: EAS build fails
```bash
# Solution 1: Clear cache
eas build:clear-cache

# Solution 2: Check logs
eas build:list
eas build:view BUILD_ID

# Solution 3: Update dependencies
npm update
```

#### Code Signing Issues (iOS)

**Issue**: Provisioning profile invalid
```bash
# Solution:
1. Revoke certificates in Apple Developer
2. Delete local certificates
3. Let EAS auto-generate
4. Rebuild
```

#### Upload Issues

**Issue**: IPA/AAB upload fails
```bash
# Solution 1: Check file size
# Must be < 200MB for iOS, < 150MB for Android

# Solution 2: Check internet connection
# Upload can take 10-30 minutes

# Solution 3: Use alternate method
# Download and upload manually
```

#### Runtime Errors in Production

**Issue**: App works in dev but crashes in production

```bash
# Common causes:
1. Environment variables not set
2. API endpoints wrong
3. Missing native modules
4. Code obfuscation issues

# Debug:
1. Check Sentry logs
2. Test production build locally
3. Enable source maps
4. Review build configuration
```

---

## Emergency Contacts

### Support Escalation

- **Frontend Lead**: [Contact]
- **Backend Lead**: [Contact]
- **DevOps**: [Contact]
- **On-Call Engineer**: [Contact]

### External Support

- **Expo Support**: https://expo.dev/support
- **Apple Developer**: https://developer.apple.com/support
- **Google Play Support**: https://support.google.com/googleplay

---

## Deployment Commands Quick Reference

```bash
# Pre-deployment
npm test
npm run lint
npm run build

# iOS
eas build --platform ios --profile production
eas submit --platform ios

# Android
eas build --platform android --profile production
eas submit --platform android

# Web
npm run build:web
vercel --prod

# Post-deployment
npm run monitor
npm run analytics-check

# Rollback
vercel rollback
# OR manually in app stores
```

---

## Checklist Summary

Before going live:

- [ ] Backend issues resolved
- [ ] All tests passing
- [ ] Environment configured
- [ ] Assets prepared
- [ ] App store accounts ready
- [ ] Build configurations set
- [ ] Monitoring configured
- [ ] Support team briefed
- [ ] Rollback plan tested
- [ ] Legal review complete
- [ ] Privacy policy published
- [ ] Terms of service published

---

## Success Criteria

After deployment, monitor for 48 hours:

- ✅ Crash rate < 0.1%
- ✅ Error rate < 1%
- ✅ App store rating > 4.0
- ✅ User retention > 40% (Day 1)
- ✅ No critical bugs reported
- ✅ Performance metrics normal
- ✅ Support tickets manageable

If all criteria met → Deployment successful! 🎉

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-14
**Next Review**: After first production deployment

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

**END OF DEPLOYMENT GUIDE**
