# Production Deployment Checklist

## Pre-Deployment (1 week before)

### Code Quality
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage > 80%
- [ ] No critical or high-severity security vulnerabilities
- [ ] All ESLint warnings resolved
- [ ] TypeScript strict mode enabled and passing
- [ ] Code review completed by at least 2 developers
- [ ] Performance benchmarks met (response time < 200ms for 95% of requests)

### Testing
- [ ] Load testing completed in staging (1000+ concurrent users)
- [ ] Stress testing completed (identify breaking point)
- [ ] Security audit completed (OWASP Top 10 checked)
- [ ] Penetration testing completed
- [ ] API contract testing passed
- [ ] Integration tests with external services (Razorpay, Twilio, SendGrid)
- [ ] Database migration tested on staging data

### Documentation
- [ ] API documentation up to date (Swagger/OpenAPI)
- [ ] Deployment runbook created
- [ ] Rollback procedures documented
- [ ] Incident response plan ready
- [ ] README updated with production setup
- [ ] Environment variables documented
- [ ] Troubleshooting guide created

## Environment Setup (3 days before)

### Infrastructure
- [ ] Production servers provisioned (Kubernetes cluster)
- [ ] Load balancer configured
- [ ] Auto-scaling rules configured (HPA)
- [ ] SSL/TLS certificates installed and verified
- [ ] Domain DNS configured and propagated
- [ ] Firewall rules configured (whitelist only necessary ports)
- [ ] VPC/Network security groups configured

### Database
- [ ] MongoDB Atlas production cluster provisioned (M30 or higher)
- [ ] Database indexes created and optimized
- [ ] Connection pooling configured (min: 10, max: 100)
- [ ] Replica set with minimum 3 nodes
- [ ] Automated failover tested
- [ ] Point-in-time recovery enabled
- [ ] Database user with least privilege created

### Cache & Session
- [ ] Redis cluster provisioned (with replication)
- [ ] Redis persistence configured (AOF + RDB)
- [ ] Redis password set
- [ ] Connection timeout configured
- [ ] Memory eviction policy set (allkeys-lru)

### External Services
- [ ] Cloudinary production account configured
- [ ] Cloudinary upload presets created
- [ ] SendGrid production API key obtained
- [ ] SendGrid sender email verified
- [ ] Twilio production credentials configured
- [ ] Twilio phone number verified
- [ ] Razorpay live mode enabled
- [ ] Razorpay webhooks configured
- [ ] All API rate limits reviewed

### Environment Variables
- [ ] `.env.production` created from `.env.production.example`
- [ ] All secrets generated (JWT, encryption keys)
- [ ] Kubernetes secrets created
- [ ] Secrets stored in secure vault (AWS Secrets Manager / HashiCorp Vault)
- [ ] No secrets in git repository
- [ ] CORS origins configured correctly
- [ ] Allowed origins whitelist updated

### Monitoring & Logging
- [ ] Sentry project created and DSN configured
- [ ] New Relic account setup (or alternative APM)
- [ ] Log aggregation configured (ELK Stack / CloudWatch)
- [ ] Custom dashboards created
- [ ] Alert rules configured (error rate, response time, CPU, memory)
- [ ] PagerDuty/On-call rotation setup
- [ ] Status page setup (statuspage.io or similar)

### CDN & Assets
- [ ] CDN configured for static assets
- [ ] Image optimization pipeline verified
- [ ] Compression enabled (gzip/brotli)
- [ ] Cache headers configured

### Backup & Recovery
- [ ] Automated backup schedule configured (daily at 2 AM UTC)
- [ ] Backup restoration tested
- [ ] S3 bucket for backups created
- [ ] Backup retention policy set (30 days)
- [ ] Disaster recovery plan documented

## Infrastructure (2 days before)

### Docker
- [ ] Dockerfile optimized (multi-stage build)
- [ ] Docker image built and scanned for vulnerabilities
- [ ] Image size optimized (< 500MB)
- [ ] Health checks configured
- [ ] Non-root user configured
- [ ] .dockerignore configured

### Kubernetes
- [ ] Deployment manifest validated
- [ ] Service manifest validated
- [ ] HPA manifest validated
- [ ] Resource limits configured (CPU, memory)
- [ ] Liveness probe configured
- [ ] Readiness probe configured
- [ ] Persistent volume claims created
- [ ] ConfigMaps created
- [ ] Secrets created
- [ ] Network policies configured
- [ ] Pod security policies configured

### CI/CD Pipeline
- [ ] GitHub Actions workflow tested
- [ ] Staging deployment successful
- [ ] Production deployment workflow tested (without executing)
- [ ] Docker registry credentials configured
- [ ] Kubernetes credentials configured
- [ ] Automated tests in pipeline passing
- [ ] Build artifacts stored securely

## Pre-Deployment Testing (1 day before)

### Staging Environment
- [ ] Full production data replicated to staging
- [ ] Run complete smoke test suite
- [ ] Test all critical user flows
- [ ] Test payment processing (test mode)
- [ ] Test email/SMS notifications
- [ ] Test file uploads
- [ ] Test authentication flows
- [ ] Test API rate limiting
- [ ] Test error handling
- [ ] Test database migrations

### Performance Testing
- [ ] Load test with production-like traffic
- [ ] Verify response times under load
- [ ] Verify database query performance
- [ ] Verify cache hit rates
- [ ] Check for memory leaks
- [ ] Check for connection pool exhaustion

### Security Testing
- [ ] SQL injection tests
- [ ] XSS tests
- [ ] CSRF protection verified
- [ ] Rate limiting verified
- [ ] Authentication tests
- [ ] Authorization tests
- [ ] Sensitive data encryption verified

## Deployment Day

### Pre-Deployment (2 hours before)
- [ ] Announce maintenance window to users (if applicable)
- [ ] Notify team members
- [ ] Verify all team members available
- [ ] Create database backup
- [ ] Tag release in git
- [ ] Create rollback plan document
- [ ] Verify rollback procedure tested

### Deployment Execution
- [ ] Put staging in maintenance mode (test)
- [ ] Run database migrations on staging
- [ ] Verify staging still works
- [ ] Deploy to production (blue-green deployment)
- [ ] Run database migrations on production
- [ ] Verify deployment status (kubectl get pods)
- [ ] Verify all pods running
- [ ] Verify service endpoints accessible

### Post-Deployment Verification (30 minutes)
- [ ] Run health check endpoint
- [ ] Test critical API endpoints
- [ ] Test user authentication
- [ ] Test product creation
- [ ] Test order placement
- [ ] Test payment processing (small test transaction)
- [ ] Test notifications (email/SMS)
- [ ] Test file upload
- [ ] Verify external integrations (Razorpay, Cloudinary, etc.)
- [ ] Check error logs (no critical errors)
- [ ] Verify metrics dashboards

### Monitoring (First 2 hours)
- [ ] Monitor error rates (should be < 0.1%)
- [ ] Monitor response times (p95 < 300ms)
- [ ] Monitor CPU usage (should be < 70%)
- [ ] Monitor memory usage (should be < 80%)
- [ ] Monitor database connections
- [ ] Monitor Redis connections
- [ ] Monitor request rate
- [ ] Check for any anomalies

## Post-Deployment (24 hours)

### Continuous Monitoring
- [ ] Monitor error logs every 2 hours
- [ ] Check performance dashboards
- [ ] Verify all external integrations working
- [ ] Monitor database performance
- [ ] Monitor cache performance
- [ ] Check backup completion

### User Feedback
- [ ] Collect user feedback
- [ ] Monitor support tickets
- [ ] Check for reported issues
- [ ] Test user-facing features manually

### Performance Analysis
- [ ] Analyze response time trends
- [ ] Analyze error rate trends
- [ ] Analyze database query performance
- [ ] Analyze cache hit rates
- [ ] Identify bottlenecks

### Documentation
- [ ] Document any issues encountered
- [ ] Document any manual interventions
- [ ] Update runbook with lessons learned
- [ ] Create post-mortem if issues occurred

## Post-Deployment (1 week)

### Stability
- [ ] No critical bugs reported
- [ ] Error rate stable and low
- [ ] Performance metrics stable
- [ ] No memory leaks
- [ ] No database issues

### Optimization
- [ ] Identify optimization opportunities
- [ ] Plan performance improvements
- [ ] Review and adjust auto-scaling thresholds
- [ ] Review and adjust cache TTLs
- [ ] Review and adjust rate limits

### Cleanup
- [ ] Remove old deployments
- [ ] Clean up old Docker images
- [ ] Archive old logs
- [ ] Update documentation

## Emergency Contacts

- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Backend Lead**: [Name] - [Phone] - [Email]
- **Database Admin**: [Name] - [Phone] - [Email]
- **On-call Engineer**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

## Rollback Triggers

Initiate rollback if:
- Error rate > 5%
- Response time p95 > 1000ms
- Critical feature completely broken
- Data corruption detected
- Security breach detected
- Database connection failures
- More than 50% of requests failing

## Success Criteria

Deployment is successful if after 24 hours:
- [ ] Error rate < 0.1%
- [ ] Response time p95 < 300ms
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] All critical features working
- [ ] No critical bugs reported
- [ ] All external integrations working
- [ ] Database performance stable
- [ ] No data loss or corruption
