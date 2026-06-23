# Audit Logging Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Server Already Configured ✅
The audit system is already integrated. Just start your server:
```bash
npm run dev
```

### 2. Audit Logs Are Being Created Automatically
Login and product creation already log audit entries!

### 3. View Audit Logs

**Get Recent Logs:**
```bash
GET /api/merchant/audit/logs
Authorization: Bearer YOUR_TOKEN
```

**Get Today's Activity:**
```bash
GET /api/merchant/audit/timeline/today
Authorization: Bearer YOUR_TOKEN
```

**Get Statistics:**
```bash
GET /api/merchant/audit/stats
Authorization: Bearer YOUR_TOKEN
```

## 📝 How to Add Logging to Your Route

### Step 1: Import AuditService
```typescript
import AuditService from '../services/AuditService';
```

### Step 2: Log After Operation
```typescript
// After creating/updating/deleting a resource
await AuditService.log({
  merchantId: merchant._id,
  action: 'product.created',        // See actions list below
  resourceType: 'product',          // Resource type
  resourceId: product._id,          // Resource ID
  details: {
    after: product,                 // New state
    metadata: { name: product.name } // Extra info
  },
  ipAddress: req.ip || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  severity: 'info'                  // info/warning/error/critical
});
```

## 🎯 Common Actions

| Action | When to Use |
|--------|-------------|
| `product.created` | Product created |
| `product.updated` | Product modified |
| `product.deleted` | Product deleted |
| `order.status_changed` | Order status changed |
| `auth.login` | User logged in |
| `auth.failed_login` | Login failed |
| `settings.bank_details_updated` | Bank details changed |
| `team.user_removed` | Team member removed |

**Full list:** See `AUDIT_ACTIONS_REFERENCE.md`

## 🔍 Query Examples

### Filter by Action
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  action: 'product.created'
});
```

### Filter by Date Range
```typescript
const logs = await AuditService.getAuditLogs(merchantId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
```

### Get Resource History
```typescript
const history = await AuditService.getResourceHistory('product', productId);
```

### Get User Activity
```typescript
const activity = await AuditService.getUserActivity(userId);
```

## 📊 Export Logs

### CSV Export
```bash
GET /api/merchant/audit/export?format=csv&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer YOUR_TOKEN
```

### Excel Export
```bash
GET /api/merchant/audit/export?format=xlsx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer YOUR_TOKEN
```

## 🚨 Automated Alerts

Alerts are automatically sent for:
- Multiple failed login attempts (3+)
- Bulk deletions (>10 items)
- Bank details changes
- Suspicious logins
- Security events

**Email alerts** are sent automatically. Configure in `.env`:
```env
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=your_email
```

## 📈 Activity Timeline

### Get Timeline View
```bash
GET /api/merchant/audit/timeline
Authorization: Bearer YOUR_TOKEN
```

### Get Activity Heatmap
```bash
GET /api/merchant/audit/timeline/heatmap?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer YOUR_TOKEN
```

### Get Critical Events Only
```bash
GET /api/merchant/audit/timeline/critical
Authorization: Bearer YOUR_TOKEN
```

## 🔐 Compliance

### Get Compliance Report
```bash
GET /api/merchant/audit/retention/compliance
Authorization: Bearer YOUR_TOKEN
```

### Get Storage Stats
```bash
GET /api/merchant/audit/retention/stats
Authorization: Bearer YOUR_TOKEN
```

### Manual Cleanup
```bash
POST /api/merchant/audit/retention/cleanup
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "retentionDays": 365,
  "autoArchive": true
}
```

## 💡 Pro Tips

### 1. Use Severity Levels Wisely
- `info` - Normal operations (create, read, update)
- `warning` - Important events (delete, cancel)
- `error` - Failed operations
- `critical` - Security/compliance events

### 2. Include Metadata
```typescript
details: {
  metadata: {
    productName: 'Widget X',
    previousPrice: 10,
    newPrice: 15,
    reason: 'Seasonal sale'
  }
}
```

### 3. Track Before/After States
```typescript
details: {
  before: oldProduct,
  after: newProduct,
  changes: detectChanges(oldProduct, newProduct)
}
```

### 4. Use Change Detector
```typescript
import { detectChanges } from '../utils/changeDetector';

const changes = detectChanges(before, after);
// Returns: [{ field: 'price', before: 10, after: 15, type: 'modified' }]
```

## 📚 Full Documentation

- **Implementation Guide:** `WEEK6_PHASE4C_AUDIT_LOGGING.md`
- **Actions Reference:** `AUDIT_ACTIONS_REFERENCE.md`
- **Compliance Guide:** `COMPLIANCE_GUIDE.md`
- **Completion Summary:** `PHASE4C_COMPLETION_SUMMARY.md`

## 🆘 Troubleshooting

**Logs not appearing?**
- Check MongoDB connection
- Verify merchant ID is correct
- Check console for errors

**Export not working?**
- Check date range
- Verify logs exist for period
- Check file permissions

**Alerts not sending?**
- Verify SendGrid configuration
- Check alert rules
- Review email service logs

## 📞 Quick Reference

| Need | Endpoint |
|------|----------|
| Recent logs | `GET /api/merchant/audit/logs` |
| Today's activity | `GET /api/merchant/audit/timeline/today` |
| Export CSV | `GET /api/merchant/audit/export?format=csv` |
| Statistics | `GET /api/merchant/audit/stats` |
| Compliance report | `GET /api/merchant/audit/retention/compliance` |

## ✅ Checklist for New Routes

When adding audit logging to a new route:

- [ ] Import AuditService
- [ ] Choose appropriate action name
- [ ] Determine severity level
- [ ] Capture before state (if updating)
- [ ] Log after successful operation
- [ ] Include relevant metadata
- [ ] Test the logging

**That's it! You're ready to use the audit logging system! 🎉**
