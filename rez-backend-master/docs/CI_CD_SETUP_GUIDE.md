# CI/CD Pipeline Setup Guide

## Overview

GitHub Actions CI/CD pipeline is configured for automated testing, building, and deployment.

---

## Pipeline Stages

### 1. Lint & Type Check
- **Trigger:** On every push and PR
- **Actions:**
  - Checkout code
  - Install dependencies
  - Run linter (if configured)
  - Type check with TypeScript

### 2. Unit Tests
- **Trigger:** On every push and PR
- **Services:** MongoDB
- **Actions:**
  - Run unit tests
  - Generate coverage report
  - Upload to Codecov

### 3. Integration Tests
- **Trigger:** On every push and PR
- **Services:** MongoDB, Redis
- **Actions:**
  - Build application
  - Run integration tests

### 4. E2E Tests
- **Trigger:** On every push and PR
- **Services:** MongoDB, Redis
- **Actions:**
  - Start server
  - Run E2E tests
  - Stop server

### 5. Security Audit
- **Trigger:** On every push and PR
- **Actions:**
  - Run `npm audit`
  - Run Snyk security scan (if token configured)

### 6. Build
- **Trigger:** After lint and unit tests pass
- **Actions:**
  - Build TypeScript
  - Upload build artifacts

### 7. Deploy to Staging
- **Trigger:** Push to `develop` branch
- **Conditions:** All tests pass
- **Actions:**
  - Download build artifacts
  - Deploy to staging environment

### 8. Deploy to Production
- **Trigger:** Push to `main` branch
- **Conditions:** All tests pass
- **Actions:**
  - Download build artifacts
  - Deploy to production
  - Health check

---

## Setup Instructions

### 1. Enable GitHub Actions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Enable **Allow all actions and reusable workflows**

### 2. Configure Secrets (Optional)

For production deployments, add secrets in **Settings** → **Secrets and variables** → **Actions**:

- `SNYK_TOKEN` - For Snyk security scanning (optional)
- `DEPLOY_SSH_KEY` - SSH key for server deployment (if needed)
- `DEPLOY_HOST` - Deployment server hostname
- `DEPLOY_USER` - Deployment server username

### 3. Configure Environments

1. Go to **Settings** → **Environments**
2. Create `staging` environment
3. Create `production` environment
4. Add environment-specific secrets if needed

### 4. Customize Deployment Steps

Edit `.github/workflows/ci-cd.yml` and update the deployment steps:

```yaml
- name: Deploy to staging
  run: |
    # Add your deployment commands here
    # Example:
    ssh user@staging-server "cd /app && git pull && npm install && pm2 restart app"
```

---

## Workflow Triggers

### Automatic Triggers:
- **Push to `main`:** Full pipeline + production deployment
- **Push to `develop`:** Full pipeline + staging deployment
- **Pull Request:** Full pipeline (no deployment)

### Manual Triggers:
You can also trigger workflows manually from GitHub Actions tab.

---

## Pipeline Status

Check pipeline status:
1. Go to **Actions** tab in GitHub
2. View workflow runs
3. Click on a run to see detailed logs

---

## Troubleshooting

### Tests Failing
1. Check test logs in Actions tab
2. Run tests locally: `npm run test:unit`
3. Verify environment variables are set correctly

### Build Failing
1. Check TypeScript errors: `npm run build`
2. Verify all dependencies are installed
3. Check for missing type definitions

### Deployment Failing
1. Verify deployment credentials
2. Check server connectivity
3. Review deployment logs
4. Ensure server has required dependencies

---

## Best Practices

1. **Always test locally first**
2. **Keep deployment steps idempotent**
3. **Use environment-specific configurations**
4. **Monitor deployment health checks**
5. **Keep secrets secure**
6. **Document deployment procedures**

---

## Next Steps

1. ✅ CI/CD pipeline configured
2. ⏳ Test pipeline with a test commit
3. ⏳ Configure deployment credentials
4. ⏳ Set up staging environment
5. ⏳ Configure production deployment

---

**Status:** ✅ CI/CD Pipeline Configured
**File:** `.github/workflows/ci-cd.yml`
**Last Updated:** $(date)

