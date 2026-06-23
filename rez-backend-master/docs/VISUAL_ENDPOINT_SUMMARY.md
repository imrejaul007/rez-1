# Visual Endpoint Summary

## 🎯 3 New Endpoints - Quick Visual Guide

---

## 1️⃣ Token Refresh Endpoint

```
┌─────────────────────────────────────────────────────────────┐
│  POST /api/merchant/auth/refresh                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT:                                                      │
│  ├─ Authorization Header: Bearer <expired_token>            │
│  └─ OR Body: { "refreshToken": "<token>" }                 │
│                                                              │
│  PROCESS:                                                    │
│  ├─ 1. Extract token from header or body                    │
│  ├─ 2. Verify token (allow expired)                         │
│  ├─ 3. Find merchant by ID                                  │
│  ├─ 4. Check if merchant is active                          │
│  ├─ 5. Generate new JWT token                               │
│  ├─ 6. Update lastLogin timestamps                          │
│  └─ 7. Create audit log entry                               │
│                                                              │
│  OUTPUT:                                                     │
│  {                                                           │
│    "success": true,                                          │
│    "data": {                                                 │
│      "token": "new_jwt_token",                              │
│      "expiresIn": "7d",                                     │
│      "merchant": { ... }                                     │
│    }                                                         │
│  }                                                           │
│                                                              │
│  ERRORS:                                                     │
│  ├─ 401: No token / Invalid token                           │
│  ├─ 404: Merchant not found                                 │
│  └─ 500: Server error                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Profile Update Endpoint

```
┌─────────────────────────────────────────────────────────────┐
│  PUT /api/merchant/auth/profile                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT:                                                      │
│  ├─ Authorization Header: Bearer <valid_token>              │
│  └─ Body: {                                                  │
│      "businessName": "Updated Name",     [2-100 chars]      │
│      "ownerName": "John Doe",            [2-50 chars]       │
│      "phone": "+1-555-0123",             [validated format] │
│      "businessAddress": {                                    │
│        "street": "123 Main St",                             │
│        "city": "New York",                                  │
│        "state": "NY",                                       │
│        "zipCode": "10001",                                  │
│        "country": "USA"                                     │
│      },                                                      │
│      "logo": "https://...",              [URI format]       │
│      "website": "https://...",           [URI format]       │
│      "description": "..."                [max 500 chars]    │
│    }                                                         │
│                                                              │
│  VALIDATION:                                                 │
│  ├─ Phone regex: ^[\d+\-\s()]+$                            │
│  ├─ URI format for logo/website                             │
│  ├─ String length constraints                               │
│  └─ All fields optional (partial updates)                   │
│                                                              │
│  PROCESS:                                                    │
│  ├─ 1. Authenticate via JWT                                 │
│  ├─ 2. Validate input fields                                │
│  ├─ 3. Find merchant by ID                                  │
│  ├─ 4. Store old values (audit)                             │
│  ├─ 5. Update merchant fields                               │
│  ├─ 6. Save to database                                     │
│  ├─ 7. Create audit log with changes                        │
│  └─ 8. Return updated merchant                              │
│                                                              │
│  OUTPUT:                                                     │
│  {                                                           │
│    "success": true,                                          │
│    "message": "Profile updated successfully",               │
│    "data": {                                                 │
│      "merchant": {                                           │
│        "id": "...",                                          │
│        "businessName": "Updated Name",                      │
│        "ownerName": "John Doe",                             │
│        "email": "...",                                       │
│        "phone": "+1-555-0123",                              │
│        "businessAddress": { ... },                           │
│        "logo": "...",                                        │
│        "website": "...",                                     │
│        "description": "...",                                 │
│        "createdAt": "...",                                   │
│        "updatedAt": "..."                                    │
│      }                                                        │
│    }                                                          │
│  }                                                            │
│                                                               │
│  ERRORS:                                                      │
│  ├─ 400: Invalid phone format / Validation error            │
│  ├─ 401: Unauthorized (no/invalid token)                    │
│  ├─ 404: Merchant not found                                 │
│  └─ 500: Update failed                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Resend Verification Endpoint

```
┌─────────────────────────────────────────────────────────────┐
│  POST /api/merchant/auth/resend-verification                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT:                                                      │
│  └─ Body: { "email": "merchant@example.com" }              │
│                                                              │
│  PROCESS:                                                    │
│  ├─ 1. Find merchant by email (case-insensitive)           │
│  ├─ 2. Check if already verified ────┐                     │
│  │                                     │                     │
│  │  IF VERIFIED:                       │                     │
│  │  └─ Return 400 error ───────────────┘                   │
│  │                                                           │
│  ├─ 3. Generate verification token:                         │
│  │    ├─ Random 32-byte string                             │
│  │    ├─ Hash with SHA-256                                 │
│  │    └─ Set 24-hour expiry                                │
│  │                                                           │
│  ├─ 4. Update merchant:                                     │
│  │    ├─ Store hashed token                                │
│  │    └─ Store expiry timestamp                            │
│  │                                                           │
│  ├─ 5. Send email via SendGrid:                            │
│  │    ├─ Professional HTML template                        │
│  │    ├─ Verification link with token                      │
│  │    ├─ 24-hour expiry notice                             │
│  │    └─ Personalized with merchant name                   │
│  │                                                           │
│  └─ 6. Return success message                               │
│                                                              │
│  SECURITY:                                                   │
│  ├─ Returns success even if email not found                │
│  ├─ Original token sent via email only                     │
│  ├─ Hashed token stored in database                        │
│  └─ Time-limited validity (24 hours)                       │
│                                                              │
│  OUTPUT:                                                     │
│  {                                                           │
│    "success": true,                                          │
│    "message": "Verification email sent successfully.        │
│                Please check your inbox.",                   │
│    "verificationUrl": "http://..."  // Dev only             │
│  }                                                           │
│                                                              │
│  EMAIL TEMPLATE:                                             │
│  ┌────────────────────────────────────────┐                │
│  │ Verify Your Email Address 📧           │                │
│  ├────────────────────────────────────────┤                │
│  │ Hi [Merchant Name],                     │                │
│  │                                          │                │
│  │ Please verify your email address to     │                │
│  │ complete your registration.             │                │
│  │                                          │                │
│  │ [Verify Email Button]                   │                │
│  │                                          │                │
│  │ This link expires in 24 hours.          │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  ERRORS:                                                     │
│  ├─ 400: Email already verified                             │
│  ├─ 500: Failed to send email                               │
│  └─ 200: Success (even if email not found - security)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow Diagram

```
                   AUTHENTICATION FLOW

┌──────────┐        ┌──────────┐        ┌──────────┐
│  Client  │        │ Backend  │        │ Database │
└────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                   │
     │ 1. Login          │                   │
     ├──────────────────>│                   │
     │                   │ 2. Verify         │
     │                   ├──────────────────>│
     │                   │ 3. User found     │
     │                   │<──────────────────┤
     │ 4. JWT Token      │                   │
     │<──────────────────┤                   │
     │                   │                   │
     │ [Token expires after 7 days]          │
     │                   │                   │
     │ 5. Refresh Token  │                   │
     ├──────────────────>│                   │
     │                   │ 6. Verify (allow  │
     │                   │    expired)       │
     │                   ├──────────────────>│
     │                   │ 7. Merchant OK    │
     │                   │<──────────────────┤
     │ 8. New JWT Token  │                   │
     │<──────────────────┤                   │
     │                   │ 9. Update login   │
     │                   ├──────────────────>│
     │                   │                   │
```

---

## 📊 Data Flow Comparison

### BEFORE Implementation
```
Frontend ──X──> /api/merchant/auth/refresh         [404 Not Found]
Frontend ──X──> /api/merchant/auth/profile         [404 Not Found]
Frontend ──X──> /api/merchant/auth/resend-verification [404 Not Found]
```

### AFTER Implementation
```
Frontend ──✓──> /api/merchant/auth/refresh         [200 OK + new token]
Frontend ──✓──> /api/merchant/auth/profile         [200 OK + updated merchant]
Frontend ──✓──> /api/merchant/auth/resend-verification [200 OK + email sent]
```

---

## 🎨 Response Format Comparison

### Success Response Pattern
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Relevant data here
  }
}
```

### Error Response Pattern
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical details (optional)"
}
```

---

## 🔄 Token Refresh Example

```
┌─────────────────────────────────────────────────────────┐
│  SCENARIO: User token expires during session            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User opens app                                       │
│     └─ Token: eyJhbGci... (expires in 5 min)           │
│                                                          │
│  2. App detects expiry approaching                       │
│     └─ Automatically calls /refresh                     │
│                                                          │
│  3. Backend validates expired token                      │
│     ├─ Checks signature ✓                               │
│     ├─ Ignores expiry for refresh                       │
│     └─ Validates merchant still active ✓                │
│                                                          │
│  4. New token generated                                  │
│     └─ Token: eyJhbGNi... (expires in 7 days)          │
│                                                          │
│  5. App stores new token                                 │
│     └─ User continues seamlessly                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Profile Update Example

```
┌─────────────────────────────────────────────────────────┐
│  SCENARIO: Merchant updates business information        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  BEFORE:                                                 │
│  {                                                       │
│    "businessName": "Old Store Name",                    │
│    "phone": "+1-555-0000",                              │
│    "logo": null                                          │
│  }                                                       │
│                                                          │
│  UPDATE REQUEST:                                         │
│  {                                                       │
│    "businessName": "New Store Name",                    │
│    "phone": "+1-555-9999",                              │
│    "logo": "https://cdn.example.com/logo.png"           │
│  }                                                       │
│                                                          │
│  AFTER:                                                  │
│  {                                                       │
│    "businessName": "New Store Name",    [CHANGED]       │
│    "phone": "+1-555-9999",              [CHANGED]       │
│    "logo": "https://cdn.example.com/logo.png" [NEW]     │
│  }                                                       │
│                                                          │
│  AUDIT LOG CREATED:                                      │
│  ├─ Action: "store.updated"                             │
│  ├─ Changed fields: ["businessName", "phone", "logo"]   │
│  ├─ Before values: {...}                                │
│  ├─ After values: {...}                                 │
│  ├─ Timestamp: 2025-11-17T15:30:00Z                     │
│  └─ User: merchantId + IP address                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Email Verification Example

```
┌─────────────────────────────────────────────────────────┐
│  SCENARIO: User didn't receive verification email       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User clicks "Resend Verification Email"              │
│                                                          │
│  2. Frontend sends request:                              │
│     POST /api/merchant/auth/resend-verification         │
│     { "email": "merchant@example.com" }                 │
│                                                          │
│  3. Backend process:                                     │
│     ├─ Find merchant ✓                                  │
│     ├─ Check verified status: false ✓                   │
│     ├─ Generate token: "a1b2c3d4e5f6..."               │
│     ├─ Hash token: "7f8e9d..."                          │
│     ├─ Set expiry: 24 hours                             │
│     └─ Save to database ✓                               │
│                                                          │
│  4. Email sent via SendGrid:                             │
│     To: merchant@example.com                            │
│     Subject: "Verify Your Email Address"                │
│     Link: https://app.com/verify-email/a1b2c3d4e5f6...  │
│                                                          │
│  5. User clicks link in email                            │
│                                                          │
│  6. Frontend verifies token (existing endpoint)          │
│                                                          │
│  7. User now verified ✓                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Quick Checklist for Frontend Integration

```
ENDPOINT INTEGRATION CHECKLIST:

[ ] Token Refresh
    [ ] Add API client method
    [ ] Implement auto-refresh before expiry
    [ ] Add axios interceptor for 401
    [ ] Store new token in storage
    [ ] Update UI state with new merchant data

[ ] Profile Update
    [ ] Create profile settings page
    [ ] Add form with validation
    [ ] Phone number formatting
    [ ] Logo upload/display
    [ ] Show success/error messages
    [ ] Refresh merchant data after update

[ ] Resend Verification
    [ ] Add button in UI
    [ ] Show verification status
    [ ] Display success message
    [ ] Handle already verified state
    [ ] Update status after verification
```

---

**Status: ALL ENDPOINTS READY FOR INTEGRATION ✅**
