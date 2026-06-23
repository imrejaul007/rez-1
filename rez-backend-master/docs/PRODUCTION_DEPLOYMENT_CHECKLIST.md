# REZ App Backend - Production Deployment Checklist

**Prepared:** October 27, 2025
**Current Status:** Staging Ready (80/100)
**Target:** Production Ready (95+/100)

---

## Overview

This checklist will guide you through preparing the REZ App backend for production deployment. Follow each section carefully and check off items as you complete them.

---

## Phase 1: Pre-Deployment Configuration (Critical)

### Environment Variables
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to your production domain(s)
  ```
  CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
  ```
- [ ] Set `DISABLE_RATE_LIMIT=false` to enable rate limiting
- [ ] Set `DEBUG_MODE=false` to disable debug features
- [ ] Verify `JWT_SECRET` is strong (128+ characters)
- [ ] Update `JWT_EXPIRES_IN` if needed (currently 24h)

### Payment Gateway Configuration
- [ ] Switch Stripe to production keys
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
- [ ] Switch Razorpay to production keys (if using)
  ```
  RAZORPAY_KEY_ID=rzp_live_...
  RAZORPAY_KEY_SECRET=...
  RAZORPAY_WEBHOOK_SECRET=...
  ```
- [ ] Configure PayPal production credentials (if using)
- [ ] Test payment gateway webhooks

### SMS & Communication
- [ ] Verify Twilio account is production-ready
- [ ] Check Twilio balance and set up auto-reload
- [ ] Configure SMS rate limits
- [ ] Set up email SMTP (optional backup)
  ```
  SMTP_HOST=smtp.yourprovider.com
  SMTP_PORT=587
  SMTP_USER=your-email@domain.com
  SMTP_PASS=your-app-password
  ```

### Cloud Services
- [ ] Verify Cloudinary production account
- [ ] Set up Cloudinary quotas and limits
- [ ] Configure image optimization settings
- [ ] Set up CDN for Cloudinary (optional)

### Database Configuration
- [ ] Switch to production MongoDB cluster (if different)
- [ ] Update `MONGODB_URI` for production
- [ ] Configure database connection pool
  ```
  DB_MAX_POOL_SIZE=50
  DB_MIN_POOL_SIZE=10
  ```
- [ ] Set up MongoDB Atlas IP whitelist
- [ ] Enable MongoDB Atlas backup
- [ ] Configure database monitoring alerts

---

## Phase 2: Security Hardening (Critical)

### HTTPS & SSL
- [ ] Obtain SSL certificate (Let's Encrypt, Cloudflare, etc.)
- [ ] Configure reverse proxy (Nginx, Apache)
- [ ] Enable HTTPS redirect
- [ ] Set up HTTP Strict Transport Security (HSTS)
- [ ] Test SSL configuration (SSLLabs.com)

### API Security
- [ ] Review and update CORS policy
- [ ] Enable rate limiting
  ```
  RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
  RATE_LIMIT_MAX_REQUESTS=100
  RATE_LIMIT_AUTH_MAX_REQUESTS=5
  ```
- [ ] Set up API key rotation schedule
- [ ] Configure request size limits
- [ ] Enable Helmet.js security headers
- [ ] Set up request logging

### Authentication & Authorization
- [ ] Review JWT token expiration settings
- [ ] Test token refresh flow
- [ ] Verify OTP expiration (currently 5 minutes)
- [ ] Set up session management
- [ ] Configure Redis for session storage (optional)

### Data Protection
- [ ] Review password hashing settings
- [ ] Audit sensitive data storage
- [ ] Configure data encryption at rest
- [ ] Set up secure environment variable management
- [ ] Review API response data (no sensitive info leakage)

### Firewall & Network
- [ ] Configure firewall rules
- [ ] Whitelist necessary IPs
- [ ] Set up DDoS protection (Cloudflare, AWS Shield)
- [ ] Configure VPC/private networking (if using cloud)

---

## Phase 3: Infrastructure Setup (Important)

### Server Configuration
- [ ] Choose hosting provider (AWS, GCP, Azure, DigitalOcean, etc.)
- [ ] Set up production server(s)
- [ ] Configure load balancer (if multiple servers)
- [ ] Set up auto-scaling (if needed)
- [ ] Configure server monitoring

### Redis Setup
- [ ] Install/provision Redis server
- [ ] Update `REDIS_URL` in production
  ```
  REDIS_URL=redis://production-redis:6379
  REDIS_PASSWORD=your-secure-password
  ```
- [ ] Configure Redis persistence
- [ ] Set up Redis monitoring
- [ ] Test Redis connection

### Process Management
- [ ] Install PM2 or equivalent
  ```bash
  npm install -g pm2
  ```
- [ ] Configure PM2 ecosystem file
  ```javascript
  // ecosystem.config.js
  module.exports = {
    apps: [{
      name: 'rez-backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production'
      }
    }]
  }
  ```
- [ ] Set up PM2 startup script
- [ ] Configure log rotation

### Static Assets & CDN
- [ ] Configure CDN for uploaded files
- [ ] Set up CDN for static assets
- [ ] Enable compression
- [ ] Configure cache headers
- [ ] Test CDN integration

---

## Phase 4: Monitoring & Logging (Important)

### Application Monitoring
- [ ] Set up monitoring service (New Relic, Datadog, etc.)
- [ ] Configure application performance monitoring (APM)
- [ ] Set up custom metrics
- [ ] Configure alerting rules
- [ ] Test alert notifications

### Error Tracking
- [ ] Set up error tracking (Sentry, Rollbar, etc.)
- [ ] Configure error notifications
- [ ] Set up error grouping and filtering
- [ ] Test error reporting
- [ ] Configure source maps for stack traces

### Logging
- [ ] Configure production logging
  ```
  LOG_LEVEL=info  # or 'warn' for production
  LOG_FILE=./logs/production.log
  ```
- [ ] Set up log aggregation (ELK, CloudWatch, etc.)
- [ ] Configure log rotation
- [ ] Set up log retention policies
- [ ] Enable structured logging (JSON format)

### Database Monitoring
- [ ] Enable MongoDB Atlas monitoring
- [ ] Configure slow query alerts
- [ ] Set up connection pool monitoring
- [ ] Configure storage alerts
- [ ] Review index usage

### Uptime Monitoring
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot, etc.)
- [ ] Configure health check endpoint monitoring
- [ ] Set up status page (optional)
- [ ] Configure uptime alerts
- [ ] Test alert notifications

---

## Phase 5: Backup & Disaster Recovery (Important)

### Database Backups
- [ ] Enable MongoDB Atlas automatic backups
- [ ] Configure backup retention (30+ days recommended)
- [ ] Set up point-in-time recovery
- [ ] Test backup restoration
- [ ] Document backup restoration procedure

### Application Backups
- [ ] Set up code repository backup
- [ ] Configure environment variables backup
- [ ] Back up uploaded files (Cloudinary backups)
- [ ] Document restoration procedures

### Disaster Recovery Plan
- [ ] Document server setup procedure
- [ ] Create deployment runbook
- [ ] Set up disaster recovery contacts
- [ ] Test recovery procedures
- [ ] Document rollback procedures

---

## Phase 6: Testing & Validation (Critical)

### Pre-Deployment Testing
- [ ] Run comprehensive backend check
  ```bash
  node scripts/comprehensive-backend-check.js
  ```
- [ ] Test all critical API endpoints
- [ ] Test authentication flow
- [ ] Test payment processing
- [ ] Test file uploads
- [ ] Test WebSocket connections

### Load Testing
- [ ] Set up load testing tool (k6, JMeter, Artillery)
- [ ] Test with expected user load
- [ ] Test with 2x expected load
- [ ] Identify bottlenecks
- [ ] Test database under load
- [ ] Test API rate limiting

### Security Testing
- [ ] Run security audit
- [ ] Test for SQL injection (should be protected)
- [ ] Test for XSS vulnerabilities
- [ ] Test authentication/authorization
- [ ] Test for sensitive data exposure
- [ ] Review security headers
- [ ] Test HTTPS configuration

### Integration Testing
- [ ] Test payment gateway integration
- [ ] Test SMS delivery (Twilio)
- [ ] Test file upload (Cloudinary)
- [ ] Test email notifications (if enabled)
- [ ] Test webhook endpoints
- [ ] Test third-party API integrations

---

## Phase 7: Deployment Preparation (Critical)

### Build & Deployment
- [ ] Run TypeScript build
  ```bash
  npm run build
  ```
- [ ] Test built application locally
- [ ] Set up CI/CD pipeline (optional but recommended)
- [ ] Prepare deployment scripts
- [ ] Document deployment procedure

### Database Migration
- [ ] Review data migration needs
- [ ] Test migration scripts
- [ ] Back up production database
- [ ] Run database seeding (if needed)
  ```bash
  npm run seed:critical
  ```
- [ ] Verify data integrity

### DNS & Domain Configuration
- [ ] Configure domain DNS
- [ ] Set up API subdomain (api.yourdomain.com)
- [ ] Configure SSL for domain
- [ ] Test DNS propagation
- [ ] Configure www redirect (if needed)

---

## Phase 8: Go-Live Checklist (Critical)

### Final Checks
- [ ] Review all configuration files
- [ ] Verify all environment variables
- [ ] Test production URL access
- [ ] Test SSL certificate
- [ ] Verify database connection
- [ ] Test Redis connection (if using)

### Deployment Steps
1. [ ] Back up everything (code, database, configs)
2. [ ] Deploy code to production server
3. [ ] Install dependencies
   ```bash
   npm ci --production
   ```
4. [ ] Run database migrations (if any)
5. [ ] Start application with PM2
   ```bash
   pm2 start ecosystem.config.js --env production
   ```
6. [ ] Verify application is running
   ```bash
   pm2 status
   pm2 logs rez-backend
   ```
7. [ ] Test health endpoint
   ```bash
   curl https://api.yourdomain.com/health
   ```

### Post-Deployment Verification
- [ ] Test health check endpoint
- [ ] Test API info endpoint
- [ ] Test authentication flow
- [ ] Test critical API endpoints
- [ ] Verify payment processing
- [ ] Check monitoring dashboards
- [ ] Review logs for errors
- [ ] Test from frontend application

### Monitoring Setup
- [ ] Set up monitoring dashboards
- [ ] Configure alert channels (email, Slack, SMS)
- [ ] Test alert notifications
- [ ] Monitor CPU/memory usage
- [ ] Monitor API response times
- [ ] Monitor error rates

---

## Phase 9: Post-Launch Tasks (First Week)

### Day 1
- [ ] Monitor application closely
- [ ] Watch for errors in logs
- [ ] Monitor performance metrics
- [ ] Check database performance
- [ ] Verify payment transactions
- [ ] Monitor API rate limits

### Day 2-3
- [ ] Review monitoring data
- [ ] Optimize slow endpoints
- [ ] Address any issues found
- [ ] Monitor user feedback
- [ ] Review security logs
- [ ] Check backup completion

### Day 4-7
- [ ] Conduct performance review
- [ ] Analyze usage patterns
- [ ] Optimize database queries
- [ ] Review and adjust rate limits
- [ ] Update documentation
- [ ] Plan improvements

---

## Phase 10: Ongoing Maintenance

### Daily Tasks
- [ ] Review error logs
- [ ] Check monitoring dashboards
- [ ] Verify backup completion
- [ ] Monitor API performance

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Analyze slow queries
- [ ] Check security alerts
- [ ] Review user feedback
- [ ] Update documentation

### Monthly Tasks
- [ ] Review and update dependencies
- [ ] Conduct security audit
- [ ] Optimize database indexes
- [ ] Review and optimize costs
- [ ] Test backup restoration
- [ ] Update disaster recovery plan

### Quarterly Tasks
- [ ] Comprehensive security audit
- [ ] Performance optimization review
- [ ] Infrastructure review
- [ ] Update SSL certificates (if needed)
- [ ] Review and update documentation
- [ ] Conduct load testing

---

## Emergency Contacts & Resources

### Key URLs
- Production API: `https://api.yourdomain.com`
- Health Check: `https://api.yourdomain.com/health`
- Monitoring Dashboard: `[Your monitoring service URL]`
- Error Tracking: `[Your error tracking URL]`

### Service Providers
- **Hosting:** [Provider name and support URL]
- **Database:** MongoDB Atlas (support.mongodb.com)
- **SMS:** Twilio (support.twilio.com)
- **Payments:** Stripe (support.stripe.com), Razorpay
- **Monitoring:** [Your monitoring service]

### Documentation
- Full Report: `BACKEND_VERIFICATION_REPORT.md`
- Quick Summary: `QUICK_STATUS_SUMMARY.md`
- This Checklist: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`

### Commands Reference
```bash
# Check backend status
node scripts/comprehensive-backend-check.js

# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs rez-backend

# Restart application
pm2 restart rez-backend

# Stop application
pm2 stop rez-backend

# Monitor application
pm2 monit
```

---

## Completion Tracker

### Critical Items (Must Complete)
- [ ] Phase 1: Pre-Deployment Configuration (13 items)
- [ ] Phase 2: Security Hardening (20 items)
- [ ] Phase 6: Testing & Validation (17 items)
- [ ] Phase 7: Deployment Preparation (12 items)
- [ ] Phase 8: Go-Live Checklist (23 items)

### Important Items (Should Complete)
- [ ] Phase 3: Infrastructure Setup (19 items)
- [ ] Phase 4: Monitoring & Logging (21 items)
- [ ] Phase 5: Backup & Disaster Recovery (12 items)

### Ongoing Items
- [ ] Phase 9: Post-Launch Tasks (17 items)
- [ ] Phase 10: Ongoing Maintenance (16 items)

---

## Production Readiness Score Calculator

### Scoring
- **Phase 1-2 Complete:** +40 points (Critical)
- **Phase 3-5 Complete:** +30 points (Important)
- **Phase 6-8 Complete:** +20 points (Critical for launch)
- **Monitoring & Testing:** +10 points

### Current Score: 80/100
- ✅ All features implemented
- ✅ Database fully functional
- ✅ All integrations working
- ⚠️  Production hardening needed (-20)

### Target Score: 95+/100
Complete Phases 1-8 of this checklist

---

## Sign-Off

### Pre-Deployment Review
- [ ] Technical Lead reviewed and approved
- [ ] Security team reviewed and approved
- [ ] Infrastructure team reviewed and approved
- [ ] All critical items completed
- [ ] Rollback plan documented

### Post-Deployment Review
- [ ] Application deployed successfully
- [ ] All tests passing
- [ ] Monitoring active and alerting
- [ ] No critical errors in logs
- [ ] Performance within acceptable limits

---

**Ready to Deploy?** Make sure all critical items are checked!

**Questions?** Refer to `BACKEND_VERIFICATION_REPORT.md` for detailed information.

**Last Updated:** October 27, 2025
