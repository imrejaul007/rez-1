#!/bin/bash

# Security Audit Script
# Runs automated security checks

set -e

echo "🔒 Starting Security Audit..."
echo ""

# Create reports directory
mkdir -p security-reports
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. npm Audit
echo "📦 Running npm audit..."
npm audit --audit-level=high > "security-reports/npm-audit-${TIMESTAMP}.txt" 2>&1 || true
npm audit --json > "security-reports/npm-audit-${TIMESTAMP}.json" 2>&1 || true
echo "✅ npm audit complete"

# 2. Check for exposed secrets
echo "🔍 Checking for exposed secrets..."
grep -r "password\|secret\|key\|token" .env* --exclude-dir=node_modules 2>/dev/null | \
    grep -v "JWT_SECRET\|API_KEY\|AUTH_TOKEN" > "security-reports/exposed-secrets-${TIMESTAMP}.txt" || \
    echo "No obvious secrets found in .env files" > "security-reports/exposed-secrets-${TIMESTAMP}.txt"
echo "✅ Secret check complete"

# 3. Check for hardcoded secrets in code
echo "🔍 Checking for hardcoded secrets in code..."
grep -r "password.*=.*['\"].*['\"]" src/ --exclude-dir=node_modules 2>/dev/null > "security-reports/hardcoded-secrets-${TIMESTAMP}.txt" || \
    echo "No hardcoded secrets found" > "security-reports/hardcoded-secrets-${TIMESTAMP}.txt"
echo "✅ Hardcoded secret check complete"

# 4. Snyk scan (if available)
if command -v snyk &> /dev/null; then
    echo "🛡️  Running Snyk scan..."
    snyk test --json > "security-reports/snyk-${TIMESTAMP}.json" 2>&1 || true
    snyk test > "security-reports/snyk-${TIMESTAMP}.txt" 2>&1 || true
    echo "✅ Snyk scan complete"
else
    echo "⚠️  Snyk not installed. Install with: npm install -g snyk"
fi

# 5. Check for outdated dependencies
echo "📊 Checking for outdated dependencies..."
npm outdated > "security-reports/outdated-${TIMESTAMP}.txt" 2>&1 || true
echo "✅ Outdated dependencies check complete"

# 6. Generate summary
echo ""
echo "📋 Generating summary..."
cat > "security-reports/audit-summary-${TIMESTAMP}.md" << EOF
# Security Audit Summary

**Date:** $(date)
**Timestamp:** $TIMESTAMP

## Reports Generated

1. **npm Audit:** security-reports/npm-audit-${TIMESTAMP}.txt
2. **Exposed Secrets:** security-reports/exposed-secrets-${TIMESTAMP}.txt
3. **Hardcoded Secrets:** security-reports/hardcoded-secrets-${TIMESTAMP}.txt
4. **Snyk Scan:** security-reports/snyk-${TIMESTAMP}.txt (if available)
5. **Outdated Dependencies:** security-reports/outdated-${TIMESTAMP}.txt

## Next Steps

1. Review all reports
2. Fix critical vulnerabilities
3. Update outdated dependencies
4. Rotate any exposed credentials
5. Document findings

EOF

echo "✅ Security audit complete!"
echo "📁 Reports saved to: security-reports/"
echo "📋 Summary: security-reports/audit-summary-${TIMESTAMP}.md"

