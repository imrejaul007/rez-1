# Merchant Security Features - Quick Testing Guide

**Quick reference for testing all security features**

---

## 🚀 Prerequisites

1. Backend running on `http://localhost:5001`
2. MongoDB connected
3. Environment variables configured (JWT_MERCHANT_SECRET set)

---

## 📋 Quick Test Script

### 1. Register New Merchant
```bash
curl -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Security Test Store",
    "ownerName": "Test Owner",
    "email": "security.test@example.com",
    "password": "test123456",
    "phone": "1234567890",
    "businessAddress": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345",
      "country": "USA"
    }
  }'
```

**Check Console:** You should see email verification link

---

### 2. Test Email Verification

**Copy token from console output, then:**
```bash
curl http://localhost:5001/api/merchant/auth/verify-email/{TOKEN_HERE}
```

**Expected:** `"message": "Email verified successfully!"`

---

### 3. Test Login (Correct Password)
```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com",
    "password": "test123456"
  }'
```

**Expected:** Token + merchant data, `emailVerified: true`

---

### 4. Test Account Lockout

**Run this 5 times (wrong password):**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com",
    "password": "wrongpassword"
  }'
```

**Attempts 1-4:** Shows remaining attempts
**Attempt 5:** Account locked (HTTP 423)

**Try correct password while locked:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com",
    "password": "test123456"
  }'
```

**Expected:** Still locked, shows time remaining

---

### 5. Test Password Reset

**Request reset:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com"
  }'
```

**Check Console:** Copy the reset token

**Reset password:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/reset-password/{TOKEN_HERE} \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpassword123",
    "confirmPassword": "newpassword123"
  }'
```

**Expected:** Password changed, account unlocked

**Login with new password:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com",
    "password": "newpassword123"
  }'
```

**Expected:** Success (account is unlocked)

---

### 6. Test Resend Verification

**For unverified account:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security.test@example.com"
  }'
```

**Expected:** New verification link in console

---

## 🔍 What to Look For

### Registration Console Output
```
📧 EMAIL VERIFICATION (New Registration)
Verification Link: http://localhost:19006/verify-email/{token}
```

### Password Reset Console Output
```
🔐 PASSWORD RESET REQUEST
Reset Link: http://localhost:19006/reset-password/{token}
Expires: {datetime}
```

### Account Lockout Console Output
```
🔒 Account locked for merchant: security.test@example.com (5 failed attempts)
```

### Failed Login Console Output
```
⚠️ Failed login attempt for security.test@example.com. X attempts remaining.
```

---

## ✅ Success Criteria

- [x] Registration creates unverified merchant
- [x] Email verification link in console
- [x] Email verification sets emailVerified = true
- [x] Login with correct password works
- [x] Login shows warning if email unverified
- [x] 5 failed attempts locks account (30 min)
- [x] Locked account shows time remaining
- [x] Password reset generates secure token
- [x] Password reset link in console
- [x] Password reset unlocks account
- [x] Password reset clears failed attempts
- [x] New password works for login
- [x] Resend verification generates new token
- [x] All tokens are hashed before storage
- [x] JWT uses merchant-specific secret

---

## 🐛 Troubleshooting

**Token not working?**
- Check token hasn't expired (1 hour for reset, 24 hours for verification)
- Make sure you copied the full token from console
- Check console for any errors

**Account not locking?**
- Verify failedLoginAttempts in database
- Check if accountLockedUntil is set
- Look for console message about account lock

**JWT issues?**
- Verify JWT_MERCHANT_SECRET is set in .env
- Check console for JWT warnings
- Ensure token is sent in Authorization header

---

## 📊 Database Checks

**Check merchant in MongoDB:**
```javascript
db.merchants.findOne({ email: "security.test@example.com" })
```

**Should see:**
- `emailVerified: true/false`
- `failedLoginAttempts: 0-5`
- `accountLockedUntil: null/Date`
- `lastLoginAt: Date`
- `lastLoginIP: "::ffff:127.0.0.1"`
- `resetPasswordToken`: not visible (select: false)
- `emailVerificationToken`: not visible (select: false)

---

## 🎯 Quick Verification Commands

**Postman/Insomnia Collection:**
Import these endpoints into your API client:

1. **Register:** `POST /api/merchant/auth/register`
2. **Login:** `POST /api/merchant/auth/login`
3. **Verify Email:** `GET /api/merchant/auth/verify-email/:token`
4. **Forgot Password:** `POST /api/merchant/auth/forgot-password`
5. **Reset Password:** `POST /api/merchant/auth/reset-password/:token`
6. **Resend Verification:** `POST /api/merchant/auth/resend-verification`

---

**Testing Time:** ~10 minutes for complete test
**Status:** ✅ All features production-ready
