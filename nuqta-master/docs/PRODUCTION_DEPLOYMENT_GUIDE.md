# REZ App - Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [iOS Deployment](#ios-deployment)
4. [Android Deployment](#android-deployment)
5. [Web Deployment](#web-deployment)
6. [Backend Deployment](#backend-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)

---

## Pre-Deployment Checklist

### Code Review Checklist
- [ ] All code reviewed and approved by senior developers
- [ ] No TODO/FIXME comments in production code
- [ ] All console.log statements removed or wrapped in dev checks
- [ ] Dead code removed
- [ ] Code formatting consistent (ESLint passing)
- [ ] TypeScript strict mode enabled with no errors
- [ ] All imports optimized (no unused imports)

### Security Audit Items
- [ ] API keys and secrets in environment variables only
- [ ] No hardcoded credentials in codebase
- [ ] JWT secret rotation plan in place
- [ ] HTTPS enforced for all API calls
- [ ] Input validation on all user inputs
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CORS properly configured
- [ ] Rate limiting enabled on all endpoints
- [ ] Authentication middleware tested
- [ ] File upload size limits enforced
- [ ] Sensitive data encrypted at rest
- [ ] Security headers configured (Helmet.js)

### Performance Benchmarks
- [ ] App bundle size < 50MB (iOS/Android)
- [ ] Initial load time < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] Image optimization completed
- [ ] Lazy loading implemented for heavy components
- [ ] Database queries optimized (indexed)
- [ ] Memory leaks tested and fixed
- [ ] Network requests minimized
- [ ] Cache strategies implemented

### Testing Completion Criteria
- [ ] Unit tests coverage > 80%
- [ ] Integration tests passing
- [ ] E2E tests for critical user flows
- [ ] Payment integration tested (test mode)
- [ ] Push notifications tested
- [ ] Offline mode tested
- [ ] Location services tested
- [ ] Camera/media upload tested
- [ ] Deep linking tested
- [ ] Socket connections tested
- [ ] Error handling tested
- [ ] Edge cases covered

### Documentation Review
- [ ] API documentation complete and accurate
- [ ] README.md updated
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Architecture diagrams current
- [ ] User documentation/help center ready
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App Store description ready
- [ ] Release notes prepared

### Legal Requirements
- [ ] Privacy policy compliant with GDPR/CCPA
- [ ] Terms of service reviewed by legal
- [ ] Data retention policy defined
- [ ] User data deletion process implemented
- [ ] Cookie consent implemented (web)
- [ ] Age verification (if required)
- [ ] Payment processor agreements signed
- [ ] Business licenses obtained
- [ ] Tax compliance verified
- [ ] Copyright/trademark clearance

---

## Environment Setup

### Production Environment Variables

Create `.env.production` file:

```bash
# ================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ================================================

# ================================================
# APPLICATION SETTINGS
# ================================================
EXPO_PUBLIC_APP_NAME=REZ
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=production

# ================================================
# BACKEND API CONFIGURATION
# ================================================
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_PROD_API_URL=https://api.rezapp.com/api

# ================================================
# AUTHENTICATION SETTINGS
# ================================================
EXPO_PUBLIC_JWT_STORAGE_KEY=rez_app_token
EXPO_PUBLIC_REFRESH_TOKEN_KEY=rez_app_refresh_token
EXPO_PUBLIC_USER_DATA_KEY=rez_app_user
EXPO_PUBLIC_SESSION_TIMEOUT=1440

# ================================================
# EXTERNAL SERVICES - PRODUCTION KEYS
# ================================================
# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_PRODUCTION_MAPS_KEY
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSy_YOUR_PRODUCTION_PLACES_KEY
EXPO_PUBLIC_OPENCAGE_API_KEY=YOUR_PRODUCTION_OPENCAGE_KEY

# Firebase Configuration (Production)
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_PRODUCTION_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=rezapp-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=rezapp-prod
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=rezapp-prod.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# ================================================
# PAYMENT CONFIGURATION - LIVE KEYS
# ================================================
# Stripe Live Keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_LIVE_KEY

# Razorpay Live Keys
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_RAZORPAY_LIVE_KEY

EXPO_PUBLIC_ENABLE_RAZORPAY=true
EXPO_PUBLIC_ENABLE_STRIPE=true
EXPO_PUBLIC_ENABLE_COD=true
EXPO_PUBLIC_COD_FEE=50
EXPO_PUBLIC_COD_MIN_ORDER=0
EXPO_PUBLIC_COD_MAX_ORDER=50000

# ================================================
# SOCIAL MEDIA & SHARING
# ================================================
EXPO_PUBLIC_DEEP_LINK_SCHEME=rezapp
EXPO_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/rez/id123456789
EXPO_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.rezapp.mobile
EXPO_PUBLIC_WEBSITE_URL=https://www.rezapp.com

# ================================================
# FEATURE FLAGS
# ================================================
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_CAMERA_FEATURES=true
EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD=true
EXPO_PUBLIC_ENABLE_SOCIAL_SHARING=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# ================================================
# ANALYTICS & MONITORING
# ================================================
EXPO_PUBLIC_GA_TRACKING_ID=UA-XXXXXXXXX-X
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
EXPO_PUBLIC_MIXPANEL_TOKEN=YOUR_PRODUCTION_MIXPANEL_TOKEN

# ================================================
# DEVELOPMENT SETTINGS (DISABLED IN PROD)
# ================================================
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_LOG_LEVEL=error
EXPO_PUBLIC_SHOW_DEV_TOOLS=false
```

### Backend Environment Variables

Create `user-backend/.env.production`:

```bash
# ================================================
# BACKEND PRODUCTION CONFIGURATION
# ================================================

# Environment
NODE_ENV=production
PORT=5001

# Database
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/rezapp-production?retryWrites=true&w=majority
MONGODB_URI_READ_REPLICA=mongodb+srv://USERNAME:PASSWORD@cluster-read.mongodb.net/rezapp-production

# Redis Cache
REDIS_URL=redis://username:password@redis-production.cloud.redislabs.com:6379
REDIS_CACHE_TTL=3600

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING_IN_PRODUCTION
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_SECURE_RANDOM_STRING
JWT_REFRESH_EXPIRES_IN=7d

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email Service (SendGrid/AWS SES)
SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXXXXXXXX
EMAIL_FROM=noreply@rezapp.com

# Firebase Admin SDK
FIREBASE_PROJECT_ID=rezapp-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@rezapp-prod.iam.gserviceaccount.com

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_SERVER_SIDE_KEY

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://rezapp.com,https://www.rezapp.com,https://admin.rezapp.com

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID

# WebSocket
SOCKET_CORS_ORIGIN=https://rezapp.com,https://www.rezapp.com

# Session
SESSION_SECRET=ANOTHER_SECURE_RANDOM_STRING

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,mp4,mov

# Backup
BACKUP_S3_BUCKET=rezapp-production-backups
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_REGION=us-east-1
```

### Server Requirements

#### Minimum Requirements
```yaml
Application Servers (2+ instances for HA):
  CPU: 4 vCPUs
  RAM: 8 GB
  Storage: 50 GB SSD
  OS: Ubuntu 22.04 LTS

Database Server (MongoDB):
  CPU: 8 vCPUs
  RAM: 16 GB
  Storage: 500 GB SSD (auto-scaling)

Redis Cache:
  CPU: 2 vCPUs
  RAM: 4 GB
  Storage: 20 GB SSD

Load Balancer:
  Type: AWS Application Load Balancer / NGINX
  SSL Certificate: Let's Encrypt or AWS Certificate Manager
```

#### Recommended Production Setup
```yaml
Application Servers:
  Type: AWS EC2 t3.xlarge or equivalent
  Count: 3 instances (auto-scaling 2-10)

Database:
  Type: MongoDB Atlas M30 or higher
  Replica Set: 3 nodes
  Backups: Automated daily snapshots

Redis:
  Type: AWS ElastiCache Redis
  Node Type: cache.r6g.large
  Multi-AZ: Enabled

CDN:
  Provider: AWS CloudFront / Cloudflare
  Regions: Global
```

### Database Setup

#### MongoDB Atlas Production Setup

```bash
# 1. Create MongoDB Atlas Cluster
# - Go to https://cloud.mongodb.com
# - Create M30+ cluster
# - Enable backup
# - Configure IP whitelist for application servers

# 2. Create Database and Collections
mongo "mongodb+srv://cluster.mongodb.net/rezapp-production" --username admin

use rezapp-production

# Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "phone", "role"],
      properties: {
        email: { bsonType: "string" },
        phone: { bsonType: "string" },
        role: { enum: ["user", "merchant", "admin"] }
      }
    }
  }
})

# 3. Create Indexes for Performance
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phone: 1 }, { unique: true })
db.products.createIndex({ name: "text", description: "text" })
db.products.createIndex({ category: 1, price: 1 })
db.products.createIndex({ merchant: 1, isActive: 1 })
db.orders.createIndex({ user: 1, createdAt: -1 })
db.orders.createIndex({ status: 1, createdAt: -1 })
db.cart.createIndex({ userId: 1 })
db.reviews.createIndex({ product: 1, rating: -1 })

# 4. Setup Read Replicas
# Configure in MongoDB Atlas UI:
# - Enable multi-region clusters
# - Add read preference tags
```

### Redis/Cache Setup

```bash
# AWS ElastiCache Redis Setup

# 1. Create Redis Cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id rezapp-prod-cache \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --preferred-availability-zone us-east-1a

# 2. Configure Cache Keys (in application)
# - Session data: session:{userId}
# - API responses: api:{endpoint}:{params}
# - User profiles: user:{userId}
# - Product catalog: products:{category}:{page}

# 3. Set TTL Policies
# Short-lived (5 minutes): API responses
# Medium-lived (1 hour): Product listings
# Long-lived (24 hours): Static content
```

### CDN Configuration

#### Cloudflare Setup

```bash
# 1. Add Domain to Cloudflare
# - Transfer nameservers to Cloudflare
# - Enable HTTPS/SSL (Full mode)

# 2. Configure Caching Rules
# Cache static assets:
- *.js: 1 year
- *.css: 1 year
- *.jpg, *.png, *.webp: 1 month
- API responses: No cache (use Redis instead)

# 3. Page Rules
# https://api.rezapp.com/*
# - Cache Level: Bypass
# - Security Level: Medium
# - SSL: Full (strict)

# https://rezapp.com/*
# - Cache Level: Standard
# - Browser Cache TTL: 4 hours
# - Always Online: On

# 4. Firewall Rules
# Block common attack patterns
# Rate limiting: 100 requests/minute per IP
```

### Load Balancer Setup

#### AWS Application Load Balancer

```bash
# 1. Create Target Group
aws elbv2 create-target-group \
  --name rezapp-api-targets \
  --protocol HTTP \
  --port 5001 \
  --vpc-id vpc-XXXXXXXX \
  --health-check-path /api/health \
  --health-check-interval-seconds 30

# 2. Create Load Balancer
aws elbv2 create-load-balancer \
  --name rezapp-prod-alb \
  --subnets subnet-XXXXXXXX subnet-YYYYYYYY \
  --security-groups sg-XXXXXXXX

# 3. Create Listener with SSL
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:XXXX \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:XXXX \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:XXXX

# 4. Register Targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:XXXX \
  --targets Id=i-XXXXXXXX Id=i-YYYYYYYY
```

---

## iOS Deployment

### Apple Developer Account Setup

```bash
# Prerequisites:
# 1. Apple Developer Program membership ($99/year)
#    https://developer.apple.com/programs/enroll/
# 2. Mac computer with latest Xcode installed
# 3. Valid payment method on file
```

### App Store Connect Configuration

#### Step 1: Create App Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" > "+" > "New App"
3. Fill in details:
   - Platform: iOS
   - Name: REZ
   - Primary Language: English (US)
   - Bundle ID: com.rezapp.mobile
   - SKU: REZ-APP-001

#### Step 2: App Information

```yaml
App Information:
  Category: Shopping
  Subcategory: Lifestyle
  Content Rights: No (unless you have them)

Age Rating:
  - Unrestricted Web Access: No
  - Gambling: No
  - Mature/Suggestive Themes: No
  - Age: 4+

Privacy Policy URL: https://www.rezapp.com/privacy
Terms of Service URL: https://www.rezapp.com/terms
Support URL: https://help.rezapp.com
Marketing URL: https://www.rezapp.com
```

#### Step 3: Prepare Screenshots & Assets

```bash
# Required Screenshot Sizes:
# - 6.7" (iPhone 14 Pro Max): 1290 x 2796 px
# - 6.5" (iPhone 11 Pro Max): 1242 x 2688 px
# - 5.5" (iPhone 8 Plus): 1242 x 2208 px

# App Icon: 1024 x 1024 px (no alpha channel)

# Create screenshots directory
mkdir -p ios-screenshots/{6.7,6.5,5.5}

# Use simulator or device to capture
xcrun simctl io booted screenshot screenshot.png

# Tips:
# - Minimum 3 screenshots per size
# - Maximum 10 screenshots
# - Show key features
# - Use localized text
```

### Certificates and Provisioning Profiles

#### Step 1: Create Certificates

```bash
# 1. Open Xcode
# 2. Preferences > Accounts > Manage Certificates
# 3. Create "Apple Distribution" certificate

# Or use command line:
# Generate Certificate Signing Request
openssl req -new -key rezapp.key -out rezapp.csr

# Upload CSR to Apple Developer Portal:
# - Certificates > Production > App Store and Ad Hoc
# - Upload rezapp.csr
# - Download certificate
```

#### Step 2: Create App ID

```bash
# 1. Go to developer.apple.com > Identifiers
# 2. Register new App ID
#    - Description: REZ App
#    - Bundle ID: com.rezapp.mobile (Explicit)
#    - Capabilities:
#      ✓ Push Notifications
#      ✓ In-App Purchase (if needed)
#      ✓ Associated Domains
#      ✓ Sign In with Apple (if needed)
```

#### Step 3: Create Provisioning Profile

```bash
# 1. Profiles > Production > App Store
# 2. Select App ID: com.rezapp.mobile
# 3. Select Distribution Certificate
# 4. Download and install profile

# Install profile
open ~/Downloads/REZ_App_Store_Profile.mobileprovision
```

### Build Configuration for Production

#### Update `app.json` for Production

```json
{
  "expo": {
    "name": "REZ",
    "slug": "rez-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "rezapp",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.rezapp.mobile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "REZ needs camera access to scan bills and upload product photos",
        "NSPhotoLibraryUsageDescription": "REZ needs photo library access to upload images",
        "NSLocationWhenInUseUsageDescription": "REZ uses your location to show nearby stores",
        "NSLocationAlwaysUsageDescription": "REZ uses your location to provide store recommendations",
        "NSUserTrackingUsageDescription": "This allows us to provide personalized offers"
      },
      "associatedDomains": [
        "applinks:rezapp.com",
        "applinks:www.rezapp.com"
      ],
      "config": {
        "googleMapsApiKey": "AIzaSy_YOUR_IOS_KEY"
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

#### Create EAS Build Configuration

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
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true,
        "resourceClass": "large"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your.email@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### Building the iOS App

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for production
eas build --platform ios --profile production

# The build will run on Expo's servers
# Download the .ipa file when complete
```

### TestFlight Setup

```bash
# 1. Upload build to App Store Connect
eas submit --platform ios --latest

# 2. Configure TestFlight
# - Go to App Store Connect > TestFlight
# - Add Internal Testers (your team)
# - Add External Testers (beta users)
# - Create testing groups
# - Set up test information

# 3. Beta Testing Process
# - Invite testers via email
# - Collect feedback
# - Monitor crash reports
# - Iterate based on feedback
```

### App Store Submission Checklist

```yaml
Pre-Submission:
  - [ ] All functionality tested on real devices
  - [ ] No test/debug code in production build
  - [ ] Privacy policy URL accessible
  - [ ] Support URL accessible
  - [ ] App description written (4000 char limit)
  - [ ] Keywords optimized (100 char limit)
  - [ ] Screenshots prepared (all sizes)
  - [ ] App preview video (optional, recommended)
  - [ ] Promotional text written
  - [ ] Version release notes written

Submission:
  - [ ] Select build from TestFlight
  - [ ] Add version information
  - [ ] Set pricing (Free)
  - [ ] Select availability (all territories or specific)
  - [ ] Add age rating
  - [ ] Set release options (manual/automatic)
  - [ ] Submit for review

Post-Submission:
  - [ ] Monitor review status
  - [ ] Respond to review questions within 48 hours
  - [ ] Prepare for potential rejection
  - [ ] Have hotfix process ready
```

### Review Guidelines Compliance

Key points from Apple's Review Guidelines:

```yaml
Safety:
  - No objectionable content
  - User-generated content moderated
  - Reporting mechanism in place

Performance:
  - No placeholder content
  - App fully functional
  - No hidden features
  - Accurate metadata

Business:
  - In-app purchases use Apple's system (if applicable)
  - No external payment mechanisms (for digital goods)
  - Subscription terms clear
  - No misleading pricing

Design:
  - iOS Human Interface Guidelines followed
  - Works on all supported devices
  - Proper use of system features
  - No resemblance to built-in apps

Legal:
  - Privacy policy compliant
  - Data collection disclosed
  - Age-appropriate content
  - Proper licensing
```

---

## Android Deployment

### Google Play Console Setup

```bash
# Prerequisites:
# 1. Google Play Developer account ($25 one-time fee)
#    https://play.google.com/console/signup
# 2. Payment profile set up
# 3. Tax information submitted
```

#### Step 1: Create Application

1. Go to [Google Play Console](https://play.google.com/console)
2. Create Application
   - App name: REZ
   - Default language: English (United States)
   - App/Game: App
   - Free/Paid: Free

#### Step 2: Store Listing

```yaml
App Details:
  App name: REZ
  Short description: (80 chars)
    "Shop local, earn rewards, discover amazing deals near you"

  Full description: (4000 chars)
    "REZ is your ultimate shopping companion...

    Features:
    • Discover local stores and products
    • Earn cashback and rewards
    • Upload bills for instant cashback
    • Track your orders in real-time
    • Share deals with friends
    • Exclusive member benefits

    Download REZ today and start saving!"

Graphics:
  App icon: 512 x 512 px (PNG, 32-bit)
  Feature graphic: 1024 x 500 px
  Phone screenshots: At least 2 (up to 8)
    - 16:9 or 9:16 aspect ratio
    - Min: 320px
    - Max: 3840px
  7-inch tablet screenshots: Optional
  10-inch tablet screenshots: Optional

Categorization:
  App category: Shopping
  Tags: shopping, cashback, rewards, local stores

Contact Details:
  Email: support@rezapp.com
  Phone: +91-1234567890 (optional)
  Website: https://www.rezapp.com

Privacy Policy:
  URL: https://www.rezapp.com/privacy
```

### Signing Configuration

#### Step 1: Generate Upload Key

```bash
# Generate keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore rezapp-upload-key.keystore \
  -alias rezapp-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Enter password and details:
# - Password: [SECURE_PASSWORD]
# - First and Last Name: REZ App
# - Organizational Unit: Mobile Development
# - Organization: REZ Technologies
# - City: Bangalore
# - State: Karnataka
# - Country Code: IN

# Verify keystore
keytool -list -v -keystore rezapp-upload-key.keystore

# IMPORTANT: Backup this keystore securely!
# Store password in password manager
# Keep multiple encrypted backups
```

#### Step 2: Configure Gradle

Create `android/gradle.properties`:

```properties
REZAPP_UPLOAD_STORE_FILE=rezapp-upload-key.keystore
REZAPP_UPLOAD_KEY_ALIAS=rezapp-upload
REZAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
REZAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

Update `android/app/build.gradle`:

```gradle
android {
    ...

    defaultConfig {
        applicationId "com.rezapp.mobile"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            if (project.hasProperty('REZAPP_UPLOAD_STORE_FILE')) {
                storeFile file(REZAPP_UPLOAD_STORE_FILE)
                storePassword REZAPP_UPLOAD_STORE_PASSWORD
                keyAlias REZAPP_UPLOAD_KEY_ALIAS
                keyPassword REZAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Variants (Production)

Update `eas.json` for Android:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    },
    "production-aab": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  }
}
```

### ProGuard/R8 Configuration

Create `android/app/proguard-rules.pro`:

```proguard
# Add project specific ProGuard rules here

# Keep all models
-keep class com.rezapp.mobile.models.** { *; }

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }

# Payment SDKs
-keep class com.razorpay.** { *; }
-keep class com.stripe.** { *; }

# Socket.io
-keep class io.socket.** { *; }

# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

### Building the Android App

```bash
# Build AAB (Android App Bundle) for Play Store
eas build --platform android --profile production-aab

# Build APK for testing
eas build --platform android --profile production

# Download and test the APK locally
adb install rezapp.apk
```

### Play Store Listing

#### Content Rating

```bash
# Complete content rating questionnaire
# 1. Go to Play Console > Content rating
# 2. Enter your email
# 3. Select category: Shopping
# 4. Answer questions:
#    - Violence: No
#    - Sexual content: No
#    - Profanity: No
#    - Controlled substances: No
#    - User interaction: Yes
#    - User-generated content: Yes
#    - Share location: Yes
#    - Personal info shared: Yes

# Result: Rated E (Everyone) / PEGI 3 / USK 0
```

#### App Access

```yaml
All or Some Functionality:
  - Select: "All functionality is available without restrictions"

Special Access (if applicable):
  - Notification listener: No
  - VPN service: No
  - Accessibility service: No
  - Device admin: No
```

#### Data Safety

```yaml
Data Collection:
  Location:
    - Collected: Yes
    - Shared: No
    - Optional: Yes
    - Purpose: App functionality

  Personal Info:
    - Email: Collected, not shared
    - Name: Collected, not shared
    - Phone: Collected, not shared
    - Purpose: Account creation

  Financial Info:
    - Payment info: Collected, shared with payment processors
    - Purchase history: Collected, not shared
    - Purpose: Payment processing

  Photos/Videos:
    - Collected: Yes (optional)
    - Purpose: Bill upload, product photos

  Files:
    - Collected: Yes (optional)
    - Purpose: Bill upload

Data Security:
  - Data encrypted in transit: Yes
  - Users can request deletion: Yes
  - Committed to Google Play Families Policy: No
  - Independent security review: No
```

### Review Process

```yaml
Pre-launch Checklist:
  - [ ] App complies with Google Play policies
  - [ ] No copyright violations
  - [ ] No deceptive behavior
  - [ ] User data handling disclosed
  - [ ] Functionality fully working
  - [ ] No crashes on test devices

Submission:
  - [ ] Upload AAB to Production track
  - [ ] Add release notes
  - [ ] Set rollout percentage (start with 10%)
  - [ ] Review and publish

Review Timeline:
  - Initial review: Usually within 1-3 days
  - Updates: Usually within hours
  - Can expedite for critical bug fixes

Post-Publishing:
  - [ ] Monitor crash reports
  - [ ] Check user reviews
  - [ ] Respond to user feedback
  - [ ] Track download statistics
```

### Staged Rollout Strategy

```bash
# Day 1: 10% rollout
# - Monitor crashes and ANRs
# - Check user ratings
# - Review analytics

# Day 3: 25% rollout (if stable)
# - Continue monitoring
# - Address any issues

# Day 5: 50% rollout
# - Performance verification
# - Server load monitoring

# Day 7: 100% rollout
# - Full availability
# - Continue monitoring
```

---

## Web Deployment

### Build Optimization

#### Configure for Production

Update `app.json`:

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png",
      "build": {
        "babel": {
          "include": ["@stripe/stripe-react-native"]
        }
      },
      "config": {
        "firebase": {
          "apiKey": "YOUR_API_KEY",
          "authDomain": "rezapp-prod.firebaseapp.com",
          "projectId": "rezapp-prod"
        }
      }
    }
  }
}
```

#### Build the Web App

```bash
# Install dependencies
npm install

# Build for production
npx expo export --platform web

# Output will be in dist/ directory
# This creates optimized static files
```

#### Optimize Build

```bash
# Analyze bundle size
npx expo export --platform web --dump-sourcemap

# Optimize images
npm install -g sharp-cli
sharp-cli --input assets/images --output assets/optimized --webp

# Enable gzip compression (configure in hosting)
# Enable Brotli compression for better compression
```

### Hosting Options

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure vercel.json
```

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://api.rezapp.com/api",
    "EXPO_PUBLIC_ENVIRONMENT": "production"
  }
}
```

#### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

Create `netlify.toml`:

```toml
[build]
  command = "npx expo export --platform web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/static/*"
  [headers.values]
    cache-control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### Option 3: AWS S3 + CloudFront

```bash
# Build app
npx expo export --platform web

# Create S3 bucket
aws s3 mb s3://rezapp-web-prod

# Configure bucket for static website hosting
aws s3 website s3://rezapp-web-prod \
  --index-document index.html \
  --error-document index.html

# Upload files
aws s3 sync dist/ s3://rezapp-web-prod --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name rezapp-web-prod.s3.amazonaws.com \
  --default-root-object index.html

# Invalidate CloudFront cache after deployment
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Domain and SSL Setup

#### Configure Custom Domain

```bash
# Vercel
vercel domains add rezapp.com
vercel domains add www.rezapp.com

# Netlify
netlify domains:add rezapp.com

# AWS Route 53
aws route53 create-hosted-zone --name rezapp.com
# Update nameservers at domain registrar
# Create A record pointing to CloudFront
```

#### SSL Certificate

```bash
# Vercel/Netlify: Automatic Let's Encrypt

# AWS ACM
aws acm request-certificate \
  --domain-name rezapp.com \
  --subject-alternative-names www.rezapp.com \
  --validation-method DNS

# Verify domain ownership via DNS
# Certificate will be automatically renewed
```

### SEO Configuration

Create `public/robots.txt`:

```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://www.rezapp.com/sitemap.xml
```

Create `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.rezapp.com/</loc>
    <lastmod>2025-10-27</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.rezapp.com/stores</loc>
    <lastmod>2025-10-27</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.rezapp.com/products</loc>
    <lastmod>2025-10-27</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

Update `app/_layout.tsx` for SEO:

```tsx
import { Head } from 'expo-router';

export default function RootLayout() {
  return (
    <>
      <Head>
        <title>REZ - Shop Local, Earn Rewards</title>
        <meta name="description" content="Discover local stores, earn cashback, and get exclusive deals with REZ" />
        <meta name="keywords" content="shopping, cashback, rewards, local stores, deals" />
        <meta property="og:title" content="REZ - Shop Local, Earn Rewards" />
        <meta property="og:description" content="Discover local stores, earn cashback, and get exclusive deals" />
        <meta property="og:image" content="https://www.rezapp.com/og-image.jpg" />
        <meta property="og:url" content="https://www.rezapp.com" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://www.rezapp.com" />
      </Head>
      {/* ... */}
    </>
  );
}
```

### PWA Configuration

Create `public/manifest.json`:

```json
{
  "name": "REZ - Shop Local, Earn Rewards",
  "short_name": "REZ",
  "description": "Discover local stores, earn cashback, and get exclusive deals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FF6B35",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Register service worker in `app/_layout.tsx`:

```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => console.log('SW registered'))
      .catch(error => console.log('SW registration failed'));
  }
}, []);
```

### Browser Compatibility

```yaml
Supported Browsers:
  - Chrome: Last 2 versions
  - Firefox: Last 2 versions
  - Safari: Last 2 versions
  - Edge: Last 2 versions
  - Mobile Safari: iOS 12+
  - Chrome Mobile: Android 5+

Polyfills Required:
  - Promise
  - Fetch API
  - IntersectionObserver
  - ResizeObserver

Testing:
  - BrowserStack for cross-browser testing
  - Test on real devices
  - Check responsive design
```

---

## Backend Deployment

### Server Setup (AWS EC2)

#### Step 1: Launch EC2 Instance

```bash
# Create security group
aws ec2 create-security-group \
  --group-name rezapp-api-sg \
  --description "Security group for REZ API servers"

# Allow inbound traffic
aws ec2 authorize-security-group-ingress \
  --group-name rezapp-api-sg \
  --protocol tcp --port 22 --cidr 0.0.0.0/0  # SSH
aws ec2 authorize-security-group-ingress \
  --group-name rezapp-api-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0  # HTTP
aws ec2 authorize-security-group-ingress \
  --group-name rezapp-api-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0  # HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name rezapp-api-sg \
  --protocol tcp --port 5001 --cidr 0.0.0.0/0  # API

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Ubuntu 22.04
  --instance-type t3.xlarge \
  --key-name rezapp-prod-key \
  --security-group-ids sg-XXXXXXXX \
  --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=50}
```

#### Step 2: Configure Server

```bash
# SSH into server
ssh -i rezapp-prod-key.pem ubuntu@ec2-XX-XX-XX-XX.compute-1.amazonaws.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install NGINX
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Create application user
sudo useradd -m -s /bin/bash rezapp
sudo usermod -aG sudo rezapp
```

### Docker Containerization

#### Create `Dockerfile`

```dockerfile
# Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

Create `.dockerignore`:

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
dist
coverage
```

#### Build and Run Docker Container

```bash
# Build image
docker build -t rezapp-api:1.0.0 .

# Tag for registry
docker tag rezapp-api:1.0.0 YOUR_REGISTRY/rezapp-api:1.0.0

# Push to registry
docker push YOUR_REGISTRY/rezapp-api:1.0.0

# Run container
docker run -d \
  --name rezapp-api \
  -p 5001:5001 \
  --env-file .env.production \
  --restart unless-stopped \
  YOUR_REGISTRY/rezapp-api:1.0.0
```

#### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    image: rezapp-api:1.0.0
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  redis-data:
```

### Kubernetes Orchestration (Optional)

#### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rezapp-api
  labels:
    app: rezapp-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rezapp-api
  template:
    metadata:
      labels:
        app: rezapp-api
    spec:
      containers:
      - name: api
        image: YOUR_REGISTRY/rezapp-api:1.0.0
        ports:
        - containerPort: 5001
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: rezapp-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rezapp-api-service
spec:
  selector:
    app: rezapp-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5001
  type: LoadBalancer
```

#### Apply Kubernetes Configuration

```bash
# Create secrets
kubectl create secret generic rezapp-secrets \
  --from-env-file=.env.production

# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods
kubectl get services

# Scale deployment
kubectl scale deployment rezapp-api --replicas=5

# Rolling update
kubectl set image deployment/rezapp-api api=YOUR_REGISTRY/rezapp-api:1.1.0
```

### Database Migrations

Create migration script `scripts/migrate-production.ts`:

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

async function runMigrations() {
  try {
    console.log('Connecting to production database...');
    await mongoose.connect(process.env.MONGODB_URI!);

    console.log('Running migrations...');

    // Add indexes
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('products').createIndex({ name: 'text', description: 'text' });

    // Update schema versions
    await mongoose.connection.db.collection('_migrations').insertOne({
      version: '1.0.0',
      appliedAt: new Date(),
      description: 'Initial production deployment'
    });

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigrations();
```

Run migrations:

```bash
# Backup database first!
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Run migrations
ts-node scripts/migrate-production.ts

# Verify
mongo "mongodb+srv://..." --eval "db._migrations.find()"
```

### API Gateway Configuration

#### NGINX Configuration

Create `nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Upstream backend servers
    upstream api_backend {
        least_conn;
        server 127.0.0.1:5001 max_fails=3 fail_timeout=30s;
        server 127.0.0.1:5002 max_fails=3 fail_timeout=30s backup;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.rezapp.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name api.rezapp.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/rezapp.crt;
        ssl_certificate_key /etc/nginx/ssl/rezapp.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=auth_limit burst=5 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Health check endpoint (no rate limiting)
        location /api/health {
            proxy_pass http://api_backend;
            access_log off;
        }
    }
}
```

### Monitoring and Logging

#### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'rezapp-api',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

Start with PM2:

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs rezapp-api

# Restart
pm2 restart rezapp-api

# Reload (zero-downtime)
pm2 reload rezapp-api
```

#### Configure Application Logging

Install Winston:

```bash
npm install winston winston-daily-rotate-file
```

Create `src/config/logger.ts`:

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'rezapp-api' },
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### Backup Strategies

#### Automated MongoDB Backups

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups/mongodb"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net"
S3_BUCKET="s3://rezapp-production-backups/mongodb"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup database
echo "Starting MongoDB backup..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}/backup_${DATE}"

# Compress backup
echo "Compressing backup..."
tar -czf "${BACKUP_DIR}/backup_${DATE}.tar.gz" -C "${BACKUP_DIR}" "backup_${DATE}"
rm -rf "${BACKUP_DIR}/backup_${DATE}"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${BACKUP_DIR}/backup_${DATE}.tar.gz" "${S3_BUCKET}/"

# Delete local backup
rm "${BACKUP_DIR}/backup_${DATE}.tar.gz"

# Delete old backups from S3
echo "Cleaning old backups..."
aws s3 ls "${S3_BUCKET}/" | while read -r line; do
  createDate=$(echo $line | awk {'print $1" "$2'})
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "-${RETENTION_DAYS} days" +%s)

  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk {'print $4'})
    if [[ $fileName != "" ]]; then
      aws s3 rm "${S3_BUCKET}/${fileName}"
    fi
  fi
done

echo "Backup completed successfully!"
```

Schedule with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## CI/CD Pipeline

### GitHub Actions Setup

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Production Deployment

on:
  push:
    branches:
      - main
    tags:
      - 'v*'

env:
  NODE_VERSION: '20.x'

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run linter
        run: |
          cd frontend
          npm run lint

      - name: Run tests
        run: |
          cd frontend
          npm test

      - name: Check bundle size
        run: |
          cd frontend
          npm run build
          # Add bundle size check script

  build-backend:
    name: Build and Deploy Backend
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: rezapp-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd user-backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /app/rezapp-backend
            docker pull ${{ steps.login-ecr.outputs.registry }}/rezapp-api:latest
            docker-compose down
            docker-compose up -d
            docker system prune -f

  build-ios:
    name: Build iOS App
    needs: test
    runs-on: macos-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Build iOS
        run: |
          cd frontend
          eas build --platform ios --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to App Store
        if: startsWith(github.ref, 'refs/tags/v')
        run: |
          cd frontend
          eas submit --platform ios --latest --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}

  build-android:
    name: Build Android App
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Build Android
        run: |
          cd frontend
          eas build --platform android --profile production-aab --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to Play Store
        if: startsWith(github.ref, 'refs/tags/v')
        run: |
          cd frontend
          eas submit --platform android --latest --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  deploy-web:
    name: Deploy Web App
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Build web app
        run: |
          cd frontend
          npx expo export --platform web
        env:
          EXPO_PUBLIC_ENVIRONMENT: production
          EXPO_PUBLIC_API_BASE_URL: https://api.rezapp.com/api

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: frontend

  notify:
    name: Notify Team
    needs: [build-backend, build-ios, build-android, deploy-web]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Automated Testing

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  pull_request:
    branches:
      - main
      - develop
  push:
    branches:
      - main
      - develop

jobs:
  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run unit tests
        run: |
          cd frontend
          npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./frontend/coverage

  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: |
          cd user-backend
          npm ci

      - name: Run tests
        run: |
          cd user-backend
          npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/rezapp-test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
```

### Rollback Procedures

Create rollback script `scripts/rollback.sh`:

```bash
#!/bin/bash

# Rollback to previous version

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  echo "Example: ./rollback.sh v1.0.0"
  exit 1
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# Backend rollback
echo "Rolling back backend..."
ssh production-server << EOF
  cd /app/rezapp-backend
  docker-compose down
  docker pull rezapp-api:$PREVIOUS_VERSION
  docker tag rezapp-api:$PREVIOUS_VERSION rezapp-api:latest
  docker-compose up -d
  docker system prune -f
EOF

# Verify health
echo "Checking backend health..."
curl -f https://api.rezapp.com/api/health || {
  echo "Backend health check failed!"
  exit 1
}

echo "Rollback completed successfully!"
```

### GitHub Secrets Configuration

Required secrets in GitHub repository settings:

```yaml
AWS Credentials:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - ECR_REGISTRY

Server Access:
  - EC2_HOST
  - EC2_USERNAME
  - EC2_SSH_KEY

Expo/EAS:
  - EXPO_TOKEN
  - EXPO_APPLE_ID
  - EXPO_APPLE_PASSWORD
  - EAS_PROJECT_ID

Deployment:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID

Notifications:
  - SLACK_WEBHOOK
  - DISCORD_WEBHOOK

Environment Variables:
  - PRODUCTION_ENV_FILE (base64 encoded .env.production)
```

---

## Post-Deployment Verification

### Health Check Script

Create `scripts/verify-deployment.sh`:

```bash
#!/bin/bash

echo "Verifying production deployment..."

# Backend health check
echo "Checking backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.rezapp.com/api/health)
if [ "$BACKEND_STATUS" -eq 200 ]; then
  echo "✓ Backend is healthy"
else
  echo "✗ Backend health check failed (Status: $BACKEND_STATUS)"
  exit 1
fi

# Web app check
echo "Checking web app..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.rezapp.com)
if [ "$WEB_STATUS" -eq 200 ]; then
  echo "✓ Web app is accessible"
else
  echo "✗ Web app check failed (Status: $WEB_STATUS)"
  exit 1
fi

# Database connection
echo "Checking database..."
# Add database connection test

# Redis connection
echo "Checking Redis..."
# Add Redis connection test

# SSL certificate
echo "Checking SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername api.rezapp.com -connect api.rezapp.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
echo "SSL certificate expires: $SSL_EXPIRY"

echo "All checks passed! ✓"
```

---

## Emergency Contacts

```yaml
On-Call Schedule:
  - Primary: DevOps Lead
  - Secondary: Backend Lead
  - Tertiary: CTO

Escalation Path:
  1. On-call engineer (15 min response)
  2. Team lead (30 min response)
  3. Engineering manager (1 hour response)
  4. CTO (immediate for critical issues)

Critical Services:
  - AWS Support: Enterprise plan
  - MongoDB Atlas: Premium support
  - Expo Support: Priority support
  - Stripe Support: 24/7 support
  - Razorpay Support: Priority support

Monitoring Alerts:
  - PagerDuty integration
  - Slack #production-alerts
  - SMS for critical alerts
  - Email for warning alerts
```

---

## Deployment Timeline

Recommended deployment schedule:

```yaml
Week -4:
  - Code freeze
  - Final testing
  - Security audit
  - Performance testing

Week -3:
  - Beta testing (TestFlight/Play Store)
  - Bug fixes
  - Documentation review

Week -2:
  - Production environment setup
  - Final security review
  - Backup procedures tested

Week -1:
  - App Store/Play Store submission
  - Marketing materials ready
  - Support team training

Week 0 (Launch):
  - Monitor submissions
  - Prepare for launch
  - Final go/no-go decision

Post-Launch:
  - 24/7 monitoring first week
  - Daily status meetings
  - Quick response to issues
```

---

This comprehensive deployment guide should enable your DevOps team to successfully deploy the REZ app across all platforms. Remember to customize environment variables, API keys, and server configurations according to your specific requirements.
