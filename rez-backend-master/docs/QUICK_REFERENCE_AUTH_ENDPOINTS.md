# Quick Reference: Merchant Auth Endpoints

## 🔄 Token Refresh
**POST** `/api/merchant/auth/refresh`

```bash
# Request
curl -X POST http://localhost:5000/api/merchant/auth/refresh \
  -H "Authorization: Bearer <token>"

# Response
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": "7d",
    "merchant": { ... }
  }
}
```

---

## 👤 Update Profile
**PUT** `/api/merchant/auth/profile`

```bash
# Request
curl -X PUT http://localhost:5000/api/merchant/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "New Name",
    "phone": "+1-555-0123",
    "logo": "https://example.com/logo.png"
  }'

# Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "merchant": { ... }
  }
}
```

---

## 📧 Resend Verification
**POST** `/api/merchant/auth/resend-verification`

```bash
# Request
curl -X POST http://localhost:5000/api/merchant/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant@example.com"}'

# Response
{
  "success": true,
  "message": "Verification email sent successfully. Please check your inbox."
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error / Already verified |
| 401 | Invalid or expired token |
| 404 | Merchant not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Rate Limiting (Production)

Uncomment rate limiters:
- `authLimiter` - General auth protection
- `passwordResetLimiter` - Password reset protection

```typescript
// Change from:
router.post('/refresh', /* authLimiter, */ ...)

// To:
router.post('/refresh', authLimiter, ...)
```
