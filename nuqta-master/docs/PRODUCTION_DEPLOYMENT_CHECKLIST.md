# PRODUCTION DEPLOYMENT CHECKLIST
## REZ App - Complete Pre-Deployment Guide

**Last Updated:** January 27, 2025
**Version:** 2.0.0
**Status:** Comprehensive Production Readiness Assessment

---

## EXECUTIVE SUMMARY

This checklist provides a complete guide for deploying the REZ application to production. The application consists of:
- **Frontend:** React Native Expo application
- **Backend:** Node.js/Express REST API with MongoDB
- **Key Features:** E-commerce, Payments, Social Feed, Gamification, Bill Upload

**Estimated Time to Production:** 7-14 days (depending on third-party service approval)

---

# TABLE OF CONTENTS

1. [Pre-Deployment Requirements](#1-pre-deployment-requirements)
2. [Environment Setup](#2-environment-setup)
3. [Security Configuration](#3-security-configuration)
4. [Third-Party Services](#4-third-party-services)
5. [Database & Infrastructure](#5-database--infrastructure)
6. [Performance Optimization](#6-performance-optimization)
7. [Testing Checklist](#7-testing-checklist)
8. [Deployment Steps](#8-deployment-steps)
9. [Post-Deployment Monitoring](#9-post-deployment-monitoring)
10. [Rollback Plan](#10-rollback-plan)

---

## 1. PRE-DEPLOYMENT REQUIREMENTS

### 1.1 Infrastructure Requirements

#### Backend Server
- [ ] **Server Type:** VPS, Cloud VM, or Container Platform
  - Recommended: AWS EC2, DigitalOcean, Heroku, or Railway
  - Minimum: 2GB RAM, 2 vCPU, 20GB SSD
  - Recommended: 4GB RAM, 2 vCPU, 40GB SSD
- [ ] **Operating System:** Ubuntu 20.04+ or similar Linux distribution
- [ ] **Node.js:** v18+ installed
- [ ] **PM2:** Process manager for Node.js applications
- [ ] **Nginx:** Reverse proxy and SSL termination
- [ ] **SSL Certificate:** Let's Encrypt or commercial certificate

#### Database
- [ ] **MongoDB:** 5.0+ (Atlas or self-hosted)
  - Recommended: MongoDB Atlas M10+ cluster
  - Minimum storage: 10GB
  - Automatic backups enabled
  - Point-in-time recovery configured
- [ ] **Redis:** 6.0+ (optional but recommended for caching)
  - Recommended for session management and caching
  - Redis Cloud or self-hosted

#### CDN & Storage
- [ ] **File Storage:** Cloudinary, AWS S3, or similar
  - For user uploads, product images, bills
  - CDN integration for fast delivery
- [ ] **CDN:** CloudFlare or AWS CloudFront
  - For static assets and API caching
  - DDoS protection enabled

#### Domain & DNS
- [ ] **Domain Name:** Purchased and configured
  - Example: api.rezapp.com (backend)
  - Example: rezapp.com (web, if applicable)
- [ ] **DNS Provider:** CloudFlare recommended
  - A records configured
  - SSL/TLS settings configured
  - CAA records for security

### 1.2 Development Team Sign-off

- [ ] **Backend Engineer:** Code review complete, APIs tested
- [ ] **Frontend Engineer:** UI/UX verified, integrations tested
- [ ] **QA Engineer:** Test plan executed, critical bugs resolved
- [ ] **Security Team:** Security audit passed
- [ ] **DevOps Engineer:** Infrastructure ready, deployment pipeline tested
- [ ] **Product Manager:** Features verified, acceptance criteria met
- [ ] **Business Owner:** Legal requirements met, payments configured

### 1.3 Legal & Compliance

- [ ] **Privacy Policy:** Updated and accessible
  - URL: https://rezapp.com/privacy
  - Covers data collection, storage, and usage
  - GDPR compliant (if applicable)
- [ ] **Terms of Service:** Updated and accessible
  - URL: https://rezapp.com/terms
  - Covers user responsibilities, liability, disputes
- [ ] **Refund Policy:** Documented and clear
  - Payment gateway refund terms
  - Cancellation policy
  - Customer support process
- [ ] **GDPR Compliance:** (If serving EU users)
  - Cookie consent banner
  - Data deletion mechanism
  - Privacy controls for users
- [ ] **PCI DSS Compliance:** (For payments)
  - No card data stored locally
  - All payments through certified gateway
  - Razorpay/Stripe handles PCI compliance

---

## 2. ENVIRONMENT SETUP

### 2.1 Backend Environment Variables

Create production `.env` file with ALL required variables:

```env
# ================================================
# NODE ENVIRONMENT
# ================================================
NODE_ENV=production
PORT=5001

# ================================================
# DATABASE CONFIGURATION
# ================================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rezapp-prod?retryWrites=true&w=majority
MONGODB_OPTIONS=useNewUrlParser=true&useUnifiedTopology=true

# ================================================
# JWT CONFIGURATION
# ================================================
JWT_SECRET=<GENERATE_STRONG_RANDOM_STRING_64_CHARS>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<GENERATE_DIFFERENT_STRONG_RANDOM_STRING_64_CHARS>
JWT_REFRESH_EXPIRES_IN=30d

# ================================================
# CORS CONFIGURATION
# ================================================
CORS_ORIGIN=https://rezapp.com,https://www.rezapp.com
ALLOWED_ORIGINS=https://rezapp.com,https://www.rezapp.com

# ================================================
# RATE LIMITING
# ================================================
DISABLE_RATE_LIMIT=false
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ================================================
# CLOUDINARY (FILE UPLOAD)
# ================================================
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

# ================================================
# RAZORPAY PAYMENT GATEWAY
# ================================================
RAZORPAY_KEY_ID=rzp_live_<your_key_id>
RAZORPAY_KEY_SECRET=<your_key_secret>
RAZORPAY_WEBHOOK_SECRET=<your_webhook_secret>

# ================================================
# STRIPE PAYMENT GATEWAY (Alternative)
# ================================================
STRIPE_SECRET_KEY=sk_live_<your_stripe_secret>
STRIPE_PUBLISHABLE_KEY=pk_live_<your_stripe_publishable>
STRIPE_WEBHOOK_SECRET=whsec_<your_webhook_secret>

# ================================================
# SMS SERVICE (TWILIO)
# ================================================
TWILIO_ACCOUNT_SID=<your_twilio_account_sid>
TWILIO_AUTH_TOKEN=<your_twilio_auth_token>
TWILIO_PHONE_NUMBER=<your_twilio_phone_number>
TWILIO_VERIFY_SERVICE_SID=<your_verify_service_sid>

# ================================================
# EMAIL SERVICE
# ================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_email@gmail.com>
SMTP_PASSWORD=<app_password>
EMAIL_FROM=REZ App <noreply@rezapp.com>

# ================================================
# REDIS (OPTIONAL - FOR CACHING)
# ================================================
REDIS_URL=redis://username:password@host:port
REDIS_HOST=<redis_host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>

# ================================================
# GOOGLE MAPS / LOCATION
# ================================================
GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>

# ================================================
# FIREBASE (PUSH NOTIFICATIONS)
# ================================================
FIREBASE_PROJECT_ID=<your_project_id>
FIREBASE_PRIVATE_KEY=<your_private_key>
FIREBASE_CLIENT_EMAIL=<your_client_email>

# ================================================
# SENTRY (ERROR TRACKING)
# ================================================
SENTRY_DSN=<your_sentry_dsn>
SENTRY_ENVIRONMENT=production

# ================================================
# APPLICATION SETTINGS
# ================================================
APP_NAME=REZ App
APP_URL=https://api.rezapp.com
FRONTEND_URL=https://rezapp.com
SUPPORT_EMAIL=support@rezapp.com
SUPPORT_PHONE=+91-1234567890

# ================================================
# SECURITY
# ================================================
SESSION_SECRET=<GENERATE_STRONG_RANDOM_STRING_32_CHARS>
ENCRYPTION_KEY=<GENERATE_STRONG_RANDOM_STRING_32_CHARS>
BCRYPT_ROUNDS=12

# ================================================
# LOGGING
# ================================================
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/rezapp
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=true

# ================================================
# ANALYTICS
# ================================================
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
MIXPANEL_TOKEN=<your_mixpanel_token>
```

**Security Notes:**
- [ ] Generate all secrets using: `openssl rand -base64 64`
- [ ] Store secrets in environment variables or secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] NEVER commit `.env` files to Git
- [ ] Use different secrets for production vs staging

### 2.2 Frontend Environment Variables

Create production `.env.production` file:

```env
# ================================================
# APPLICATION
# ================================================
EXPO_PUBLIC_APP_NAME=REZ App
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=production

# ================================================
# BACKEND API
# ================================================
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api
EXPO_PUBLIC_API_TIMEOUT=30000

# ================================================
# AUTHENTICATION
# ================================================
EXPO_PUBLIC_JWT_STORAGE_KEY=rez_app_token
EXPO_PUBLIC_REFRESH_TOKEN_KEY=rez_app_refresh_token
EXPO_PUBLIC_USER_DATA_KEY=rez_app_user
EXPO_PUBLIC_SESSION_TIMEOUT=1440

# ================================================
# PAYMENT GATEWAYS
# ================================================
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_<your_key_id>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<your_stripe_key>
EXPO_PUBLIC_ENABLE_RAZORPAY=true
EXPO_PUBLIC_ENABLE_STRIPE=true
EXPO_PUBLIC_ENABLE_COD=true

# ================================================
# GOOGLE SERVICES
# ================================================
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your_google_maps_key>
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=<your_google_places_key>

# ================================================
# FIREBASE
# ================================================
EXPO_PUBLIC_FIREBASE_API_KEY=<your_firebase_api_key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<your_project>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<your_project_id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<your_project>.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
EXPO_PUBLIC_FIREBASE_APP_ID=<your_app_id>

# ================================================
# ANALYTICS
# ================================================
EXPO_PUBLIC_GA_TRACKING_ID=<your_ga_id>
EXPO_PUBLIC_SENTRY_DSN=<your_sentry_dsn>
EXPO_PUBLIC_MIXPANEL_TOKEN=<your_mixpanel_token>

# ================================================
# FEATURE FLAGS
# ================================================
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_MOCK_API=false

# ================================================
# BUSINESS INFO
# ================================================
EXPO_PUBLIC_SUPPORT_EMAIL=support@rezapp.com
EXPO_PUBLIC_SUPPORT_PHONE=+91-1234567890
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://rezapp.com/privacy
EXPO_PUBLIC_TERMS_OF_SERVICE_URL=https://rezapp.com/terms
```

### 2.3 Environment Variable Validation

- [ ] All required variables are set
- [ ] No placeholder values (e.g., "your_key_here")
- [ ] No development/test credentials in production
- [ ] Secrets are properly generated (min 32 characters)
- [ ] URLs use HTTPS (not HTTP)
- [ ] API endpoints are correct and accessible

---

## 3. SECURITY CONFIGURATION

### 3.1 Authentication & Authorization

- [ ] **JWT Implementation:**
  - ✅ Implemented with expiration
  - ✅ Refresh token mechanism in place
  - ✅ Token stored securely in AsyncStorage
  - [ ] Verify token expiration times are appropriate (7 days access, 30 days refresh)

- [ ] **Password Security:** (If applicable)
  - ✅ Bcrypt hashing with 12 rounds
  - ✅ No plaintext passwords stored

- [ ] **Session Management:**
  - ✅ Automatic logout on token expiration
  - ✅ Force logout capability
  - ✅ Account locking after failed attempts
  - [ ] Review session timeout settings

### 3.2 API Security

- [ ] **HTTPS Only:**
  - [ ] SSL certificate installed
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS headers configured
  - [ ] Certificate auto-renewal set up

- [ ] **CORS Configuration:**
  - ✅ Implemented in backend
  - [ ] Whitelist production domains only
  - [ ] No wildcard (*) origins in production

- [ ] **Rate Limiting:**
  - ✅ Implemented for all endpoints
  - ✅ Different limits for different operations
  - [ ] Verify DISABLE_RATE_LIMIT=false in production
  - Rate limits configured:
    - General API: 100 requests/15min
    - Authentication: 5 attempts/15min
    - OTP: 3 requests/30sec
    - File upload: 10 uploads/min

- [ ] **Input Validation:**
  - ✅ Joi validation on all inputs
  - ✅ Request body size limits
  - ✅ File upload size limits (5MB images, 50MB videos)
  - [ ] Test with malicious inputs

- [ ] **Security Headers:**
  - ✅ Helmet.js middleware applied
  - Headers configured:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Content-Security-Policy: configured
    - Strict-Transport-Security: max-age=31536000

### 3.3 Data Security

- [ ] **Encryption:**
  - [ ] Data encrypted in transit (TLS 1.2+)
  - [ ] Sensitive data encrypted at rest
  - [ ] Database connection encrypted

- [ ] **PCI Compliance:**
  - ✅ No card data stored
  - ✅ Payments through Razorpay/Stripe only
  - ✅ No CVV storage
  - ✅ No PAN storage

- [ ] **Data Sanitization:**
  - ✅ XSS protection implemented
  - ✅ SQL injection prevention (using Mongoose)
  - ✅ NoSQL injection prevention
  - [ ] Test with OWASP Top 10 attacks

### 3.4 Third-Party Security

- [ ] **API Keys:**
  - [ ] All keys in environment variables
  - [ ] No keys in frontend code
  - [ ] No keys in Git history
  - [ ] Production keys separate from test keys

- [ ] **Webhooks:**
  - ✅ Signature verification for Razorpay webhooks
  - ✅ Idempotency handling
  - [ ] Test webhook security

- [ ] **Dependencies:**
  - [ ] All npm packages up to date
  - [ ] No critical vulnerabilities (`npm audit`)
  - [ ] Unused dependencies removed
  - [ ] Lock files committed

---

## 4. THIRD-PARTY SERVICES

### 4.1 Payment Gateway (Razorpay)

#### Setup & Configuration
- [ ] **Account Setup:**
  - [ ] Razorpay account created
  - [ ] KYC verification completed (24-48 hours)
  - [ ] Bank account verified
  - [ ] Live keys generated

- [ ] **Dashboard Configuration:**
  - [ ] Webhook URL configured: `https://api.rezapp.com/api/payment/webhook`
  - [ ] Events enabled: `payment.captured`, `payment.failed`, `order.paid`
  - [ ] Payment methods enabled: Card, UPI, Net Banking, Wallets
  - [ ] Settlement schedule configured
  - [ ] Email notifications set up

- [ ] **Testing:**
  - [ ] Test mode payments successful
  - [ ] Live mode test transaction completed
  - [ ] Refund flow tested
  - [ ] Webhook delivery verified

- [ ] **Documentation:**
  - [ ] Payment flow documented
  - [ ] Error handling documented
  - [ ] Refund process documented

**Reference:** See `RAZORPAY_PRODUCTION_CHECKLIST.md` for complete guide

### 4.2 SMS Gateway (Twilio)

- [ ] **Account Setup:**
  - [ ] Twilio account created
  - [ ] Phone number purchased/assigned
  - [ ] Verify service created for OTP
  - [ ] Billing configured

- [ ] **Configuration:**
  - [ ] Account SID and Auth Token in environment
  - [ ] Verify Service SID configured
  - [ ] India SMS enabled (if applicable)
  - [ ] DND override requested (if needed)

- [ ] **Testing:**
  - [ ] OTP sending works
  - [ ] OTP verification works
  - [ ] Delivery rate acceptable (>95%)
  - [ ] Cost per SMS acceptable

### 4.3 File Storage (Cloudinary)

- [ ] **Account Setup:**
  - [ ] Cloudinary account created
  - [ ] Appropriate plan selected
  - [ ] Usage limits understood
  - [ ] Billing configured

- [ ] **Configuration:**
  - [ ] Cloud name, API key, secret in environment
  - [ ] Upload presets created
  - [ ] Folder structure defined
  - [ ] Transformations configured
  - [ ] CDN enabled

- [ ] **Security:**
  - [ ] Signed uploads for production
  - [ ] File type restrictions
  - [ ] Size limits enforced (5MB images)
  - [ ] No direct upload from frontend (uploads go through backend)

- [ ] **Testing:**
  - [ ] Bill upload works
  - [ ] Image upload works
  - [ ] CDN delivery fast (<500ms)

### 4.4 Email Service (SMTP)

- [ ] **Provider Setup:**
  - [ ] Gmail App Password created OR
  - [ ] SendGrid/AWS SES/Mailgun configured
  - [ ] SPF/DKIM records configured
  - [ ] Domain verification completed

- [ ] **Configuration:**
  - [ ] SMTP credentials in environment
  - [ ] From address configured
  - [ ] Reply-to address set

- [ ] **Templates:**
  - [ ] Welcome email template
  - [ ] OTP email template
  - [ ] Order confirmation template
  - [ ] Payment receipt template
  - [ ] Password reset template (if applicable)

- [ ] **Testing:**
  - [ ] Test emails delivered
  - [ ] Not landing in spam
  - [ ] Unsubscribe link works

### 4.5 Push Notifications (Firebase)

- [ ] **Firebase Project:**
  - [ ] Project created
  - [ ] iOS app added (if applicable)
  - [ ] Android app added
  - [ ] Web app added (if applicable)

- [ ] **Configuration:**
  - [ ] google-services.json downloaded (Android)
  - [ ] GoogleService-Info.plist downloaded (iOS)
  - [ ] Server key in environment
  - [ ] Vapid key configured (web)

- [ ] **Testing:**
  - [ ] Push notifications received on Android
  - [ ] Push notifications received on iOS
  - [ ] Deep links work
  - [ ] Notification open tracking works

### 4.6 Error Tracking (Sentry)

- [ ] **Account Setup:**
  - [ ] Sentry account created
  - [ ] Project created (backend + frontend)
  - [ ] Appropriate plan selected

- [ ] **Configuration:**
  - [ ] DSN in environment variables
  - [ ] Source maps uploaded (frontend)
  - [ ] Release tracking configured
  - [ ] User context attached

- [ ] **Alerts:**
  - [ ] Email alerts configured
  - [ ] Slack/Discord integration (optional)
  - [ ] Error thresholds set

- [ ] **Testing:**
  - [ ] Test error sent and received
  - [ ] Stack traces readable
  - [ ] User info captured

### 4.7 Analytics (Google Analytics / Mixpanel)

- [ ] **Setup:**
  - [ ] Account created
  - [ ] Property/Project created
  - [ ] Tracking ID/Token obtained

- [ ] **Configuration:**
  - [ ] Tracking code in frontend
  - [ ] Custom events defined
  - [ ] E-commerce tracking enabled
  - [ ] User ID tracking configured

- [ ] **Testing:**
  - [ ] Events being tracked
  - [ ] Real-time data visible
  - [ ] E-commerce data tracked

---

## 5. DATABASE & INFRASTRUCTURE

### 5.1 MongoDB Configuration

#### Atlas Setup (Recommended)
- [ ] **Cluster Configuration:**
  - [ ] M10+ cluster for production
  - [ ] Multi-region replica set (for high availability)
  - [ ] Auto-scaling enabled
  - [ ] Connection limits appropriate

- [ ] **Security:**
  - [ ] Database user created with appropriate permissions
  - [ ] IP whitelist configured (or 0.0.0.0/0 with strong password)
  - [ ] TLS/SSL encryption enabled
  - [ ] Audit logging enabled

- [ ] **Backups:**
  - [ ] Automatic backups enabled (continuous)
  - [ ] Backup retention: 7+ days
  - [ ] Point-in-time recovery enabled
  - [ ] Test restore procedure

- [ ] **Monitoring:**
  - [ ] Alerts for CPU/memory/disk usage
  - [ ] Slow query alerts
  - [ ] Connection pool monitoring
  - [ ] Performance Advisor enabled

#### Database Indexes
- [ ] **Critical Indexes Created:**
  ```javascript
  // Users
  db.users.createIndex({ phoneNumber: 1 }, { unique: true })
  db.users.createIndex({ email: 1 }, { sparse: true })
  db.users.createIndex({ "auth.refreshToken": 1 })

  // Products
  db.products.createIndex({ storeId: 1, isActive: 1 })
  db.products.createIndex({ category: 1, isActive: 1 })
  db.products.createIndex({ name: "text", description: "text" })

  // Orders
  db.orders.createIndex({ userId: 1, createdAt: -1 })
  db.orders.createIndex({ status: 1, createdAt: -1 })
  db.orders.createIndex({ "payment.razorpayOrderId": 1 })

  // Cart
  db.carts.createIndex({ userId: 1 }, { unique: true })

  // Reviews
  db.reviews.createIndex({ productId: 1, userId: 1 }, { unique: true })
  ```

### 5.2 Server Configuration

#### Backend Server (Node.js)
- [ ] **PM2 Configuration:**
  - [ ] PM2 installed globally
  - [ ] Cluster mode enabled (use all CPU cores)
  - [ ] Auto-restart on crash
  - [ ] Log rotation configured
  - [ ] PM2 startup script enabled

  ```bash
  # Install PM2
  npm install -g pm2

  # Start with PM2
  pm2 start npm --name "rezapp-backend" -- start
  pm2 save
  pm2 startup
  ```

- [ ] **Nginx Configuration:**
  - [ ] Reverse proxy configured
  - [ ] Load balancing (if multiple instances)
  - [ ] SSL/TLS termination
  - [ ] Gzip compression enabled
  - [ ] Rate limiting (additional layer)
  - [ ] Request size limits
  - [ ] Timeout settings optimized

  Example Nginx config:
  ```nginx
  server {
      listen 443 ssl http2;
      server_name api.rezapp.com;

      ssl_certificate /etc/letsencrypt/live/api.rezapp.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/api.rezapp.com/privkey.pem;

      client_max_body_size 50M;

      location / {
          proxy_pass http://localhost:5001;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

#### Firewall & Security
- [ ] **UFW/Firewall Configuration:**
  - [ ] Port 80 open (HTTP)
  - [ ] Port 443 open (HTTPS)
  - [ ] Port 22 open (SSH - with key-based auth only)
  - [ ] Port 5001 closed to public (only localhost)
  - [ ] MongoDB port closed to public (use Atlas connection string)

- [ ] **SSH Security:**
  - [ ] Password authentication disabled
  - [ ] Key-based authentication only
  - [ ] Root login disabled
  - [ ] SSH port changed (optional but recommended)
  - [ ] Fail2ban installed and configured

### 5.3 CDN Configuration (CloudFlare)

- [ ] **DNS Setup:**
  - [ ] A record for api.rezapp.com
  - [ ] CNAME for www (if applicable)
  - [ ] CAA record for SSL issuance
  - [ ] Orange cloud (proxied) enabled

- [ ] **SSL/TLS:**
  - [ ] Full (strict) SSL mode
  - [ ] Automatic HTTPS rewrites enabled
  - [ ] HSTS enabled
  - [ ] TLS 1.2 minimum

- [ ] **Security:**
  - [ ] DDoS protection active
  - [ ] Bot fight mode enabled
  - [ ] Rate limiting rules configured
  - [ ] WAF rules configured

- [ ] **Performance:**
  - [ ] Auto minify (CSS, JS, HTML)
  - [ ] Brotli compression enabled
  - [ ] Caching rules configured
  - [ ] Page rules for API caching (careful with dynamic content)

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Backend Optimization

- [ ] **Code Optimization:**
  - [ ] Async/await used properly
  - [ ] No blocking operations in request handlers
  - [ ] Database queries optimized
  - [ ] N+1 query problems resolved
  - [ ] Pagination implemented for lists

- [ ] **Caching Strategy:**
  - [ ] Redis caching for frequently accessed data
  - [ ] API response caching (cache headers)
  - [ ] Static data caching
  - [ ] Cache invalidation strategy defined

- [ ] **Database Optimization:**
  - [ ] All necessary indexes created
  - [ ] Slow query log analyzed
  - [ ] Connection pooling configured
  - [ ] Query results limited (pagination)

- [ ] **Response Compression:**
  - ✅ Compression middleware enabled
  - [ ] Gzip/Brotli at Nginx level

### 6.2 Frontend Optimization

- [ ] **Bundle Size:**
  - [ ] Production build created
  - [ ] Bundle size analyzed
  - [ ] Unused dependencies removed
  - [ ] Code splitting implemented (if applicable)

- [ ] **Image Optimization:**
  - [ ] Images compressed
  - [ ] Lazy loading implemented
  - [ ] WebP format used where possible
  - [ ] Placeholder images for loading states

- [ ] **Network Optimization:**
  - [ ] API request batching
  - [ ] Debouncing for search inputs
  - [ ] Request caching (React Query or similar)
  - [ ] Offline support for critical features

- [ ] **Performance Monitoring:**
  - [ ] Bundle size tracking
  - [ ] App load time < 3 seconds
  - [ ] API response time < 500ms (p95)

### 6.3 Load Testing

- [ ] **Backend Load Tests:**
  - [ ] Test with 100 concurrent users
  - [ ] Test with 1000 concurrent users
  - [ ] Identify bottlenecks
  - [ ] Database performance under load
  - [ ] Payment flow under load

- [ ] **Tools:**
  - [ ] Apache JMeter, Locust, or K6
  - [ ] Test critical user flows
  - [ ] Document results

---

## 7. TESTING CHECKLIST

### 7.1 Functional Testing

#### Authentication Flow
- [ ] User registration (OTP-based)
- [ ] OTP sending and verification
- [ ] Login and logout
- [ ] Token refresh on expiration
- [ ] Profile update
- [ ] Account deletion

#### E-commerce Flow
- [ ] Browse products and categories
- [ ] Search functionality
- [ ] Product details view
- [ ] Add to cart
- [ ] Cart operations (update quantity, remove)
- [ ] Checkout process
- [ ] Payment integration (Razorpay)
- [ ] Order confirmation
- [ ] Order history
- [ ] Order tracking

#### Wallet & Transactions
- [ ] Wallet balance display
- [ ] Add money to wallet
- [ ] Send money
- [ ] Transaction history
- [ ] PayBill feature
- [ ] Bill upload

#### Social Features
- [ ] Social feed view
- [ ] Create post
- [ ] Like/comment
- [ ] Share content
- [ ] Follow/unfollow

#### Gamification
- [ ] Spin wheel
- [ ] Scratch card
- [ ] Quiz
- [ ] Coin system
- [ ] Leaderboard

#### Other Features
- [ ] Wishlist
- [ ] Reviews and ratings
- [ ] Store pages
- [ ] Event booking
- [ ] Referral system
- [ ] Notifications
- [ ] Search

### 7.2 Security Testing

- [ ] **Authentication:**
  - [ ] Test expired token rejection
  - [ ] Test invalid token rejection
  - [ ] Test token refresh mechanism
  - [ ] Test logout clears tokens

- [ ] **Authorization:**
  - [ ] Users can't access other users' data
  - [ ] Admin routes protected
  - [ ] Merchant routes protected

- [ ] **Input Validation:**
  - [ ] Test SQL injection attempts
  - [ ] Test XSS attempts
  - [ ] Test CSRF protection
  - [ ] Test file upload restrictions

- [ ] **Payment Security:**
  - [ ] Payment amount can't be manipulated
  - [ ] Webhook signature verification
  - [ ] Order validation before payment

- [ ] **Rate Limiting:**
  - [ ] Rate limits trigger correctly
  - [ ] Appropriate error messages
  - [ ] Retry-after headers present

### 7.3 Performance Testing

- [ ] **Response Times:**
  - [ ] API responses < 200ms (p50)
  - [ ] API responses < 500ms (p95)
  - [ ] Database queries < 100ms

- [ ] **Load Testing:**
  - [ ] 100 concurrent users handled
  - [ ] No memory leaks under load
  - [ ] Database connections managed properly

- [ ] **App Performance:**
  - [ ] App launches < 2 seconds
  - [ ] Smooth scrolling (60 FPS)
  - [ ] No ANR (Application Not Responding)

### 7.4 Device Testing

- [ ] **Android:**
  - [ ] Android 10, 11, 12, 13
  - [ ] Various screen sizes
  - [ ] Different manufacturers (Samsung, OnePlus, etc.)

- [ ] **iOS:**
  - [ ] iOS 14, 15, 16, 17
  - [ ] iPhone 11, 12, 13, 14, 15
  - [ ] iPad (if supported)

- [ ] **Network Conditions:**
  - [ ] 4G connection
  - [ ] 3G connection
  - [ ] Slow/spotty connection
  - [ ] Offline behavior

### 7.5 User Acceptance Testing (UAT)

- [ ] **Beta Testing:**
  - [ ] Beta group created (10-50 users)
  - [ ] Feedback form available
  - [ ] Critical bugs reported and fixed
  - [ ] User experience validated

- [ ] **Acceptance Criteria:**
  - [ ] All critical features work
  - [ ] No critical bugs
  - [ ] Performance acceptable
  - [ ] UI/UX approved by stakeholders

---

## 8. DEPLOYMENT STEPS

### 8.1 Pre-Deployment Final Checks

- [ ] All items in this checklist completed
- [ ] Code frozen (no last-minute changes)
- [ ] All tests passing
- [ ] Database migrations ready (if any)
- [ ] Rollback plan documented
- [ ] Team briefed on deployment

### 8.2 Backend Deployment

#### Step 1: Prepare Server
```bash
# SSH into server
ssh user@your-server-ip

# Create application directory
sudo mkdir -p /var/www/rezapp-backend
cd /var/www/rezapp-backend

# Clone repository (or upload build)
git clone <your-repo-url> .
# OR upload via SCP

# Install dependencies
npm install --production

# Build TypeScript
npm run build
```

#### Step 2: Configure Environment
```bash
# Copy environment file
cp .env.example .env
nano .env
# Fill in all production values

# Verify environment
node -e "console.log(process.env.MONGODB_URI ? 'Env loaded' : 'Env missing')"
```

#### Step 3: Start with PM2
```bash
# Start application
pm2 start dist/server.js --name rezapp-backend -i max

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the command it provides

# Check logs
pm2 logs rezapp-backend
```

#### Step 4: Configure Nginx
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/rezapp

# Enable site
sudo ln -s /etc/nginx/sites-available/rezapp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 5: Setup SSL
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.rezapp.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### 8.3 Frontend Deployment (React Native)

#### For EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

#### For Web (if applicable)
```bash
# Build web version
npm run build:web

# Deploy to hosting
# Vercel, Netlify, or your preferred host
```

### 8.4 Database Migration

- [ ] **Backup current database** (if updating existing)
- [ ] **Run migrations** (if any schema changes)
- [ ] **Seed initial data** (if new database)
  ```bash
  npm run seed:critical
  ```
- [ ] **Verify data integrity**

### 8.5 Post-Deployment Verification

#### Immediate Checks (within 15 minutes)
- [ ] Backend server is running (`pm2 status`)
- [ ] Health check endpoint responds (`curl https://api.rezapp.com/health`)
- [ ] Database connection successful
- [ ] Logs show no errors (`pm2 logs`)
- [ ] SSL certificate valid (check in browser)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

#### API Smoke Tests
```bash
# Health check
curl https://api.rezapp.com/health

# Test authentication (should fail without token)
curl https://api.rezapp.com/api/user/auth/me

# Test public endpoint
curl https://api.rezapp.com/api/categories
```

#### Frontend Checks
- [ ] App launches successfully
- [ ] Can create account
- [ ] Can login
- [ ] Can view products
- [ ] Can add to cart
- [ ] Payment flow works (test transaction)
- [ ] Push notifications work

---

## 9. POST-DEPLOYMENT MONITORING

### 9.1 First Hour Monitoring

- [ ] **Server Health:**
  - [ ] CPU usage < 70%
  - [ ] Memory usage < 80%
  - [ ] Disk space sufficient
  - [ ] No crashes (`pm2 status`)

- [ ] **Application Health:**
  - [ ] Error rate < 1%
  - [ ] API response time < 500ms
  - [ ] No 5xx errors
  - [ ] Successful user registrations

- [ ] **Database:**
  - [ ] Connection count normal
  - [ ] No slow queries
  - [ ] No connection errors

### 9.2 First Day Monitoring

- [ ] **User Activity:**
  - [ ] User registrations tracking
  - [ ] Successful logins
  - [ ] Orders being placed
  - [ ] Payments successful

- [ ] **Performance:**
  - [ ] API p95 < 500ms
  - [ ] Database queries optimized
  - [ ] No memory leaks

- [ ] **Errors:**
  - [ ] Review Sentry errors
  - [ ] Check error logs
  - [ ] No critical issues

### 9.3 First Week Monitoring

- [ ] **Metrics:**
  - [ ] Daily active users (DAU)
  - [ ] Conversion rate
  - [ ] Payment success rate
  - [ ] Crash-free rate

- [ ] **Customer Support:**
  - [ ] Support ticket volume
  - [ ] Common user issues
  - [ ] Feature requests

- [ ] **Infrastructure:**
  - [ ] Database size growth
  - [ ] Storage usage
  - [ ] Bandwidth usage
  - [ ] Cost tracking

### 9.4 Monitoring Tools & Alerts

#### Set up alerts for:
- [ ] Server down (pingdom, uptimerobot)
- [ ] CPU > 90% for 5 minutes
- [ ] Memory > 90% for 5 minutes
- [ ] Disk space < 10%
- [ ] Error rate > 5%
- [ ] Payment failure rate > 10%
- [ ] API response time > 1s (p95)
- [ ] Database connection failures

#### Recommended Tools:
- **Uptime Monitoring:** Uptime Robot, Pingdom
- **Application Monitoring:** PM2 Plus, New Relic, DataDog
- **Error Tracking:** Sentry
- **Log Management:** Loggly, Papertrail, CloudWatch
- **Analytics:** Google Analytics, Mixpanel

---

## 10. ROLLBACK PLAN

### 10.1 Criteria for Rollback

Rollback if any of these occur:
- [ ] Critical security vulnerability discovered
- [ ] Payment system not working
- [ ] Error rate > 10%
- [ ] App crashes on launch
- [ ] Database corruption
- [ ] Server repeatedly crashing

### 10.2 Backend Rollback Procedure

```bash
# 1. Stop current version
pm2 stop rezapp-backend

# 2. Revert code
cd /var/www/rezapp-backend
git checkout <previous-stable-commit>
npm install --production
npm run build

# 3. Restore previous .env (if needed)
cp .env.backup .env

# 4. Restart application
pm2 restart rezapp-backend

# 5. Verify
curl https://api.rezapp.com/health
pm2 logs rezapp-backend
```

### 10.3 Database Rollback

- [ ] **Restore from backup:**
  ```bash
  # MongoDB Atlas: Use dashboard to restore point-in-time
  # Self-hosted: Use mongorestore
  mongorestore --uri="<connection-string>" /path/to/backup
  ```

- [ ] **Verify data integrity after restore**

### 10.4 Frontend Rollback

- [ ] **EAS:** Submit previous build to stores
- [ ] **OTA Update:** `eas update --branch production --message "Rollback"`
- [ ] **Communicate to users** if necessary

### 10.5 Post-Rollback

- [ ] Announce rollback to team
- [ ] Investigate root cause
- [ ] Document incident
- [ ] Fix issues before next deployment attempt
- [ ] Update rollback procedure if needed

---

## 11. COMMUNICATION PLAN

### 11.1 Internal Communication

- [ ] **Before Deployment:**
  - [ ] Notify team of deployment schedule
  - [ ] Share deployment checklist status
  - [ ] Assign roles (deployer, monitor, support)

- [ ] **During Deployment:**
  - [ ] Real-time updates in team chat
  - [ ] Status updates every 15 minutes
  - [ ] Immediate notification of issues

- [ ] **After Deployment:**
  - [ ] Deployment summary report
  - [ ] Metrics dashboard shared
  - [ ] Post-mortem if issues occurred

### 11.2 External Communication

- [ ] **Users:**
  - [ ] Scheduled maintenance notice (if needed)
  - [ ] App update available notification
  - [ ] New features announcement

- [ ] **Stakeholders:**
  - [ ] Deployment success confirmation
  - [ ] Initial metrics report
  - [ ] Issues and resolution (if any)

---

## 12. DOCUMENTATION

### 12.1 Required Documentation

- [ ] **API Documentation:**
  - [ ] Swagger/OpenAPI spec
  - [ ] Authentication guide
  - [ ] Error codes reference
  - [ ] Rate limiting details

- [ ] **User Documentation:**
  - [ ] User guide / Help center
  - [ ] FAQs
  - [ ] Video tutorials (optional)

- [ ] **Operations Documentation:**
  - [ ] Deployment procedure
  - [ ] Monitoring setup
  - [ ] Backup and restore procedure
  - [ ] Incident response plan
  - [ ] Common troubleshooting steps

### 12.2 Runbooks

Create runbooks for:
- [ ] Server restart procedure
- [ ] Database restore procedure
- [ ] Payment issue investigation
- [ ] User account recovery
- [ ] Scaling procedure

---

## FINAL SIGN-OFF

### Development Team
- [ ] **Backend Engineer:** __________________ Date: ________
- [ ] **Frontend Engineer:** _________________ Date: ________
- [ ] **QA Engineer:** ______________________ Date: ________
- [ ] **DevOps Engineer:** __________________ Date: ________

### Management
- [ ] **Technical Lead:** ___________________ Date: ________
- [ ] **Product Manager:** __________________ Date: ________
- [ ] **Business Owner:** ___________________ Date: ________

---

## ADDITIONAL RESOURCES

- **Razorpay Production Checklist:** `RAZORPAY_PRODUCTION_CHECKLIST.md`
- **Final Production Status:** `FINAL_PRODUCTION_STATUS.md`
- **API Documentation:** `API_DOCUMENTATION.md` (if available)
- **Stripe Integration:** `STRIPE_INTEGRATION_INSTRUCTIONS.md` (if using Stripe)

---

**Document Version:** 2.0.0
**Last Updated:** January 27, 2025
**Next Review:** Before production deployment

**Note:** This is a comprehensive checklist. Some items may not apply to your specific deployment scenario. Adjust as needed for your infrastructure and requirements.
