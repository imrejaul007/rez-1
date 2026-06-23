# PRE-DEPLOYMENT CHECKLIST

> **Critical Document**: Complete ALL items before deploying to staging or production
>
> **Last Updated**: 2025-11-15
>
> **Deployment Phase**: Pre-Production Verification

---

## Table of Contents

1. [Backend Readiness Verification](#1-backend-readiness-verification)
2. [Frontend Build Verification](#2-frontend-build-verification)
3. [Environment Variables Check](#3-environment-variables-check)
4. [API Endpoint Verification](#4-api-endpoint-verification)
5. [Database Migration Check](#5-database-migration-check)
6. [Third-Party Services Check](#6-third-party-services-check)
7. [Security Audit Items](#7-security-audit-items)
8. [Performance Benchmarks](#8-performance-benchmarks)
9. [Testing Completion](#9-testing-completion)
10. [Documentation Review](#10-documentation-review)

---

## 1. Backend Readiness Verification

### 1.1 Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint checks passing (0 errors)
- [ ] No `console.log` statements in production code
- [ ] All `TODO`/`FIXME` comments addressed
- [ ] Dead code removed
- [ ] Code formatting consistent
- [ ] All imports optimized (no unused)

**Verification Command:**
```bash
cd user-backend
npm run lint
npm run build
```

### 1.2 Database Setup
- [ ] MongoDB connection string configured for production
- [ ] Database indexes created
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Connection pooling configured
- [ ] Query performance optimized

**Verification Commands:**
```bash
npm run test:db-connection
npm run verify:indexes
```

### 1.3 API Health
- [ ] All API endpoints returning correct status codes
- [ ] Error handling implemented for all routes
- [ ] Request validation working (express-validator)
- [ ] Response formatting consistent
- [ ] CORS configuration correct
- [ ] Rate limiting configured

**Verification:**
```bash
npm run test:api-health
curl http://localhost:5001/api/health
```

### 1.4 Authentication & Security
- [ ] JWT token generation/validation working
- [ ] Password hashing implemented (bcryptjs)
- [ ] Token refresh mechanism working
- [ ] Session management tested
- [ ] Authentication middleware on protected routes
- [ ] Password reset flow working

**Test Commands:**
```bash
npm run test:auth
```

### 1.5 Dependencies & Versions
- [ ] All npm packages up to date (security patches)
- [ ] No critical vulnerabilities in dependencies
- [ ] Package-lock.json committed
- [ ] Node version specified in package.json

**Verification:**
```bash
npm audit
npm outdated
```

---

## 2. Frontend Build Verification

### 2.1 Build Success
- [ ] Production build completes without errors
- [ ] No TypeScript compilation errors
- [ ] All assets bundled correctly
- [ ] Source maps generated (for debugging)
- [ ] Bundle size optimized

**Build Commands:**
```bash
cd frontend
npm run build
```

**For Expo/React Native:**
```bash
npx expo build:ios --release-channel production
npx expo build:android --release-channel production
npx expo build:web
```

### 2.2 Asset Optimization
- [ ] All images optimized (compressed)
- [ ] Videos compressed to appropriate sizes
- [ ] Fonts subset and optimized
- [ ] Icon assets generated for all platforms
- [ ] Splash screens created for all sizes
- [ ] App icons created for iOS/Android

**Asset Checklist:**
```
frontend/assets/images/
├── icon.png (1024x1024)
├── adaptive-icon.png (Android)
├── splash-icon.png
└── favicon.png (Web)
```

### 2.3 Code Splitting & Lazy Loading
- [ ] Route-based code splitting implemented
- [ ] Heavy components lazy loaded
- [ ] Dynamic imports optimized
- [ ] Bundle analyzer report reviewed
- [ ] Chunk size optimization complete

**Verification:**
```bash
# Analyze bundle size
npx expo export --platform all
```

### 2.4 Platform-Specific Builds
- [ ] **iOS**: Build successful, provisioning profiles correct
- [ ] **Android**: APK/AAB generated, signing keys correct
- [ ] **Web**: Static build generated and tested
- [ ] Deep linking configured for all platforms
- [ ] App scheme/bundle ID correct

### 2.5 Environment Configuration
- [ ] Production `.env` file configured
- [ ] API URLs pointing to production backend
- [ ] Feature flags set correctly for production
- [ ] Debug mode disabled
- [ ] Analytics/monitoring enabled
- [ ] Error reporting configured

---

## 3. Environment Variables Check

### 3.1 Backend Environment Variables

**Required Production Variables:**
```bash
# Application
NODE_ENV=production
PORT=5001
API_VERSION=v1

# Database
MONGODB_URI=mongodb+srv://[PRODUCTION_URI]
MONGODB_DB_NAME=rez_app_production

# Authentication
JWT_SECRET=[STRONG_SECRET_256_BITS]
JWT_REFRESH_SECRET=[DIFFERENT_SECRET]
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_[LIVE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[SECRET]
RAZORPAY_KEY_ID=rzp_live_[LIVE_KEY]
RAZORPAY_KEY_SECRET=[SECRET]

# Third-Party Services
CLOUDINARY_CLOUD_NAME=[NAME]
CLOUDINARY_API_KEY=[KEY]
CLOUDINARY_API_SECRET=[SECRET]

# Google Services
GOOGLE_MAPS_API_KEY=[PRODUCTION_KEY]
GOOGLE_PLACES_API_KEY=[PRODUCTION_KEY]
FIREBASE_SERVER_KEY=[KEY]

# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=[SID]
TWILIO_AUTH_TOKEN=[TOKEN]
TWILIO_PHONE_NUMBER=[NUMBER]

# Email Service
SENDGRID_API_KEY=[KEY]
FROM_EMAIL=noreply@rezapp.com

# Redis Cache (if used)
REDIS_URL=redis://[PRODUCTION_URL]

# Monitoring
SENTRY_DSN=[PRODUCTION_DSN]
LOG_LEVEL=error
```

**Verification Checklist:**
- [ ] All secrets are production values (not test/dev)
- [ ] No placeholder values remaining
- [ ] All keys have sufficient entropy
- [ ] Sensitive values not in version control
- [ ] Environment file permissions correct (600)

### 3.2 Frontend Environment Variables

**Required Production Variables:**
```bash
# Application
EXPO_PUBLIC_APP_NAME=REZ App
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=production

# Backend API
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api
EXPO_PUBLIC_API_TIMEOUT=30000

# Authentication
EXPO_PUBLIC_JWT_STORAGE_KEY=rez_app_token
EXPO_PUBLIC_REFRESH_TOKEN_KEY=rez_app_refresh_token
EXPO_PUBLIC_SESSION_TIMEOUT=1440

# Payment
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[LIVE_KEY]
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_[LIVE_KEY]
EXPO_PUBLIC_ENABLE_COD=true

# Maps & Location
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=[PRODUCTION_KEY]
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=[PRODUCTION_KEY]

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=[NAME]
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=[PRESET]
EXPO_PUBLIC_CLOUDINARY_PROFILE_PRESET=[PRESET]

# Analytics
EXPO_PUBLIC_GA_TRACKING_ID=[PRODUCTION_ID]
EXPO_PUBLIC_SENTRY_DSN=[PRODUCTION_DSN]
EXPO_PUBLIC_MIXPANEL_TOKEN=[TOKEN]

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_MOCK_API=false
```

**Verification Commands:**
```bash
# Check all required env vars are present
node scripts/verify-env.js

# Validate env file format
npx dotenv-check
```

---

## 4. API Endpoint Verification

### 4.1 Authentication Endpoints
```bash
# Test all auth endpoints
POST /api/auth/register          → 201 Created
POST /api/auth/login             → 200 OK
POST /api/auth/refresh           → 200 OK
POST /api/auth/logout            → 200 OK
POST /api/auth/forgot-password   → 200 OK
POST /api/auth/reset-password    → 200 OK
GET  /api/auth/verify-email      → 200 OK
POST /api/auth/resend-otp        → 200 OK
```

**Verification Script:**
```bash
npm run test:endpoints:auth
```

### 4.2 Core Feature Endpoints
```bash
# Products
GET    /api/products              → 200 OK
GET    /api/products/:id          → 200 OK
POST   /api/products/search       → 200 OK
GET    /api/products/category/:id → 200 OK

# Cart
GET    /api/cart                  → 200 OK
POST   /api/cart/items            → 201 Created
PUT    /api/cart/items/:id        → 200 OK
DELETE /api/cart/items/:id        → 200 OK

# Orders
GET    /api/orders                → 200 OK
GET    /api/orders/:id            → 200 OK
POST   /api/orders                → 201 Created
PUT    /api/orders/:id/cancel     → 200 OK

# Stores
GET    /api/stores                → 200 OK
GET    /api/stores/:id            → 200 OK
GET    /api/stores/nearby         → 200 OK

# User Profile
GET    /api/users/profile         → 200 OK
PUT    /api/users/profile         → 200 OK
POST   /api/users/avatar          → 200 OK

# Wishlist
GET    /api/wishlist              → 200 OK
POST   /api/wishlist/items        → 201 Created
DELETE /api/wishlist/items/:id    → 200 OK

# Reviews
GET    /api/reviews/product/:id   → 200 OK
POST   /api/reviews               → 201 Created
PUT    /api/reviews/:id           → 200 OK

# Videos/UGC
GET    /api/videos                → 200 OK
GET    /api/videos/:id            → 200 OK
POST   /api/videos/upload         → 201 Created

# Notifications
GET    /api/notifications         → 200 OK
PUT    /api/notifications/:id/read → 200 OK
```

**Test All Endpoints:**
```bash
npm run test:endpoints:all
```

### 4.3 Payment Endpoints
```bash
POST /api/payment/create-intent     → 200 OK (Stripe)
POST /api/payment/razorpay/order    → 200 OK
POST /api/payment/verify            → 200 OK
POST /api/payment/webhook           → 200 OK
```

**Payment Test:**
```bash
npm run test:payment:stripe
npm run test:payment:razorpay
```

### 4.4 Health & Monitoring
```bash
GET /api/health                   → 200 OK
GET /api/health/db                → 200 OK
GET /api/health/redis             → 200 OK
GET /api/metrics                  → 200 OK
```

---

## 5. Database Migration Check

### 5.1 Schema Validation
- [ ] All required collections created
- [ ] Collection schemas validated
- [ ] Default values set correctly
- [ ] Enum values correct
- [ ] Required fields enforced

**Collections Checklist:**
```
- users
- products
- stores
- categories
- orders
- carts
- reviews
- videos
- notifications
- wishlists
- coupons
- subscriptions
- referrals
- challenges
- events
- ugc_content
- transactions
```

### 5.2 Indexes Created
- [ ] User email index (unique)
- [ ] Product SKU index (unique)
- [ ] Store slug index (unique)
- [ ] Order userId + createdAt compound index
- [ ] Product category + price compound index
- [ ] Geospatial indexes for location queries
- [ ] Text indexes for search fields

**Verify Indexes:**
```bash
npm run verify:indexes
```

**Index Creation Script:**
```javascript
// Run this in MongoDB shell or script
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ category: 1, price: 1 })
db.products.createIndex({ name: "text", description: "text" })
db.stores.createIndex({ location: "2dsphere" })
db.orders.createIndex({ userId: 1, createdAt: -1 })
```

### 5.3 Data Migration
- [ ] Existing data backed up
- [ ] Migration scripts tested
- [ ] Rollback scripts prepared
- [ ] Data integrity verified
- [ ] Foreign key relationships validated

**Migration Commands:**
```bash
npm run db:backup
npm run migrate:up
npm run migrate:verify
```

### 5.4 Seeding Data (Production)
- [ ] Essential categories seeded
- [ ] System users created
- [ ] Default settings configured
- [ ] No test/dummy data in production

---

## 6. Third-Party Services Check

### 6.1 Payment Providers

**Stripe:**
- [ ] Live API keys configured
- [ ] Webhook endpoints configured
- [ ] Webhook signature verification working
- [ ] Test payment successful
- [ ] Refund flow tested
- [ ] Payment methods enabled (cards, UPI, wallets)

**Verification:**
```bash
# Test Stripe integration
npm run test:stripe:live
```

**Razorpay:**
- [ ] Live API keys configured
- [ ] Webhook endpoints configured
- [ ] Webhook signature verification working
- [ ] Test payment successful
- [ ] UPI payments working
- [ ] Wallet payments working

**Verification:**
```bash
npm run test:razorpay:live
```

### 6.2 Cloud Storage (Cloudinary)
- [ ] Production account configured
- [ ] Upload presets created and verified
- [ ] Storage limits checked
- [ ] CDN distribution working
- [ ] Image transformations working
- [ ] Video uploads working
- [ ] Signed URLs working (if needed)

**Test Upload:**
```bash
npm run test:cloudinary:upload
```

### 6.3 SMS/OTP Provider (Twilio)
- [ ] Production account configured
- [ ] Phone number verified and active
- [ ] SMS sending working
- [ ] OTP generation/validation working
- [ ] Rate limits configured
- [ ] Cost monitoring enabled

**Test SMS:**
```bash
npm run test:twilio:sms
```

### 6.4 Email Service (SendGrid/SES)
- [ ] Production account configured
- [ ] Domain verified
- [ ] DKIM/SPF records set
- [ ] Email templates created
- [ ] Transactional emails working
- [ ] Unsubscribe links working
- [ ] Bounce handling configured

**Test Email:**
```bash
npm run test:email:send
```

### 6.5 Google Services
- [ ] Google Maps API key working (production quota)
- [ ] Places API working
- [ ] Geocoding API working
- [ ] Firebase Cloud Messaging configured
- [ ] Push notifications working
- [ ] Analytics configured

**Test Maps:**
```bash
npm run test:google-maps
```

### 6.6 Analytics & Monitoring

**Google Analytics:**
- [ ] Production property created
- [ ] Tracking ID configured
- [ ] Events tracking working
- [ ] User properties configured

**Sentry:**
- [ ] Production project created
- [ ] DSN configured (frontend + backend)
- [ ] Source maps uploaded
- [ ] Error alerts configured
- [ ] Test error sent and received

**Mixpanel:**
- [ ] Production project created
- [ ] Token configured
- [ ] Events tracking working

---

## 7. Security Audit Items

### 7.1 Authentication Security
- [ ] Password minimum length enforced (8+ characters)
- [ ] Password complexity requirements met
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] JWT secrets are strong (256+ bits entropy)
- [ ] Token expiration configured correctly
- [ ] Refresh token rotation implemented
- [ ] Session invalidation on logout working
- [ ] Brute force protection enabled (rate limiting)

### 7.2 API Security
- [ ] HTTPS enforced (no HTTP allowed)
- [ ] CORS properly configured
- [ ] Rate limiting on all endpoints
- [ ] Request validation on all inputs
- [ ] SQL injection protection (parameterized queries)
- [ ] NoSQL injection protection (input sanitization)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection (if needed)
- [ ] File upload validation (type, size, content)
- [ ] Authentication required on protected routes

**Security Headers (Helmet.js):**
```javascript
✓ X-Content-Type-Options: nosniff
✓ X-Frame-Options: DENY
✓ X-XSS-Protection: 1; mode=block
✓ Strict-Transport-Security: max-age=31536000
✓ Content-Security-Policy configured
```

### 7.3 Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Passwords never stored in plain text
- [ ] Payment card data never stored (PCI compliance)
- [ ] Personal data encrypted (GDPR compliance)
- [ ] Database connections encrypted (TLS)
- [ ] API communications encrypted (HTTPS/WSS)

### 7.4 Access Control
- [ ] Role-based access control implemented
- [ ] User permissions verified
- [ ] Admin routes protected
- [ ] API endpoints require authentication
- [ ] Resource ownership verified (users can only access own data)

### 7.5 Secret Management
- [ ] No secrets in code/version control
- [ ] Environment variables used for all secrets
- [ ] `.env` files in `.gitignore`
- [ ] Secrets rotation plan in place
- [ ] API keys restricted by domain/IP
- [ ] Database credentials rotated

### 7.6 Security Testing
- [ ] Penetration testing completed
- [ ] Vulnerability scanning done
- [ ] Dependency audit clean
- [ ] OWASP Top 10 checked
- [ ] Security code review completed

**Run Security Audit:**
```bash
npm audit --production
npm run security:scan
```

---

## 8. Performance Benchmarks

### 8.1 Frontend Performance
- [ ] App bundle size < 50MB (iOS/Android)
- [ ] Initial load time < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] First contentful paint < 2 seconds
- [ ] Images lazy loaded
- [ ] Code splitting implemented
- [ ] Memory usage optimized (no leaks)
- [ ] FPS stable at 60fps (animations)

**Test Commands:**
```bash
# Measure bundle size
npx expo export --platform all
du -sh .expo-shared/

# Lighthouse audit (web)
npx lighthouse https://your-app.com --view
```

### 8.2 Backend Performance
- [ ] API response time < 500ms (p95)
- [ ] Database query time < 100ms (p95)
- [ ] Concurrent users supported: 1000+
- [ ] Requests per second: 100+
- [ ] Database connection pooling enabled
- [ ] Caching implemented (Redis/in-memory)
- [ ] Query optimization completed
- [ ] N+1 queries eliminated

**Load Testing:**
```bash
# Apache Bench
ab -n 1000 -c 100 https://api.rezapp.com/api/health

# Or use Artillery
artillery quick --count 100 --num 10 https://api.rezapp.com/api/products
```

### 8.3 Database Performance
- [ ] Indexes created for all queries
- [ ] Query execution plans reviewed
- [ ] Connection pooling configured
- [ ] Slow query logging enabled
- [ ] Database backup automated

### 8.4 CDN & Assets
- [ ] Images served from CDN
- [ ] Videos served from CDN
- [ ] Static assets cached (1 year)
- [ ] Gzip/Brotli compression enabled
- [ ] Image formats optimized (WebP/AVIF)

---

## 9. Testing Completion

### 9.1 Unit Tests
- [ ] Code coverage > 80%
- [ ] All critical functions tested
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Mock data comprehensive

**Run Tests:**
```bash
npm run test:coverage
```

**Coverage Requirements:**
```
Statements   : 80%
Branches     : 75%
Functions    : 80%
Lines        : 80%
```

### 9.2 Integration Tests
- [ ] API integration tests passing
- [ ] Database integration tested
- [ ] Third-party service integration tested
- [ ] Authentication flow tested
- [ ] Payment flow tested

**Run Integration Tests:**
```bash
npm run test:integration
```

### 9.3 End-to-End Tests
- [ ] **User registration flow**: Email → OTP → Profile setup
- [ ] **Login flow**: Email/phone → Password → Dashboard
- [ ] **Product browse**: Homepage → Category → Product details
- [ ] **Add to cart**: Product → Cart → Update quantity
- [ ] **Checkout flow**: Cart → Address → Payment → Order confirmation
- [ ] **Payment flow**: Stripe/Razorpay → Success/failure handling
- [ ] **Order tracking**: Orders → Track → Status updates
- [ ] **Profile update**: Edit profile → Save → Verify changes
- [ ] **Wishlist**: Add → Remove → View
- [ ] **Review submission**: Product → Write review → Submit
- [ ] **Video upload**: Record → Upload → Publish
- [ ] **Search**: Enter query → View results → Filter

**Run E2E Tests:**
```bash
npm run test:e2e
```

### 9.4 Platform-Specific Tests
- [ ] **iOS**: App runs on iPhone/iPad (iOS 13+)
- [ ] **Android**: App runs on various devices (Android 8+)
- [ ] **Web**: App works in Chrome, Safari, Firefox, Edge
- [ ] **Tablet**: Responsive layouts work correctly
- [ ] **Different screen sizes**: Layout adapts properly

### 9.5 Feature Tests
- [ ] Push notifications received and working
- [ ] Deep linking working (app open from links)
- [ ] Camera access working (permissions)
- [ ] Location services working (permissions)
- [ ] File upload working (images/videos)
- [ ] Offline mode working (queue uploads)
- [ ] Real-time updates (Socket.io)
- [ ] Background tasks working

### 9.6 Regression Tests
- [ ] Previously fixed bugs don't recur
- [ ] No new bugs introduced
- [ ] Core functionality unchanged

---

## 10. Documentation Review

### 10.1 Technical Documentation
- [ ] **README.md**: Updated with latest setup instructions
- [ ] **API Documentation**: All endpoints documented (Swagger/Postman)
- [ ] **Architecture diagrams**: Current and accurate
- [ ] **Database schema**: Documented with ERD
- [ ] **Environment setup**: Step-by-step guide
- [ ] **Deployment guide**: Complete and tested
- [ ] **Troubleshooting guide**: Common issues documented

### 10.2 User Documentation
- [ ] **User guide**: How to use the app
- [ ] **FAQ**: Common questions answered
- [ ] **Help center**: Articles published
- [ ] **Video tutorials**: Created (optional)
- [ ] **Release notes**: Prepared for v1.0.0

### 10.3 Legal Documentation
- [ ] **Privacy Policy**: Published and linked in app
- [ ] **Terms of Service**: Published and linked in app
- [ ] **Cookie Policy**: Published (web)
- [ ] **Data Deletion**: Process documented
- [ ] **GDPR Compliance**: Data handling documented
- [ ] **Refund Policy**: Published
- [ ] **Shipping Policy**: Published (if applicable)

### 10.4 App Store Assets
- [ ] **App Store Description**: Written and optimized
- [ ] **Play Store Description**: Written and optimized
- [ ] **Screenshots**: Created for all required sizes
- [ ] **App Preview Videos**: Created (optional)
- [ ] **Keywords**: Researched and added
- [ ] **Category**: Selected correctly
- [ ] **Age Rating**: Set correctly
- [ ] **Contact Information**: Correct support email/phone

### 10.5 Release Preparation
- [ ] **Version number**: Set to 1.0.0
- [ ] **Build number**: Incremented
- [ ] **Changelog**: Prepared with all features
- [ ] **Marketing materials**: Created
- [ ] **Press release**: Prepared (optional)
- [ ] **Social media posts**: Scheduled

---

## Final Pre-Deployment Sign-Off

**Review this checklist with the entire team before proceeding to staging deployment.**

### Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Tech Lead** | __________ | ______ | __________ |
| **Backend Developer** | __________ | ______ | __________ |
| **Frontend Developer** | __________ | ______ | __________ |
| **QA Engineer** | __________ | ______ | __________ |
| **DevOps Engineer** | __________ | ______ | __________ |
| **Product Manager** | __________ | ______ | __________ |

---

## Next Steps

Once this checklist is 100% complete:

1. Proceed to **STAGING_SETUP_GUIDE.md**
2. Deploy to staging environment
3. Run **SMOKE_TEST_SUITE.md** on staging
4. If all smoke tests pass, proceed to production deployment
5. Keep **ROLLBACK_PROCEDURES.md** handy during deployment
6. Follow **GO_LIVE_CHECKLIST.md** for final production deployment

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintained By**: DevOps Team
