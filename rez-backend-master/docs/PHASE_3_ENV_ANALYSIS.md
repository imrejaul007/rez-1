# Phase 3: Environment Variables Analysis & Fixes

## 📋 Analysis Date
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 🔍 Issues Found in `.env` File

### ❌ **CRITICAL ISSUES**

#### 1. **Missing `MERCHANT_FRONTEND_URL`** ⚠️
- **Status**: ❌ **MISSING**
- **Used In**:
  - `src/merchantroutes/auth.ts` (lines 655, 1245)
  - `src/services/EmailService.ts` (lines 165, 195, 254, 1671)
  - `src/server.ts` (line 196)
- **Impact**: 
  - Merchant password reset links will use `FRONTEND_URL` (user frontend) instead of merchant frontend
  - Email verification links will point to wrong frontend
  - Welcome emails will have incorrect dashboard links
- **Fix Required**: Add `MERCHANT_FRONTEND_URL` to `.env`

#### 2. **Invalid `JWT_REFRESH_SECRET`** 🔴
- **Status**: ❌ **INVALID (Default Value)**
- **Current Value**: `your-super-secret-refresh-jwt-key-change-this-in-production`
- **Issue**: This is a placeholder/default value that will fail environment validation
- **Impact**: 
  - Server will fail to start with validation error
  - User authentication refresh tokens will not work
- **Fix Required**: Generate a strong random secret (minimum 32 characters)

#### 3. **Missing `ADMIN_URL`** ⚠️
- **Status**: ⚠️ **MISSING (Optional but Recommended)**
- **Used In**:
  - `src/services/EmailService.ts` (lines 967, 1736)
- **Impact**: 
  - Admin notification emails will use `FRONTEND_URL` as fallback
  - May cause confusion if admin panel is on different domain
- **Fix Required**: Add `ADMIN_URL` if you have a separate admin frontend

### ✅ **VERIFIED CORRECT**

#### 1. **`JWT_MERCHANT_SECRET`** ✅
- **Status**: ✅ **PRESENT**
- **Length Check**: Appears to be 100+ characters (needs verification)
- **Note**: Ensure it's at least 32 characters (validation requirement)

#### 2. **`JWT_MERCHANT_EXPIRES_IN`** ✅
- **Status**: ✅ **PRESENT**
- **Value**: `7d` (7 days)

#### 3. **`FRONTEND_URL`** ✅
- **Status**: ✅ **PRESENT**
- **Value**: `http://localhost:19006`

#### 4. **`SENDGRID_API_KEY`** ✅
- **Status**: ✅ **PRESENT** (but check if it's a placeholder)
- **Note**: Verify it's a real SendGrid API key, not placeholder

#### 5. **`SENDGRID_FROM_EMAIL`** ✅
- **Status**: ✅ **PRESENT**
- **Value**: `noreply@yourstore.com`

#### 6. **`SENDGRID_FROM_NAME`** ✅
- **Status**: ✅ **PRESENT**
- **Value**: `REZ App`

---

## 🔧 Required Fixes

### Fix 1: Add `MERCHANT_FRONTEND_URL`

Add this to your `.env` file (after `FRONTEND_URL`):

```env
# Merchant Frontend URL (for merchant dashboard, password reset, etc.)
MERCHANT_FRONTEND_URL=http://localhost:3000
# For production, use: MERCHANT_FRONTEND_URL=https://merchant.yourapp.com
```

**Why**: Merchant authentication routes and emails need to point to the merchant frontend, not the user frontend.

---

### Fix 2: Fix `JWT_REFRESH_SECRET`

Replace the current value:

```env
# ❌ OLD (INVALID):
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# ✅ NEW (Generate a strong secret):
JWT_REFRESH_SECRET=<GENERATE_STRONG_RANDOM_STRING_64_CHARS>
```

**How to Generate**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

**Requirements**:
- Minimum 32 characters (recommended: 64+)
- Must be different from `JWT_SECRET` and `JWT_MERCHANT_SECRET`
- Must be random and secure

---

### Fix 3: Add `ADMIN_URL` (Optional but Recommended)

If you have a separate admin frontend, add:

```env
# Admin Frontend URL (for admin panel links in emails)
ADMIN_URL=http://localhost:3001
# For production, use: ADMIN_URL=https://admin.yourapp.com
```

**Why**: Admin notification emails (merchant onboarding, refund requests) should point to the admin panel.

---

## 📝 Complete `.env` Section to Add/Update

Add these lines to your `.env` file in the appropriate sections:

```env
# ================================================
# JWT & AUTHENTICATION
# ================================================
# User Authentication (for regular users)
JWT_SECRET=fe203b93267edbb8a76054aec70f96cfb4b183bd897f608abf4fccb84444486e3c0802976173b4e9b576ff3285505727507cf6ac8c044ac24ab18e6c4bdfd626
JWT_REFRESH_SECRET=<GENERATE_NEW_STRONG_SECRET_HERE>  # ⚠️ FIX THIS
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Merchant Authentication (separate secret for merchant security)
JWT_MERCHANT_SECRET=a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4e9d8c7b6a5f4
JWT_MERCHANT_EXPIRES_IN=7d

# Frontend URLs
FRONTEND_URL=http://localhost:19006
MERCHANT_FRONTEND_URL=http://localhost:3000  # ⚠️ ADD THIS
ADMIN_URL=http://localhost:3001  # ⚠️ ADD THIS (optional)
```

---

## ✅ Verification Checklist

After making changes, verify:

- [ ] `MERCHANT_FRONTEND_URL` is added and points to merchant frontend
- [ ] `JWT_REFRESH_SECRET` is changed from default value
- [ ] `JWT_REFRESH_SECRET` is at least 32 characters
- [ ] `JWT_REFRESH_SECRET` is different from `JWT_SECRET` and `JWT_MERCHANT_SECRET`
- [ ] `ADMIN_URL` is added (if you have admin frontend)
- [ ] All URLs use correct ports/domains for your setup
- [ ] Server starts without environment validation errors

---

## 🧪 Test After Fixes

1. **Start Server**: Should start without environment validation errors
2. **Test Merchant Registration**: Verify email verification link points to merchant frontend
3. **Test Password Reset**: Verify reset link points to merchant frontend
4. **Test Token Refresh**: Verify refresh tokens work for users

---

## 📊 Summary

| Variable | Status | Priority | Action Required |
|----------|--------|----------|-----------------|
| `MERCHANT_FRONTEND_URL` | ❌ Missing | **HIGH** | Add to `.env` |
| `JWT_REFRESH_SECRET` | ❌ Invalid | **CRITICAL** | Generate new secret |
| `ADMIN_URL` | ⚠️ Missing | **LOW** | Add if needed |
| `JWT_MERCHANT_SECRET` | ✅ Present | - | Verify length ≥ 32 |
| `JWT_MERCHANT_EXPIRES_IN` | ✅ Present | - | No action |
| `FRONTEND_URL` | ✅ Present | - | No action |
| `SENDGRID_API_KEY` | ✅ Present | - | Verify not placeholder |

---

## 🚨 Critical Actions Required

1. **IMMEDIATE**: Fix `JWT_REFRESH_SECRET` (server won't start with validation)
2. **HIGH PRIORITY**: Add `MERCHANT_FRONTEND_URL` (merchant auth flows broken)
3. **OPTIONAL**: Add `ADMIN_URL` (improves admin email links)

---

## 📚 Related Files

- `src/config/validateEnv.ts` - Environment validation logic
- `src/merchantroutes/auth.ts` - Merchant authentication routes
- `src/services/EmailService.ts` - Email service using these variables
- `src/server.ts` - Server configuration using CORS origins

---

**Next Steps**: 
1. Generate new `JWT_REFRESH_SECRET`
2. Add `MERCHANT_FRONTEND_URL` to `.env`
3. Restart server and verify no validation errors
4. Test merchant authentication flows

