# ReZ Auth Service API

Authentication and user identity management service for the ReZ platform.

## Overview

The Auth Service handles all authentication and authorization operations:
- OTP-based phone authentication
- PIN-based login for returning users
- Multi-factor authentication (MFA/TOTP)
- OAuth2 partner application authentication
- JWT token management
- User profile management

## Base URL

```
Production: https://api.rez.money/auth
Staging: https://staging-api.rez.money/auth
```

## Authentication

Most endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Response Format

```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  },
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "role": "user"
  }
}
```

## Endpoints

### OTP Authentication

#### POST /send-otp
Send a 6-digit OTP via SMS or WhatsApp.

**Request:**
```json
{
  "phone": "9876543210",
  "countryCode": "+91",
  "channel": "sms",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xxx",
  "isNewUser": true,
  "hasPIN": false
}
```

**Rate Limits:**
- 3 OTP sends per minute per phone number
- 5 OTP sends per 15 minutes per IP

#### POST /verify-otp
Verify the OTP and complete authentication.

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "countryCode": "+91"
}
```

**Response:**
```json
{
  "success": true,
  "isNewUser": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... }
}
```

### PIN Authentication

#### POST /login-pin
Authenticate with PIN for returning users.

**Request:**
```json
{
  "phone": "9876543210",
  "pin": "1234",
  "countryCode": "+91"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... }
}
```

**Security:**
- 5 failed attempts triggers 15-minute lockout
- PIN must be 4-6 numeric digits
- Common PINs (0000, 1234, etc.) are rejected

#### POST /auth/set-pin
Set or update PIN for the authenticated user.

**Request:**
```json
{
  "pin": "5678"
}
```

### Multi-Factor Authentication (MFA)

#### POST /auth/mfa/setup
Initialize MFA setup. Returns QR code URI for authenticator apps.

**Response:**
```json
{
  "success": true,
  "keyUri": "otpauth://totp/REZ:user@example.com?secret=...",
  "backupCodes": ["ABCD-EFGH", "IJKL-MNOP"]
}
```

#### POST /auth/mfa/verify-setup
Verify first TOTP code to enable MFA.

**Request:**
```json
{
  "code": "123456"
}
```

#### POST /auth/mfa/verify
Verify TOTP code during login.

**Request:**
```json
{
  "code": "123456"
}
```

#### DELETE /auth/mfa/disable
Disable MFA for the account.

**Request:**
```json
{
  "code": "123456"
}
```

### OAuth2 Partner Authentication

Supports partner apps: Rendez, Stay Owen, AdBazaar, REZ Now, Hotel PMS, Hotel Panel, NextaBiZ.

#### GET /oauth/authorize
Start OAuth flow. Returns consent page URL.

**Query Parameters:**
- `client_id`: Partner app client ID
- `redirect_uri`: Callback URL
- `scope`: Requested permissions
- `state`: CSRF protection token

#### POST /oauth/consent
Process user consent.

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "approved": true,
  "state": "random_state_token"
}
```

#### POST /oauth/token
Exchange authorization code for tokens.

**Request:**
```json
{
  "grant_type": "authorization_code",
  "code": "auth_code",
  "client_id": "partner_app",
  "client_secret": "secret"
}
```

#### POST /oauth/refresh
Refresh access token with rotation.

**Request:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh_token",
  "client_id": "partner_app",
  "client_secret": "secret"
}
```

**Security:** Implements refresh token rotation with reuse detection.

### Profile Management

#### GET /profile
Get unified profile with tier and LTV data.

#### GET /auth/me
Get current authenticated user.

#### PATCH /profile
Update profile fields.

**Request:**
```json
{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://..."
  },
  "preferences": {
    "language": "en",
    "notifications": { ... }
  }
}
```

### Token Management

#### POST /auth/refresh
Rotate access and refresh tokens.

#### POST /auth/logout
Blacklist tokens and end session.

#### GET /auth/validate
Validate JWT token (for API gateway).

### Internal Endpoints

Internal endpoints require `x-internal-token` header:

#### GET /internal/auth/user/:id
Get user by ID.

#### GET /internal/users?phone=:phone
Lookup user by phone number.

#### POST /internal/users/bulk
Bulk lookup users by IDs (max 1000).

#### POST /internal/users/patch-tests
Record patch test results for a customer.

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_OTP` | OTP verification failed |
| `INVALID_PIN` | PIN authentication failed |
| `ACCOUNT_LOCKED` | Too many failed attempts |
| `MFA_REQUIRED` | MFA verification needed |
| `TOKEN_EXPIRED` | JWT token expired |
| `CONCURRENT_REFRESH` | Concurrent token refresh detected |

## Security Features

- **Token Blacklisting**: Logged-out tokens are blacklisted
- **Account Lockout**: 5 failed PIN attempts = 15 min lockout
- **MFA**: TOTP with backup codes
- **Rate Limiting**: Per-phone and per-IP limits
- **Device Tracking**: Risk assessment for device fingerprinting
- **Token Rotation**: Full refresh token rotation with reuse detection

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| OTP Send | 3/min per phone, 5/15min per IP |
| PIN Login | 5 attempts then lockout |
| MFA Verify | 5 attempts then lockout |
| Profile Update | 10/min |

## Related Services

- **rez-wallet-service**: Wallet balance and transactions
- **rez-merchant-service**: Merchant authentication
- **rez-payment-service**: Payment processing
