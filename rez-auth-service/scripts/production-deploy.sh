#!/bin/bash
# ===================================================================
# ReZ Auth Service - Production Deployment Checklist
# ===================================================================
# This script generates production secrets and provides deployment steps
# ===================================================================

set -e

echo "========================================"
echo "ReZ Auth Service - Production Deploy"
echo "========================================"
echo ""

# Generate secrets
echo "1. Generating new production secrets..."
JWT_SECRET=$(openssl rand -hex 64)
JWT_MERCHANT_SECRET=$(openssl rand -hex 64)
JWT_ADMIN_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
INTERNAL_TOKEN=$(openssl rand -hex 32)
OTP_HMAC_SECRET=$(openssl rand -base64 64)
OTP_TOTP_KEY=$(openssl rand -hex 32)

echo ""
echo "2. Secrets generated successfully!"
echo ""

# Create .env.production template
cat > .env.production << EOF
# ============================================================
# ReZ Auth Service - Production Environment
# ============================================================
# COPY THIS TO Render Dashboard Environment Variables
# DO NOT COMMIT THIS FILE
# ============================================================

NODE_ENV=production
EXPOSE_DEV_OTP=false

# DATABASE (existing)
MONGODB_URI=your-mongodb-uri
REDIS_URL=your-redis-url

# JWT AUTH SECRETS (NEW - from step 1)
JWT_SECRET=${JWT_SECRET}
JWT_MERCHANT_SECRET=${JWT_MERCHANT_SECRET}
JWT_ADMIN_SECRET=${JWT_ADMIN_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN}

# SECURITY KEYS (NEW - from step 1)
OTP_HMAC_SECRET=${OTP_HMAC_SECRET}
OTP_TOTP_ENCRYPTION_KEY=${OTP_TOTP_KEY}

# TOKEN CONFIGURATION
JWT_REFRESH_TTL_HOURS=24

# NETWORK SECURITY (CONFIGURE FOR PRODUCTION!)
# Example: 10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
ALLOWED_INTERNAL_IPS=

# CORS (update for production)
CORS_ORIGIN=https://rez.money,https://www.rez.money,https://admin.rez.money

# APP URL
APP_URL=https://rez.money

# EMAIL (configure)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@rez.money

# OBSERVABILITY
SENTRY_DSN=
OTEL_SERVICE_NAME=rez-auth-service
EOF

echo "3. Created .env.production template"
echo ""

# OAuth partners (set in Render dashboard)
cat > OAUTH_PARTNERS.md << 'EOF'
# OAuth Partner Configuration

Set these in Render Dashboard > Environment:

## Required Partners

### Rendez
```
PARTNER_RENDEZ_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_RENDEZ_REDIRECT_URI=https://your-rendez-app.com/api/auth/callback
```

### Stay Owen (Hotel OTA)
```
PARTNER_STAY_OWEN_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_STAY_OWEN_REDIRECT_URI=https://your-hotel-app.com/api/auth/callback
```

### AdBazaar
```
PARTNER_ADBAZAAR_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_ADBAZAAR_REDIRECT_URI=https://your-adbazaar-app.com/api/auth/callback
```

## Optional Partners

### NextaBiZ
```
PARTNER_NEXTABIZZ_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_NEXTABIZZ_REDIRECT_URI=https://your-nextabizz-app.com/api/auth/callback
```

### Hotel PMS
```
PARTNER_HOTEL_PMS_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_HOTEL_PMS_REDIRECT_URI=https://your-hotel-pms.com/api/auth/callback
```
EOF

echo "4. Created OAUTH_PARTNERS.md"
echo ""

echo "========================================"
echo "DEPLOYMENT CHECKLIST"
echo "========================================"
echo ""
echo "Step 1: Set secrets in Render Dashboard"
echo "  - Copy values from .env.production"
echo "  - Go to: Render > rez-auth-service > Environment"
echo ""
echo "Step 2: Configure ALLOWED_INTERNAL_IPS"
echo "  - Add your internal network CIDRs"
echo ""
echo "Step 3: Set OAuth partner secrets"
echo "  - Copy from OAUTH_PARTNERS.md"
echo ""
echo "Step 4: Deploy"
echo "  - Trigger manual deploy on Render"
echo ""
echo "Step 5: Verify"
echo "  - Check /health endpoint"
echo "  - Test OTP send/verify"
echo "  - Test admin login"
echo ""
echo "Step 6: Enable MFA for admin users"
echo "  - POST /auth/admin/mfa/setup (as admin)"
echo "  - POST /auth/admin/mfa/verify-setup (with TOTP code)"
echo ""
echo "========================================"
echo ""
echo "Files created:"
echo "  - .env.production (secrets template)"
echo "  - OAUTH_PARTNERS.md (OAuth config)"
echo ""
echo "IMPORTANT: Delete .env.production after setting secrets!"
echo ""
