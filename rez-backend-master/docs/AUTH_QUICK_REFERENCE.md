# Authentication Quick Reference Guide

## 🚀 Quick Start

### Development Testing

```bash
# 1. Send OTP (phone only - existing user)
POST /api/auth/send-otp
{
  "phoneNumber": "9876543210"
}

# Response includes devOtp in development
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 600,
    "devOtp": "456789"  // Use this!
  }
}

# 2. Verify OTP
POST /api/auth/verify-otp
{
  "phoneNumber": "9876543210",
  "otp": "456789"
}

# Or use development bypass (any OTP starting with 123)
{
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

---

## 📱 Phone Number Formats

### All These Work:
- `9876543210` ✅
- `+919876543210` ✅
- `919876543210` ✅
- `+91 9876543210` ✅

### Normalized To:
- `+919876543210` (always)

---

## 🔑 OTP Testing

### Development Mode
1. **Console OTP:** Check backend console logs
2. **Response OTP:** Use `devOtp` field from send-otp response
3. **Dev Bypass:** Use `123456` or any OTP starting with `123`

### Production Mode
1. **Real SMS:** OTP sent via Twilio
2. **No Bypass:** Must use actual OTP
3. **No devOtp:** Field not included in response

---

## 🔐 Login vs Signup

### Login (Existing User)
```json
{
  "phoneNumber": "9876543210"
  // Email NOT required
}
```

### Signup (New User)
```json
{
  "phoneNumber": "9123456789",
  "email": "newuser@example.com",  // Required!
  "referralCode": "ABC123"  // Optional
}
```

---

## ⚙️ Environment Setup

### Development (.env)
```env
NODE_ENV=development
```
**Enables:**
- devOtp in response
- OTP in console logs
- Development bypass (123xxx)

### Production (.env)
```env
NODE_ENV=production
```
**Enforces:**
- Real OTP verification
- No devOtp field
- No bypass

---

## 🧪 Testing Commands

### Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'
```

### Verify OTP (Dev Bypass)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "otp": "123456"}'
```

---

## 📊 Response Examples

### Send OTP Success
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 600,
    "devOtp": "456789"
  },
  "message": "OTP sent to your phone number"
}
```

### Verify OTP Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "phoneNumber": "+919876543210",
      "email": "user@example.com",
      "isVerified": true,
      "isOnboarded": false
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 604800
    }
  },
  "message": "Login successful"
}
```

---

## ❌ Common Errors

### User Not Found
```json
{
  "success": false,
  "message": "User not found. Please sign up first or check your phone number."
}
```
**Solution:** Include email for signup

### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```
**Solution:** Check console for actual OTP or use dev bypass

### Phone Already Registered
```json
{
  "success": false,
  "message": "Phone number is already registered. Please use Sign In instead."
}
```
**Solution:** Use login flow (no email)

---

## 🔍 Console Logs

Look for these in backend console:

```
🚀 [SEND_OTP] NEW OTP REQUEST RECEIVED
📱 Phone (original): 9876543210
📱 Phone (normalized): +919876543210
🔑 OTP CODE: 456789
🔧 [DEV_MODE] OTP included in response: 456789
```

---

## 📝 Quick Checklist

Before testing:
- [ ] Backend running
- [ ] `NODE_ENV=development` set
- [ ] Phone number format is valid (starts with 6-9)
- [ ] Check console for OTP
- [ ] Use `devOtp` from response OR `123456` bypass

Before production:
- [ ] `NODE_ENV=production` set
- [ ] Twilio credentials configured
- [ ] Test SMS delivery
- [ ] Verify dev bypass disabled

---

## 🆘 Troubleshooting

### OTP not in response?
- Check `NODE_ENV=development`
- Look in console logs instead

### User lookup fails?
- Phone number is auto-normalized
- Try different format
- Check console logs for normalized number

### OTP verification fails?
- Check OTP expiry (10 minutes)
- Use dev bypass: `123456`
- Verify phone number matches

---

**For detailed information, see:** `AUTHENTICATION_FIXES_REPORT.md`
