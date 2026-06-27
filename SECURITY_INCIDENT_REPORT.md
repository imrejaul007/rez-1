# 🚨 SECURITY INCIDENT REPORT

## Incident Summary
**Date Discovered:** 2026-06-25
**Severity:** CRITICAL
**Status:** REMEDIATION REQUIRED

## What Happened
Production secrets were committed to the git repository in `rez-auth-service/.env`.

## Exposed Secrets
| Secret | Exposure Risk |
|--------|---------------|
| MongoDB URI | Full database access |
| Redis URL | Cache/session access |
| JWT_SECRET | Token forgery |
| JWT_MERCHANT_SECRET | Merchant token forgery |
| JWT_ADMIN_SECRET | Admin token forgery |
| JWT_REFRESH_SECRET | Token refresh attacks |
| INTERNAL_SERVICE_TOKEN | Internal API impersonation |
| OTP_HMAC_SECRET | OTP bypass |
| OTP_TOTP_KEY | MFA bypass |
| Sentry DSN | Observability data access |

## Immediate Actions Required (USER MUST DO)

### 1. Rotate ALL Exposed Secrets
Generate new secrets and update:

```bash
# Generate new JWT secrets
openssl rand -hex 64  # Use for JWT_SECRET
openssl rand -hex 64  # Use for JWT_MERCHANT_SECRET
openssl rand -hex 64  # Use for JWT_ADMIN_SECRET
openssl rand -hex 64  # Use for JWT_REFRESH_SECRET

# Generate new internal token
openssl rand -hex 32  # Use for INTERNAL_SERVICE_TOKEN

# Generate new OTP secrets
openssl rand -base64 64  # Use for OTP_HMAC_SECRET
openssl rand -hex 32  # Use for OTP_TOTP_ENCRYPTION_KEY
```

### 2. Update Production Services
Update the actual production environment with new secrets.

### 3. Git History Remediation (Recommended)
The secrets are in git history. Options:
- **Quick fix:** Rotate secrets (secrets in history are stale)
- **Complete fix:** Use `git filter-branch` to remove from history
  ```bash
  git filter-branch --force --index-filter \
    'git rm --cached --ignore-unmatch rez-auth-service/.env' \
    --prune-empty --tag-name-filter cat -- --all
  ```

## Current Status
- [x] `.env` file identified with real secrets
- [x] `.env.example` template verified (has placeholder values)
- [x] `.gitignore` correctly configured
- [ ] User needs to ROTATE all secrets
- [ ] Git history cleanup (optional but recommended)

## Prevention
- `.gitignore` already excludes `.env` files
- `.env.example` provides safe template
- Add pre-commit hook to prevent `.env` commits

## Files
- `rez-auth-service/.env` - Contains exposed secrets (KEEP for reference during rotation)
- `rez-auth-service/.env.example` - Safe template (DO NOT commit secrets)
