# Razorpay Production Deployment Checklist
## REZ App - Pre-Production Verification

---

## Phase 1: Razorpay Account Setup

### 1.1 Account Registration
- [ ] Create Razorpay account at https://razorpay.com
- [ ] Verify email address
- [ ] Complete phone number verification
- [ ] Set up 2FA (Two-Factor Authentication)

### 1.2 KYC (Know Your Customer) Verification
- [ ] Submit business details
  - [ ] Business name
  - [ ] Business type (Proprietorship/Partnership/Pvt Ltd/etc.)
  - [ ] Business address
  - [ ] GST number (if applicable)

- [ ] Upload required documents:
  - [ ] PAN Card (Mandatory)
  - [ ] Aadhaar Card
  - [ ] Business registration certificate
  - [ ] GST certificate (if registered)
  - [ ] Cancelled cheque or bank statement

- [ ] Bank account verification
  - [ ] Add beneficiary bank account
  - [ ] Complete penny drop verification
  - [ ] Verify account holder name matches business

- [ ] Wait for KYC approval (usually 24-48 hours)

### 1.3 Get API Credentials
- [ ] Login to Razorpay Dashboard
- [ ] Navigate to Settings > API Keys
- [ ] Generate Test Keys
  - [ ] Copy Test Key ID (starts with `rzp_test_`)
  - [ ] Copy Test Key Secret (keep secure!)
- [ ] After KYC approval, generate Live Keys
  - [ ] Copy Live Key ID (starts with `rzp_live_`)
  - [ ] Copy Live Key Secret (keep very secure!)

---

## Phase 2: Development & Testing

### 2.1 Install Dependencies
- [ ] Frontend: `npm install react-native-razorpay`
- [ ] Backend: Verify `razorpay` package (already installed)
- [ ] For Expo: Set up expo-dev-client if needed

### 2.2 Configure Environment Variables

**Frontend (.env):**
```env
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

**Backend (.env):**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxx
```

- [ ] Add test credentials to .env files
- [ ] Verify credentials are loaded correctly
- [ ] Test environment variable access

### 2.3 Test Payment Flow

#### Test Card Payments:
- [ ] Test successful payment (Card: 4111 1111 1111 1111)
- [ ] Test failed payment (Card: 4000 0000 0000 0002)
- [ ] Test 3D Secure authentication
- [ ] Verify order creation on backend
- [ ] Verify payment signature verification
- [ ] Verify order status update
- [ ] Verify stock deduction
- [ ] Verify cart clearing

#### Test UPI Payments:
- [ ] Test successful UPI (VPA: success@razorpay)
- [ ] Test failed UPI (VPA: failure@razorpay)
- [ ] Test UPI timeout scenario

#### Test Net Banking:
- [ ] Test with test bank credentials
- [ ] Verify redirect flow
- [ ] Test success scenario
- [ ] Test failure scenario

#### Test Wallets:
- [ ] Test Paytm wallet
- [ ] Test PhonePe wallet
- [ ] Test other supported wallets

### 2.4 Error Handling Tests
- [ ] Test network failure during payment
- [ ] Test payment timeout
- [ ] Test user cancellation
- [ ] Test invalid signature
- [ ] Test duplicate payment verification
- [ ] Test insufficient balance
- [ ] Test backend downtime scenario

### 2.5 Webhook Testing
- [ ] Set up ngrok for local testing
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Test `payment.captured` event
- [ ] Test `payment.failed` event
- [ ] Test `order.paid` event
- [ ] Verify webhook signature verification
- [ ] Test webhook retry mechanism
- [ ] Verify idempotency (duplicate webhooks handled correctly)

---

## Phase 3: Security Audit

### 3.1 Credential Security
- [ ] Verify API secrets are not in frontend code
- [ ] Verify API secrets are not committed to Git
- [ ] Use environment variables for all secrets
- [ ] Set up .env.example with placeholder values
- [ ] Add .env to .gitignore

### 3.2 Payment Security
- [ ] Verify signature verification is mandatory
- [ ] Verify payment amount cannot be manipulated
- [ ] Verify order ID validation on backend
- [ ] Verify user authorization for orders
- [ ] Implement rate limiting on payment endpoints
- [ ] Add CAPTCHA for repeated payment failures
- [ ] Log all payment attempts for audit

### 3.3 API Security
- [ ] All payment APIs use HTTPS only
- [ ] Implement proper authentication
- [ ] Validate all input parameters
- [ ] Sanitize user inputs
- [ ] Implement CORS correctly
- [ ] Add security headers (Helmet.js)
- [ ] Set up API rate limiting

### 3.4 Database Security
- [ ] Use transactions for payment operations
- [ ] Implement proper error rollback
- [ ] Prevent SQL injection (using Mongoose)
- [ ] Encrypt sensitive data at rest
- [ ] Regular database backups
- [ ] Set up point-in-time recovery

---

## Phase 4: Performance & Reliability

### 4.1 Performance Tests
- [ ] Test payment flow with slow network
- [ ] Test concurrent payments
- [ ] Test high load scenarios
- [ ] Optimize database queries
- [ ] Implement caching where appropriate
- [ ] Test mobile app performance

### 4.2 Reliability Tests
- [ ] Test payment with backend restart mid-transaction
- [ ] Test payment with database connection loss
- [ ] Test webhook delivery failures
- [ ] Verify payment recovery mechanisms
- [ ] Test manual payment reconciliation

### 4.3 Monitoring Setup
- [ ] Set up error tracking (Sentry/Bugsnag)
- [ ] Set up application monitoring (New Relic/DataDog)
- [ ] Configure payment alerts
- [ ] Set up Razorpay dashboard alerts
- [ ] Create monitoring dashboard
- [ ] Set up on-call rotation for payment issues

---

## Phase 5: Production Configuration

### 5.1 Update Production Environment Variables

**Frontend (.env.production):**
```env
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

**Backend (.env.production):**
```env
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=live_secret_xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=live_webhook_secret_xxxxxxxxxx
```

- [ ] Replace all test credentials with live credentials
- [ ] Verify production API base URL
- [ ] Verify webhook URL is production URL
- [ ] Remove debug logs for production

### 5.2 Razorpay Dashboard Configuration
- [ ] Update webhook URL to production
  - URL: `https://yourdomain.com/api/payment/webhook`
  - Events: `payment.captured`, `payment.failed`, `order.paid`
- [ ] Set up email notifications
- [ ] Configure settlement schedule
- [ ] Set up refund policies
- [ ] Add team members with appropriate roles
- [ ] Configure payment methods to enable
- [ ] Set transaction limits if needed

### 5.3 DNS & SSL Setup
- [ ] Point domain to production server
- [ ] Set up SSL certificate (Let's Encrypt/CloudFlare)
- [ ] Verify HTTPS is working
- [ ] Test SSL certificate validity
- [ ] Set up certificate auto-renewal

---

## Phase 6: Compliance & Legal

### 6.1 Legal Requirements
- [ ] Privacy Policy updated with payment information
- [ ] Terms of Service include payment terms
- [ ] Refund policy documented
- [ ] Cancellation policy documented
- [ ] Display payment gateway information
- [ ] Add Razorpay logo/branding (as per agreement)

### 6.2 PCI Compliance
- [ ] Verify no card data is stored
- [ ] Verify no CVV is stored
- [ ] All payment data goes through Razorpay
- [ ] Use Razorpay's hosted checkout
- [ ] Do not log sensitive payment info

### 6.3 Tax Compliance
- [ ] Configure tax settings in Razorpay
- [ ] Set up GST if applicable
- [ ] Configure invoice generation
- [ ] Set up automatic TDS deduction

---

## Phase 7: User Experience

### 7.1 Payment UI/UX
- [ ] Clear payment amount display
- [ ] Supported payment methods clearly shown
- [ ] Loading states for all payment steps
- [ ] Clear error messages
- [ ] Success confirmation screen
- [ ] Email/SMS confirmation sent
- [ ] Order tracking available
- [ ] Payment receipt downloadable

### 7.2 User Support
- [ ] Payment FAQ page created
- [ ] Support contact information visible
- [ ] Live chat support available
- [ ] Email support for payment issues
- [ ] Phone support for critical issues
- [ ] Self-service refund option

---

## Phase 8: Launch Preparation

### 8.1 Final Testing
- [ ] Complete end-to-end test in production environment
- [ ] Test all payment methods in production
- [ ] Verify webhook delivery in production
- [ ] Test refund flow
- [ ] Test customer notifications
- [ ] Verify settlement in bank account

### 8.2 Team Training
- [ ] Train support team on payment issues
- [ ] Document payment troubleshooting steps
- [ ] Create runbook for common issues
- [ ] Set up escalation process
- [ ] Train team on Razorpay dashboard

### 8.3 Rollback Plan
- [ ] Document rollback procedure
- [ ] Keep previous version accessible
- [ ] Plan for handling in-flight transactions
- [ ] Set up feature flag for payment gateway
- [ ] Test rollback procedure

---

## Phase 9: Post-Launch

### 9.1 First Week Monitoring
- [ ] Monitor payment success rate
- [ ] Track failed payments
- [ ] Review error logs daily
- [ ] Check webhook delivery status
- [ ] Monitor settlement reports
- [ ] Review customer support tickets

### 9.2 Weekly Reviews
- [ ] Analyze payment metrics
- [ ] Review refund requests
- [ ] Check for unusual patterns
- [ ] Update documentation as needed
- [ ] Optimize payment flow based on data

### 9.3 Monthly Tasks
- [ ] Reconcile Razorpay settlements with bank
- [ ] Review payment gateway fees
- [ ] Analyze payment method preferences
- [ ] Update payment method offerings
- [ ] Review security audit logs

---

## Phase 10: Ongoing Maintenance

### 10.1 Regular Updates
- [ ] Keep Razorpay SDK updated
- [ ] Monitor Razorpay API changes
- [ ] Update webhook handlers as needed
- [ ] Review and update security practices
- [ ] Regular penetration testing

### 10.2 Compliance
- [ ] Annual security audit
- [ ] Review PCI compliance
- [ ] Update legal documents
- [ ] Review tax settings
- [ ] Renew SSL certificates

---

## Quick Reference: Test Credentials

### Test Cards
```
Success: 4111 1111 1111 1111, CVV: 123, Expiry: Any future date
Failure: 4000 0000 0000 0002, CVV: 123, Expiry: Any future date
```

### Test UPI
```
Success: success@razorpay
Failure: failure@razorpay
```

### Test Net Banking
Use credentials provided on Razorpay payment page

---

## Emergency Contacts

- **Razorpay Support**: support@razorpay.com
- **Razorpay Phone**: 1800-103-8800
- **Technical Issues**: tech-support@razorpay.com
- **Razorpay Status**: https://status.razorpay.com

---

## Important Links

- **Dashboard**: https://dashboard.razorpay.com
- **API Docs**: https://razorpay.com/docs/api
- **Integration Guide**: https://razorpay.com/docs/payment-gateway/web-integration/standard
- **Webhook Docs**: https://razorpay.com/docs/webhooks
- **Community**: https://razorpay.com/community

---

**Last Updated**: 2025-01-24
**Version**: 1.0
**Status**: Ready for Production

---

## Sign-off

- [ ] Development Team Lead
- [ ] Backend Engineer
- [ ] Frontend Engineer
- [ ] QA Engineer
- [ ] Security Team
- [ ] Product Manager
- [ ] Business Owner

---

**Note**: Complete ALL items in this checklist before going live with Razorpay payments in production.
