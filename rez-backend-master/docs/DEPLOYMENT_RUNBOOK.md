# Deployment Runbook

## Overview

Complete deployment procedures for staging and production environments.

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No critical security issues
- [ ] Documentation updated

### 2. Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load tests completed (if major changes)

### 3. Database
- [ ] Migrations tested
- [ ] Backup created
- [ ] Rollback plan prepared

### 4. Configuration
- [ ] Environment variables updated
- [ ] Secrets rotated (if needed)
- [ ] Third-party services configured

---

## Deployment Procedures

### Staging Deployment

#### Automated (Recommended)
1. Push to `develop` branch
2. CI/CD pipeline automatically:
   - Runs tests
   - Builds application
   - Deploys to staging
   - Runs health checks

#### Manual
```bash
# 1. Checkout develop branch
git checkout develop
git pull origin develop

# 2. Install dependencies
npm ci

# 3. Run tests
npm run test:unit
npm run test:integration

# 4. Build
npm run build

# 5. Deploy to staging server
scp -r dist/ user@staging-server:/app/
ssh user@staging-server "cd /app && pm2 restart rezapp-staging"

# 6. Verify deployment
curl https://staging-api.rezapp.com/health
```

---

### Production Deployment

#### Automated (Recommended)
1. Merge to `main` branch
2. CI/CD pipeline automatically:
   - Runs all tests
   - Security audit
   - Builds application
   - Deploys to production
   - Health checks
   - Post-deployment verification

#### Manual
```bash
# 1. Create backup
./scripts/backup-database.sh

# 2. Checkout main branch
git checkout main
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run all tests
npm run test:unit
npm run test:integration
npm run test:e2e-merchant

# 5. Security audit
npm audit --audit-level=high

# 6. Build
npm run build

# 7. Run database migrations (if any)
npm run migrate

# 8. Deploy to production server
scp -r dist/ user@prod-server:/app/
ssh user@prod-server "cd /app && pm2 restart rezapp-production"

# 9. Health check
curl https://api.rezapp.com/health

# 10. Monitor logs
ssh user@prod-server "tail -f /app/logs/combined.log"
```

---

## Rollback Procedures

### Quick Rollback (Last Deployment)

```bash
# 1. Stop current version
ssh user@server "pm2 stop rezapp-production"

# 2. Restore previous version
ssh user@server "cd /app && git checkout <previous-commit> && npm run build"

# 3. Restart
ssh user@server "pm2 start rezapp-production"

# 4. Verify
curl https://api.rezapp.com/health
```

### Database Rollback

```bash
# 1. Stop application
pm2 stop rezapp-production

# 2. Restore database
./scripts/restore-database.sh backups/backup_rezapp_YYYYMMDD_HHMMSS.tar.gz --drop

# 3. Restart application
pm2 start rezapp-production

# 4. Verify
curl https://api.rezapp.com/health
```

---

## Post-Deployment Verification

### 1. Health Checks
```bash
# Application health
curl https://api.rezapp.com/health

# Database connectivity
curl https://api.rezapp.com/health/db

# Redis connectivity
curl https://api.rezapp.com/health/redis
```

### 2. Smoke Tests
```bash
# Test key endpoints
curl https://api.rezapp.com/api/products
curl https://api.rezapp.com/api/categories
curl https://api.rezapp.com/api/stores
```

### 3. Monitor Logs
```bash
# Application logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log

# Check Sentry for errors
```

### 4. Performance Monitoring
- Check response times
- Monitor error rates
- Check database performance
- Monitor Redis usage

---

## Emergency Procedures

### Server Down

1. **Check Server Status**
   ```bash
   ssh user@server "pm2 status"
   ```

2. **Check Logs**
   ```bash
   ssh user@server "pm2 logs rezapp-production --lines 100"
   ```

3. **Restart Application**
   ```bash
   ssh user@server "pm2 restart rezapp-production"
   ```

4. **If Restart Fails**
   ```bash
   # Check system resources
   ssh user@server "htop"
   
   # Check disk space
   ssh user@server "df -h"
   
   # Check database
   ssh user@server "mongosh $MONGODB_URI --eval 'db.adminCommand("ping")'"
   ```

### Database Issues

1. **Check Database Connection**
   ```bash
   mongosh $MONGODB_URI --eval 'db.adminCommand("ping")'
   ```

2. **Check Database Status**
   ```bash
   mongosh $MONGODB_URI --eval 'db.stats()'
   ```

3. **Restore from Backup**
   ```bash
   ./scripts/restore-database.sh <backup_file> --drop
   ```

### High Error Rate

1. **Check Error Logs**
   ```bash
   tail -f logs/error.log
   ```

2. **Check Sentry**
   - Review recent errors
   - Identify patterns
   - Check for spikes

3. **Rollback if Critical**
   ```bash
   # Follow rollback procedures
   ```

---

## Monitoring Checklist

### Immediate (First 15 minutes)
- [ ] Health checks passing
- [ ] No error spikes in logs
- [ ] Response times normal
- [ ] Database queries normal

### Short-term (First hour)
- [ ] No critical errors
- [ ] Performance stable
- [ ] User reports (if any)
- [ ] Third-party services working

### Long-term (First 24 hours)
- [ ] Error rates normal
- [ ] Performance metrics stable
- [ ] No memory leaks
- [ ] Database performance stable

---

## Communication

### Before Deployment
- Notify team of deployment
- Schedule maintenance window (if needed)
- Prepare rollback plan

### During Deployment
- Monitor deployment progress
- Watch for errors
- Be ready to rollback

### After Deployment
- Verify deployment success
- Monitor for issues
- Communicate status to team

---

## Best Practices

1. **Always test in staging first**
2. **Create backups before production**
3. **Deploy during low-traffic periods**
4. **Monitor closely after deployment**
5. **Have rollback plan ready**
6. **Document any issues**
7. **Keep deployment logs**

---

## Troubleshooting

### Build Fails
- Check TypeScript errors
- Verify dependencies
- Check Node.js version

### Tests Fail
- Review test logs
- Check environment variables
- Verify test data

### Deployment Fails
- Check server connectivity
- Verify permissions
- Check disk space
- Review server logs

### Application Crashes
- Check application logs
- Review error logs
- Check system resources
- Verify database connection

---

## Contact Information

### On-Call Engineer
- Primary: [Contact Info]
- Secondary: [Contact Info]

### Escalation
- Team Lead: [Contact Info]
- DevOps: [Contact Info]

---

**Status:** ✅ Deployment Runbook Complete
**Last Updated:** $(date)
**Version:** 1.0

