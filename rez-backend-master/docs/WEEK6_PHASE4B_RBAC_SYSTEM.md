# Week 6 Phase 4B: RBAC System Implementation Guide

## Overview

This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented for merchant multi-user support.

## Architecture

### Core Components

1. **MerchantUser Model** (`src/models/MerchantUser.ts`)
   - Stores team member accounts
   - Links to parent Merchant via merchantId
   - Supports roles: owner, admin, manager, staff
   - Tracks invitation status and acceptance

2. **Permission System** (`src/config/permissions.ts`)
   - Defines all available permissions
   - Maps permissions to roles
   - Provides helper functions for permission checks

3. **RBAC Middleware** (`src/middleware/rbac.ts`)
   - Enforces permission-based access control
   - Supports single permission, any permission, and all permissions checks
   - Role-based access control

4. **Team Invitation Service** (`src/services/TeamInvitationService.ts`)
   - Handles team member invitation flow
   - Generates secure invitation tokens
   - Sends invitation emails
   - Manages invitation acceptance

5. **Team Routes** (`src/merchantroutes/team.ts`, `src/merchantroutes/team-public.ts`)
   - Protected routes for team management (owner/admin only)
   - Public routes for invitation acceptance

## User Roles

### Owner
- **Auto-assigned** to merchant account creator
- **Full access** to all features
- Can manage billing and subscription
- Can delete account
- Cannot be removed or have role changed

### Admin
- Can manage products (create, edit, delete)
- Can manage orders and process refunds
- Can invite and manage team members
- Can view all analytics
- Can manage store settings
- **CANNOT**: Manage billing, delete account, change roles to owner

### Manager
- Can create and edit products (no delete)
- Can manage orders
- Can view analytics
- Can update inventory
- **CANNOT**: Delete products, manage team, manage settings

### Staff
- View-only access to products and orders
- Can update order status
- **CANNOT**: Edit products, view analytics, manage team

## Permission System

### Permission Format
Permissions follow the format: `resource:action`

Examples:
- `products:view` - View products
- `products:create` - Create new products
- `orders:refund` - Process refunds
- `team:invite` - Invite team members

### Available Permissions

#### Products
- `products:view` - All roles
- `products:create` - Owner, Admin, Manager
- `products:edit` - Owner, Admin, Manager
- `products:delete` - Owner, Admin only
- `products:bulk_import` - Owner, Admin only
- `products:export` - Owner, Admin, Manager

#### Orders
- `orders:view` - All roles
- `orders:update_status` - All roles
- `orders:cancel` - Owner, Admin, Manager
- `orders:refund` - Owner, Admin only

#### Team Management
- `team:view` - Owner, Admin
- `team:invite` - Owner, Admin
- `team:remove` - Owner, Admin
- `team:change_role` - Owner only
- `team:change_status` - Owner, Admin

#### Analytics
- `analytics:view` - Owner, Admin, Manager
- `analytics:view_revenue` - Owner, Admin
- `analytics:view_costs` - Owner only
- `analytics:export` - Owner, Admin

#### Settings
- `settings:view` - Owner, Admin
- `settings:edit` - Owner only

#### Billing
- `billing:view` - Owner only
- `billing:manage` - Owner only

[See `src/config/permissions.ts` for complete permission list]

## Implementation Guide

### 1. Protect Routes with RBAC

```typescript
import { checkPermission, requireRole } from '../middleware/rbac';

// Check single permission
router.post('/products', checkPermission('products:create'), createProduct);

// Require specific role
router.delete('/account', requireRole('owner'), deleteAccount);

// Check multiple permissions (any)
router.get('/analytics',
  checkAnyPermission(['analytics:view', 'reports:view']),
  getAnalytics
);

// Check multiple permissions (all)
router.post('/bulk-import',
  checkAllPermissions(['products:create', 'products:bulk_import']),
  bulkImport
);
```

### 2. Team Member Invitation Flow

#### Step 1: Owner/Admin invites team member
```http
POST /api/merchant/team/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john@example.com",
  "name": "John Doe",
  "role": "admin"
}
```

Response:
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitationId": "64a5b8c9d3e4f5g6h7i8j9k0",
    "expiresAt": "2024-02-01T12:00:00.000Z"
  }
}
```

#### Step 2: Team member receives email with invitation link
Email contains link: `https://yourapp.com/team/accept-invitation/{token}`

#### Step 3: Team member validates invitation
```http
GET /api/merchant/team-public/validate-invitation/{token}
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "invitation": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "businessName": "Acme Corp",
      "expiresAt": "2024-02-01T12:00:00.000Z"
    }
  }
}
```

#### Step 4: Team member accepts invitation and sets password
```http
POST /api/merchant/team-public/accept-invitation/{token}
Content-Type: application/json

{
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123"
}
```

Response:
```json
{
  "success": true,
  "message": "Invitation accepted successfully! You can now login with your credentials.",
  "data": {
    "email": "john@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

#### Step 5: Team member logs in
```http
POST /api/merchant/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "admin",
    "permissions": ["products:view", "products:create", ...],
    "merchant": {
      "id": "64a5b8c9d3e4f5g6h7i8j9k0",
      "businessName": "Acme Corp",
      "email": "john@example.com",
      "verificationStatus": "verified",
      "isActive": true
    },
    "user": {
      "id": "64a5b8c9d3e4f5g6h7i8j9k1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### 3. Team Management Operations

#### List all team members
```http
GET /api/merchant/team
Authorization: Bearer <token>
```

#### Update team member role (Owner only)
```http
PUT /api/merchant/team/{userId}/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "manager"
}
```

#### Suspend team member (Owner/Admin)
```http
PUT /api/merchant/team/{userId}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "suspended"
}
```

#### Remove team member (Owner/Admin)
```http
DELETE /api/merchant/team/{userId}
Authorization: Bearer <token>
```

#### Resend invitation
```http
POST /api/merchant/team/{userId}/resend-invite
Authorization: Bearer <token>
```

#### Get current user's permissions
```http
GET /api/merchant/team/me/permissions
Authorization: Bearer <token>
```

## JWT Token Structure

### Owner Login
```json
{
  "merchantId": "64a5b8c9d3e4f5g6h7i8j9k0",
  "role": "owner",
  "permissions": ["all_permissions"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Team Member Login
```json
{
  "merchantId": "64a5b8c9d3e4f5g6h7i8j9k0",
  "merchantUserId": "64a5b8c9d3e4f5g6h7i8j9k1",
  "role": "admin",
  "permissions": ["products:view", "products:create", ...],
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Authentication Flow

### Updated Auth Middleware
The `authMiddleware` now supports both Merchant (owner) and MerchantUser (team member) authentication:

1. Extracts and verifies JWT token
2. Loads Merchant data using merchantId from token
3. If token contains merchantUserId, loads MerchantUser data
4. Checks account status (active/suspended)
5. Checks account lock status
6. Attaches data to request:
   - `req.merchantId` - Always present
   - `req.merchant` - Always present
   - `req.merchantUser` - Present for team members only

## Database Schema

### MerchantUser Collection
```javascript
{
  _id: ObjectId,
  merchantId: ObjectId,  // References Merchant
  email: String,
  password: String,  // Hashed
  name: String,
  role: String,  // 'owner' | 'admin' | 'manager' | 'staff'
  permissions: [String],
  status: String,  // 'active' | 'inactive' | 'suspended'
  invitedBy: ObjectId,  // References MerchantUser
  invitedAt: Date,
  acceptedAt: Date,
  lastLoginAt: Date,
  invitationToken: String,
  invitationExpiry: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  failedLoginAttempts: Number,
  accountLockedUntil: Date,
  lastLoginIP: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ merchantId: 1, email: 1 }` - Unique compound index
- `{ merchantId: 1, role: 1 }`
- `{ merchantId: 1, status: 1 }`
- `{ invitationToken: 1 }`

## Security Features

### 1. Invitation Security
- Tokens expire after 24 hours
- Tokens are hashed before storage
- One-time use tokens
- Can be resent with new token

### 2. Account Security
- Password hashing with bcrypt
- Failed login attempt tracking
- Account lockout after 5 failed attempts (30 minutes)
- Account suspension by admin/owner
- Login IP tracking

### 3. Permission Enforcement
- Middleware-based permission checks
- Role-based access control
- Status checks (active/suspended)
- Lock checks

## Migration Guide for Existing Merchants

### Automatic Owner Assignment
When a merchant registers, they are automatically assigned the 'owner' role. No migration needed for existing merchants - they will continue to authenticate as owners.

### Creating Owner Record (Optional)
If you want to create MerchantUser records for existing merchants:

```typescript
import { Merchant } from './models/Merchant';
import { MerchantUser } from './models/MerchantUser';
import { getPermissionsForRole } from './config/permissions';

async function createOwnerRecords() {
  const merchants = await Merchant.find({});

  for (const merchant of merchants) {
    // Check if owner record already exists
    const existingOwner = await MerchantUser.findOne({
      merchantId: merchant._id,
      role: 'owner'
    });

    if (!existingOwner) {
      // Create owner record
      const owner = new MerchantUser({
        merchantId: merchant._id,
        email: merchant.email,
        password: merchant.password, // Already hashed
        name: merchant.ownerName,
        role: 'owner',
        permissions: getPermissionsForRole('owner'),
        status: 'active',
        invitedBy: merchant._id, // Self-invited
        invitedAt: merchant.createdAt,
        acceptedAt: merchant.createdAt
      });

      await owner.save();
      console.log(`Created owner record for ${merchant.businessName}`);
    }
  }
}
```

## Testing Guide

### 1. Test Owner Login
```bash
# Login as merchant owner
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@acme.com",
    "password": "password123"
  }'
```

### 2. Test Team Invitation
```bash
# Invite team member (as owner)
curl -X POST http://localhost:5001/api/merchant/team/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <owner_token>" \
  -d '{
    "email": "admin@acme.com",
    "name": "Admin User",
    "role": "admin"
  }'
```

### 3. Test Invitation Acceptance
```bash
# Accept invitation
curl -X POST http://localhost:5001/api/merchant/team-public/accept-invitation/{token} \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123"
  }'
```

### 4. Test Team Member Login
```bash
# Login as team member
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "SecurePass123"
  }'
```

### 5. Test Permission Enforcement
```bash
# Try to access protected route
curl -X GET http://localhost:5001/api/merchant/team \
  -H "Authorization: Bearer <team_member_token>"
```

### 6. Test Role Change (Owner only)
```bash
# Change team member role
curl -X PUT http://localhost:5001/api/merchant/team/{userId}/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <owner_token>" \
  -d '{
    "role": "manager"
  }'
```

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

#### 403 Forbidden (Insufficient permissions)
```json
{
  "success": false,
  "message": "Forbidden: Insufficient permissions",
  "required": "team:invite",
  "userRole": "staff"
}
```

#### 403 Forbidden (Suspended account)
```json
{
  "success": false,
  "message": "Account is suspended. Please contact your administrator."
}
```

#### 423 Locked (Account locked)
```json
{
  "success": false,
  "message": "Account is locked due to multiple failed login attempts. Please try again in 25 minutes or reset your password.",
  "lockedUntil": "2024-02-01T12:25:00.000Z"
}
```

## Maintenance Tasks

### Cleanup Expired Invitations
Run periodically (e.g., daily cron job):

```typescript
import TeamInvitationService from './services/TeamInvitationService';

async function cleanupInvitations() {
  const count = await TeamInvitationService.cleanupExpiredInvitations();
  console.log(`Cleaned up ${count} expired invitations`);
}

// Run daily at midnight
setInterval(cleanupInvitations, 24 * 60 * 60 * 1000);
```

## Best Practices

1. **Always use RBAC middleware** on protected routes
2. **Never bypass permission checks** in code
3. **Log all team management actions** for audit trail
4. **Send email notifications** for important actions (role changes, suspensions)
5. **Regularly clean up** expired invitations
6. **Monitor failed login attempts** across all accounts
7. **Implement 2FA** for owner accounts (future enhancement)

## Future Enhancements

1. **Custom Permissions** - Allow merchants to create custom permission sets
2. **Audit Logs** - Detailed logging of all team actions
3. **Session Management** - Active session tracking and remote logout
4. **Two-Factor Authentication** - Enhanced security for sensitive roles
5. **IP Whitelisting** - Restrict access by IP for certain roles
6. **Time-based Access** - Temporary access grants
7. **Department/Team Grouping** - Organize users into departments
8. **Activity Dashboard** - Real-time view of team member activities

## Support

For questions or issues with the RBAC system:
1. Check this documentation
2. Review `RBAC_PERMISSIONS_REFERENCE.md` for permission matrix
3. See `TEAM_MANAGEMENT_GUIDE.md` for merchant-facing guide
4. Check logs for detailed error messages

## API Reference

See individual route files for detailed API documentation:
- `src/merchantroutes/team.ts` - Protected team management endpoints
- `src/merchantroutes/team-public.ts` - Public invitation endpoints
- `src/merchantroutes/auth.ts` - Enhanced authentication with team member support
