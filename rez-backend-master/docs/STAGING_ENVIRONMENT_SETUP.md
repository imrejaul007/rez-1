# Staging Environment Setup Guide

## Overview

Complete guide for setting up and managing the staging environment.

---

## Prerequisites

1. **Separate MongoDB Database**
   - Create `rezapp_staging` database
   - Use separate MongoDB instance or cluster

2. **Separate Redis Instance**
   - Use separate Redis instance or database number

3. **Staging Domain/URL**
   - Configure staging domain (e.g., `staging-api.rezapp.com`)
   - Set up DNS records

---

## Setup Steps

### 1. Create Staging Environment File

```bash
cp .env.staging .env.staging.local
# Edit .env.staging.local with actual staging values
```

### 2. Configure Database

**Option A: Local MongoDB**
```bash
# Create staging database
mongosh
use rezapp_staging
```

**Option B: MongoDB Atlas**
1. Create new cluster for staging
2. Update `MONGODB_URI` in `.env.staging.local`
3. Whitelist staging server IP

### 3. Configure Redis

**Option A: Local Redis**
```bash
# Use different database number
REDIS_DB=1
```

**Option B: Redis Cloud**
1. Create separate Redis instance
2. Update `REDIS_URL` in `.env.staging.local`

### 4. Configure Third-Party Services

#### SendGrid
- Create staging API key
- Use staging email templates
- Update `SENDGRID_API_KEY`

#### Twilio
- Use test credentials for staging
- Update `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

#### Payment Gateways
- **Razorpay:** Use test mode keys
- **Stripe:** Use test mode keys (`sk_test_...`)

#### Cloudinary
- Create staging cloud
- Update Cloudinary credentials

#### Sentry
- Create staging project
- Get staging DSN
- Update `SENTRY_DSN`

### 5. Seed Staging Data

```bash
# Load staging environment
export $(cat .env.staging.local | xargs)

# Seed database
npm run seed:all
```

### 6. Start Staging Server

```bash
# Load staging environment
export $(cat .env.staging.local | xargs)

# Start server
npm run dev
# Or for production mode:
NODE_ENV=staging npm start
```

---

## Environment Variables

Key differences from production:

| Variable | Staging | Production |
|----------|---------|------------|
| `NODE_ENV` | `staging` | `production` |
| `MONGODB_URI` | `rezapp_staging` | `rezapp` |
| `SENTRY_ENVIRONMENT` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` |
| Payment Keys | Test keys | Live keys |

---

## Deployment to Staging

### Manual Deployment

```bash
# Build
npm run build

# Copy files to staging server
scp -r dist/ user@staging-server:/app/

# SSH to staging server
ssh user@staging-server

# Restart application
cd /app
pm2 restart rezapp-staging
```

### Automated Deployment

Staging deploys automatically on push to `develop` branch via CI/CD pipeline.

---

## Testing in Staging

### 1. Health Check
```bash
curl https://staging-api.rezapp.com/health
```

### 2. API Testing
```bash
# Test endpoints
curl https://staging-api.rezapp.com/api/products
```

### 3. E2E Testing
```bash
BASE_URL=https://staging-api.rezapp.com npm run test:e2e-merchant
```

---

## Monitoring

### 1. Application Logs
```bash
# On staging server
tail -f logs/combined.log
```

### 2. Error Tracking
- Check Sentry for staging errors
- Filter by environment: `staging`

### 3. Performance Monitoring
- Monitor response times
- Check database performance
- Monitor Redis usage

---

## Data Management

### Reset Staging Data
```bash
# Drop staging database
mongosh rezapp_staging --eval "db.dropDatabase()"

# Reseed
npm run seed:all
```

### Backup Staging
```bash
# Use backup script with staging database
DATABASE_NAME=rezapp_staging ./scripts/backup-database.sh
```

---

## Best Practices

1. **Keep staging close to production**
   - Use same database structure
   - Use similar data volumes
   - Test with realistic data

2. **Regular Updates**
   - Keep staging in sync with production
   - Test new features in staging first
   - Verify migrations work

3. **Security**
   - Use test payment keys
   - Don't expose real credentials
   - Limit access to staging

4. **Documentation**
   - Document staging-specific configurations
   - Keep deployment procedures updated
   - Document known issues

---

## Troubleshooting

### Database Connection Issues
1. Verify MongoDB URI
2. Check network connectivity
3. Verify credentials
4. Check firewall rules

### Redis Connection Issues
1. Verify Redis URL
2. Check Redis is running
3. Verify database number
4. Check authentication

### Deployment Issues
1. Check build succeeds
2. Verify environment variables
3. Check server logs
4. Verify dependencies installed

---

## Next Steps

1. ✅ Staging environment file created
2. ⏳ Configure staging database
3. ⏳ Set up staging domain
4. ⏳ Configure third-party services
5. ⏳ Test staging deployment

---

**Status:** ✅ Staging Environment Configuration Ready
**File:** `.env.staging`
**Last Updated:** $(date)

