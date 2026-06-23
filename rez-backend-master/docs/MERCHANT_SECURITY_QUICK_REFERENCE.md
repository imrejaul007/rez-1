# Merchant Security - Quick Reference Card

## 🔐 New Security Features at a Glance

### Separate JWT Secrets
```
JWT_SECRET              → For users
JWT_MERCHANT_SECRET     → For merchants (NEW)
JWT_MERCHANT_EXPIRES_IN → 7d (NEW)
```

### New Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/merchant/auth/forgot-password` | Request password reset |
| POST | `/api/merchant/auth/reset-password/:token` | Reset password with token |
| GET | `/api/merchant/auth/verify-email/:token` | Verify email address |
| POST | `/api/merchant/auth/resend-verification` | Resend verification email |

### Model Fields Added

```typescript
// Password Reset
resetPasswordToken?: string;      // Hashed token
resetPasswordExpiry?: Date;       // 1 hour expiry

// Email Verification
emailVerified: boolean;           // Default: false
emailVerificationToken?: string;  // Hashed token
emailVerificationExpiry?: Date;   // 24 hour expiry

// Account Security
failedLoginAttempts: number;      // Default: 0, Max: 5
accountLockedUntil?: Date;        // 30 min lockout
lastLoginAt?: Date;               // Last login time
lastLoginIP?: string;             // Last login IP
```

### Account Lockout Rules

```
Failed Attempts → Response
1-4 attempts   → "X attempts remaining"
5 attempts     → Account locked (30 minutes)
Reset password → Account unlocked + attempts reset
```

### Token Security

```
All tokens:
- Generated: crypto.randomBytes(32)
- Stored: SHA-256 hashed
- Expiry: 1h (reset) / 24h (verification)
```

### Status Codes

```
200 → Success
201 → Created (registration)
400 → Bad request (invalid token)
401 → Unauthorized (wrong credentials)
423 → Locked (account locked)
500 → Server error
```

### Environment Variables

```env
JWT_MERCHANT_SECRET=your-secret-here
JWT_MERCHANT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:19006
```

### Console Output Patterns

```
🔐 → Password reset
📧 → Email verification
🔒 → Account locked
⚠️ → Failed login attempt
✅ → Success (verification/reset)
```

### Testing Checklist

- [ ] Registration sends verification email
- [ ] Email verification works
- [ ] Login with correct password
- [ ] 5 failed attempts locks account
- [ ] Password reset unlocks account
- [ ] Separate JWT for merchants
- [ ] All tokens hashed in DB

### Files Modified

```
✓ .env
✓ .env.example
✓ src/models/Merchant.ts
✓ src/middleware/merchantauth.ts
✓ src/merchantroutes/auth.ts
```

### Production Checklist

- [ ] Generate strong JWT_MERCHANT_SECRET
- [ ] Update FRONTEND_URL
- [ ] Set up email service
- [ ] Test all flows
- [ ] Monitor failed logins
- [ ] Set up alerts

---

**Quick Test:**
```bash
# 1. Register
POST /api/merchant/auth/register

# 2. Copy verification token from console

# 3. Verify email
GET /api/merchant/auth/verify-email/{token}

# 4. Login
POST /api/merchant/auth/login

# 5. Test lockout (5x wrong password)
POST /api/merchant/auth/login (wrong password)

# 6. Reset password
POST /api/merchant/auth/forgot-password
POST /api/merchant/auth/reset-password/{token}

# 7. Login again (unlocked)
POST /api/merchant/auth/login
```

---

**Status:** ✅ All features implemented
**Documentation:** See MERCHANT_SECURITY_IMPLEMENTATION_SUMMARY.md
**Testing:** See MERCHANT_SECURITY_TESTING_GUIDE.md
