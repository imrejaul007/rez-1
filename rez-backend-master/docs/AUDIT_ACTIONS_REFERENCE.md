# Audit Actions Reference

Complete list of all audit log actions tracked in the merchant backend.

## Authentication Actions (auth.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `auth.login` | Successful user login | info | ❌ |
| `auth.logout` | User logout | info | ❌ |
| `auth.failed_login` | Failed login attempt | warning | ✅ (3+ attempts) |
| `auth.password_reset` | Password reset requested | info | ❌ |
| `auth.password_changed` | Password successfully changed | info | ❌ |
| `auth.email_verified` | Email address verified | info | ❌ |
| `auth.2fa_enabled` | Two-factor auth enabled/disabled | info | ❌ |

## Product Actions (product.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `product.created` | New product created | info | ❌ |
| `product.updated` | Product modified | info | ❌ |
| `product.deleted` | Product deleted | warning | ❌ |
| `product.bulk_imported` | Products imported in bulk | info | ❌ |
| `product.bulk_updated` | Products updated in bulk | info | ❌ |
| `product.bulk_deleted` | Products deleted in bulk | warning | ✅ (>10 products) |
| `product.variant_added` | Product variant added | info | ❌ |
| `product.variant_updated` | Product variant updated | info | ❌ |
| `product.variant_deleted` | Product variant deleted | info | ❌ |
| `product.stock_changed` | Inventory level changed | info | ❌ |

## Order Actions (order.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `order.status_changed` | Order status updated | info | ❌ |
| `order.assigned` | Order assigned to team member | info | ❌ |
| `order.cancelled` | Order cancelled | warning | ✅ |
| `order.refunded` | Order refunded | warning | ❌ |
| `order.invoice_generated` | Invoice created | info | ❌ |
| `order.label_generated` | Shipping label created | info | ❌ |

## Store Actions (store.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `store.created` | Store created | info | ❌ |
| `store.updated` | Store settings changed | info | ❌ |
| `store.logo_updated` | Store logo changed | info | ❌ |
| `store.banner_updated` | Store banner changed | info | ❌ |
| `store.status_changed` | Store activated/deactivated | warning | ✅ (deactivated) |

## Team Actions (team.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `team.user_invited` | Team member invited | info | ❌ |
| `team.user_accepted` | Invitation accepted | info | ❌ |
| `team.user_removed` | Team member removed | warning | ✅ |
| `team.role_changed` | User role updated | info | ❌ |
| `team.user_suspended` | User account suspended | warning | ❌ |
| `team.user_reactivated` | User account reactivated | info | ❌ |

## Settings Actions (settings.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `settings.updated` | General settings changed | info | ❌ |
| `settings.bank_details_updated` | Bank account details changed | critical | ✅ |
| `settings.notification_preferences_updated` | Notification settings changed | info | ❌ |

## Security Actions (security.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `security.suspicious_login` | Login from new location/IP | critical | ✅ |
| `security.api_key_created` | API key generated | warning | ✅ |
| `security.api_key_deleted` | API key deleted | warning | ✅ |
| `security.permission_denied` | Access denied | warning | ❌ |
| `security.multiple_failed_logins` | Multiple failed login attempts | critical | ✅ |
| `security.bulk_deletion_warning` | Large bulk deletion detected | critical | ✅ |

## API Actions (api.*)

| Action | Description | Severity | Alert |
|--------|-------------|----------|-------|
| `api.post` | POST request executed | info | ❌ |
| `api.put` | PUT request executed | info | ❌ |
| `api.patch` | PATCH request executed | info | ❌ |
| `api.delete` | DELETE request executed | info | ❌ |

## How to Add Custom Actions

### 1. Define Action Name
Follow naming convention: `<resource>.<action>`
- Resource: product, order, store, team, settings, security, etc.
- Action: created, updated, deleted, changed, etc.

### 2. Log the Action
```typescript
import AuditService from '../services/AuditService';

await AuditService.log({
  merchantId: merchant._id,
  merchantUserId: user?._id,
  action: 'custom.action_name',
  resourceType: 'custom',
  resourceId: resource._id,
  details: {
    before: oldState,
    after: newState,
    metadata: { key: 'value' }
  },
  ipAddress: req.ip || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  severity: 'info' // or 'warning', 'error', 'critical'
});
```

### 3. Add Alert Rule (Optional)
```typescript
import AuditAlertService from '../services/AuditAlertService';

AuditAlertService.addRule({
  name: 'Custom Action Alert',
  condition: (log) => log.action === 'custom.action_name',
  severity: 'high',
  notification: { email: true, sms: false }
});
```

## Action Naming Best Practices

### ✅ Good Examples
- `product.created` - Clear resource and action
- `order.status_changed` - Specific change
- `settings.bank_details_updated` - Descriptive
- `security.suspicious_login` - Clear context

### ❌ Bad Examples
- `created` - Missing resource
- `product` - Missing action
- `product_created` - Use dot notation
- `PRODUCT.CREATED` - Use lowercase

## Severity Guidelines

| Severity | When to Use | Examples |
|----------|-------------|----------|
| **info** | Normal operations | Create, read, update (non-critical) |
| **warning** | Noteworthy events | Delete, cancel, suspend |
| **error** | Failed operations | Validation errors, payment failures |
| **critical** | Security/compliance | Bank details, suspicious activity, bulk deletions |

## Querying Actions

### By Action Type
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  action: 'product.created'
});
```

### By Resource Type
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  resourceType: 'product'
});
```

### By Severity
```typescript
const criticalLogs = await AuditService.getAuditLogs(merchantId, {
  severity: 'critical'
});
```

### By Date Range
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
```

### Combined Filters
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  resourceType: 'product',
  action: 'product.deleted',
  severity: 'warning',
  startDate: lastWeek,
  endDate: now,
  page: 1,
  limit: 50
});
```

## Action Statistics

Get action frequency:
```typescript
const stats = await AuditService.getAuditStats(merchantId);

console.log(stats.logsByAction);
// {
//   "product.updated": 523,
//   "order.status_changed": 312,
//   "auth.login": 89,
//   ...
// }
```

## Resource History

Get complete history for a resource:
```typescript
const history = await AuditService.getResourceHistory('product', productId);

// Returns chronological list of all actions on this product
```

## Total Actions Tracked: 40+

- Authentication: 7 actions
- Products: 10 actions
- Orders: 6 actions
- Store: 5 actions
- Team: 6 actions
- Settings: 3 actions
- Security: 6 actions
- API: 4 actions

**Easily extensible to track custom actions as needed!**
