# RBAC Permissions Reference

## Quick Reference Matrix

| Permission | Owner | Admin | Manager | Staff | Description |
|-----------|-------|-------|---------|-------|-------------|
| **Products** |
| products:view | ✅ | ✅ | ✅ | ✅ | View products |
| products:create | ✅ | ✅ | ✅ | ❌ | Create new products |
| products:edit | ✅ | ✅ | ✅ | ❌ | Edit existing products |
| products:delete | ✅ | ✅ | ❌ | ❌ | Delete products |
| products:bulk_import | ✅ | ✅ | ❌ | ❌ | Bulk import products |
| products:export | ✅ | ✅ | ✅ | ❌ | Export products |
| **Orders** |
| orders:view | ✅ | ✅ | ✅ | ✅ | View orders |
| orders:view_all | ✅ | ✅ | ✅ | ❌ | View all order details |
| orders:update_status | ✅ | ✅ | ✅ | ✅ | Update order status |
| orders:cancel | ✅ | ✅ | ✅ | ❌ | Cancel orders |
| orders:refund | ✅ | ✅ | ❌ | ❌ | Process refunds |
| orders:export | ✅ | ✅ | ✅ | ❌ | Export orders |
| **Team Management** |
| team:view | ✅ | ✅ | ❌ | ❌ | View team members |
| team:invite | ✅ | ✅ | ❌ | ❌ | Invite team members |
| team:remove | ✅ | ✅ | ❌ | ❌ | Remove team members |
| team:change_role | ✅ | ❌ | ❌ | ❌ | Change team member roles |
| team:change_status | ✅ | ✅ | ❌ | ❌ | Change team member status |
| **Analytics** |
| analytics:view | ✅ | ✅ | ✅ | ❌ | View analytics |
| analytics:view_revenue | ✅ | ✅ | ❌ | ❌ | View revenue analytics |
| analytics:view_costs | ✅ | ❌ | ❌ | ❌ | View cost analytics |
| analytics:export | ✅ | ✅ | ❌ | ❌ | Export analytics |
| **Settings** |
| settings:view | ✅ | ✅ | ❌ | ❌ | View settings |
| settings:edit | ✅ | ❌ | ❌ | ❌ | Edit all settings |
| settings:edit_basic | ✅ | ✅ | ❌ | ❌ | Edit basic settings |
| **Billing** |
| billing:view | ✅ | ❌ | ❌ | ❌ | View billing |
| billing:manage | ✅ | ❌ | ❌ | ❌ | Manage billing |
| billing:view_invoices | ✅ | ❌ | ❌ | ❌ | View invoices |
| **Customers** |
| customers:view | ✅ | ✅ | ✅ | ✅ | View customers |
| customers:edit | ✅ | ✅ | ✅ | ❌ | Edit customers |
| customers:delete | ✅ | ✅ | ❌ | ❌ | Delete customers |
| customers:export | ✅ | ✅ | ✅ | ❌ | Export customers |
| **Promotions** |
| promotions:view | ✅ | ✅ | ✅ | ❌ | View promotions |
| promotions:create | ✅ | ✅ | ✅ | ❌ | Create promotions |
| promotions:edit | ✅ | ✅ | ✅ | ❌ | Edit promotions |
| promotions:delete | ✅ | ✅ | ❌ | ❌ | Delete promotions |
| **Reviews** |
| reviews:view | ✅ | ✅ | ✅ | ✅ | View reviews |
| reviews:respond | ✅ | ✅ | ✅ | ❌ | Respond to reviews |
| reviews:delete | ✅ | ✅ | ❌ | ❌ | Delete reviews |
| **Notifications** |
| notifications:view | ✅ | ✅ | ✅ | ✅ | View notifications |
| notifications:send | ✅ | ✅ | ✅ | ❌ | Send notifications |
| **Reports** |
| reports:view | ✅ | ✅ | ✅ | ❌ | View reports |
| reports:export | ✅ | ✅ | ✅ | ❌ | Export reports |
| reports:view_detailed | ✅ | ✅ | ❌ | ❌ | View detailed reports |
| **Inventory** |
| inventory:view | ✅ | ✅ | ✅ | ✅ | View inventory |
| inventory:edit | ✅ | ✅ | ✅ | ❌ | Edit inventory |
| inventory:bulk_update | ✅ | ✅ | ❌ | ❌ | Bulk update inventory |
| **Categories** |
| categories:view | ✅ | ✅ | ✅ | ✅ | View categories |
| categories:create | ✅ | ✅ | ✅ | ❌ | Create categories |
| categories:edit | ✅ | ✅ | ✅ | ❌ | Edit categories |
| categories:delete | ✅ | ✅ | ❌ | ❌ | Delete categories |
| **Store Profile** |
| profile:view | ✅ | ✅ | ✅ | ✅ | View store profile |
| profile:edit | ✅ | ✅ | ❌ | ❌ | Edit store profile |
| **Activity Logs** |
| logs:view | ✅ | ✅ | ❌ | ❌ | View activity logs |
| logs:export | ✅ | ❌ | ❌ | ❌ | Export activity logs |
| **API Access** |
| api:access | ✅ | ✅ | ❌ | ❌ | Access API |
| api:manage_keys | ✅ | ❌ | ❌ | ❌ | Manage API keys |

## Role Descriptions

### 👑 Owner
**Full Control** - The merchant account creator

**Can:**
- Everything an Admin can do
- Manage billing and subscription
- View and manage all financial data
- Delete the merchant account
- Change team member roles (including promoting to Admin)
- Export activity logs
- Manage API keys

**Cannot:**
- Be removed from the system
- Have their role changed

**Use Case:** Business owner or primary stakeholder

---

### 🛡️ Admin
**High-Level Management** - Trusted team member with broad access

**Can:**
- Manage products (create, edit, delete)
- Process orders and refunds
- Invite and remove team members
- Suspend/activate team members
- View all analytics including revenue
- Manage store settings (except critical settings)
- Export data (products, orders, customers)
- Access API

**Cannot:**
- View or manage billing
- Delete the merchant account
- Change team member roles
- View cost analytics
- Export activity logs
- Manage API keys

**Use Case:** Store manager, operations manager

---

### 📊 Manager
**Operational Management** - Can handle day-to-day operations

**Can:**
- Create and edit products (no delete)
- Manage orders and cancel them
- View analytics (limited)
- Update inventory
- Create and edit promotions
- Respond to reviews
- Send notifications
- Export reports

**Cannot:**
- Delete products
- Process refunds
- View or manage team
- View revenue or cost data
- Manage settings
- Manage billing

**Use Case:** Assistant manager, department lead

---

### 👤 Staff
**Basic Operations** - Limited access for frontline staff

**Can:**
- View products and inventory
- View orders
- Update order status
- View customers
- View reviews
- View notifications

**Cannot:**
- Edit or create anything
- Delete anything
- View analytics
- Manage team
- Access settings
- Process refunds

**Use Case:** Sales staff, customer service representative

## Permission Categories

### 🛍️ Product Management
Controls access to product catalog operations

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View product list | products:view | Staff |
| View product details | products:view | Staff |
| Create product | products:create | Manager |
| Edit product | products:edit | Manager |
| Delete product | products:delete | Admin |
| Bulk import | products:bulk_import | Admin |
| Export products | products:export | Manager |

### 📦 Order Management
Controls order processing and fulfillment

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View order list | orders:view | Staff |
| View order details | orders:view_all | Manager |
| Update status | orders:update_status | Staff |
| Cancel order | orders:cancel | Manager |
| Process refund | orders:refund | Admin |
| Export orders | orders:export | Manager |

### 👥 Team Management
Controls team member administration

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View team members | team:view | Admin |
| Invite member | team:invite | Admin |
| Remove member | team:remove | Admin |
| Change role | team:change_role | Owner |
| Suspend/activate | team:change_status | Admin |

### 📈 Analytics & Reports
Controls access to business intelligence

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View dashboard | analytics:view | Manager |
| View revenue | analytics:view_revenue | Admin |
| View costs | analytics:view_costs | Owner |
| Export analytics | analytics:export | Admin |
| View reports | reports:view | Manager |
| Export reports | reports:export | Manager |
| Detailed reports | reports:view_detailed | Admin |

### ⚙️ Settings & Configuration
Controls store configuration access

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View settings | settings:view | Admin |
| Edit basic settings | settings:edit_basic | Admin |
| Edit all settings | settings:edit | Owner |

### 💰 Billing & Finance
Controls financial operations (Owner only)

| Action | Required Permission | Minimum Role |
|--------|-------------------|--------------|
| View billing | billing:view | Owner |
| Manage billing | billing:manage | Owner |
| View invoices | billing:view_invoices | Owner |

## Common Use Cases

### Use Case 1: Onboarding New Admin
```
1. Owner invites admin with email
2. Admin receives invitation email
3. Admin accepts and sets password
4. Admin can now:
   - Manage products
   - Process orders and refunds
   - Invite more team members
   - View analytics
```

### Use Case 2: Temporary Staff Member
```
1. Admin invites staff member
2. Staff accepts invitation
3. Staff can:
   - View products and orders
   - Update order status
   - View customer info
4. When staff leaves:
   - Admin suspends account
   - Or Owner/Admin removes staff
```

### Use Case 3: Seasonal Manager
```
1. Owner/Admin invites manager
2. Manager accepts
3. Manager can:
   - Create/edit products
   - Manage orders
   - Run promotions
4. After season:
   - Account can be suspended (keep data)
   - Or removed (delete access)
```

### Use Case 4: Role Promotion
```
1. Manager performing well
2. Owner changes role to Admin
3. Manager now has Admin permissions
4. Can invite team members
5. Can manage critical operations
```

## Security Best Practices

### ✅ Do's
- ✅ Invite team members with appropriate roles
- ✅ Regularly review team member access
- ✅ Suspend accounts instead of deleting (keeps audit trail)
- ✅ Use owner account only for critical operations
- ✅ Enable 2FA for Admin and Owner accounts (when available)
- ✅ Review audit logs regularly

### ❌ Don'ts
- ❌ Share account credentials
- ❌ Give everyone Admin access
- ❌ Leave suspended accounts active indefinitely
- ❌ Use Owner account for day-to-day operations
- ❌ Ignore failed login attempts

## Quick Decision Guide

**Need someone to:**
- **Handle daily operations?** → Manager
- **Manage team and critical data?** → Admin
- **Take calls and update orders?** → Staff
- **Full business control?** → Owner (can't be assigned)

## API Permission Checks

### In Code
```typescript
// Check single permission
if (hasPermission(userRole, 'products:delete')) {
  // Allow delete
}

// Check multiple (any)
if (hasAnyPermission(userRole, ['analytics:view', 'reports:view'])) {
  // Show analytics
}

// Check multiple (all)
if (hasAllPermissions(userRole, ['products:create', 'products:bulk_import'])) {
  // Allow bulk import
}
```

### In Routes
```typescript
// Single permission
router.delete('/products/:id',
  authMiddleware,
  checkPermission('products:delete'),
  deleteProduct
);

// Role-based
router.delete('/account',
  authMiddleware,
  requireOwner,
  deleteAccount
);

// Multiple permissions
router.post('/bulk-import',
  authMiddleware,
  checkAllPermissions(['products:create', 'products:bulk_import']),
  bulkImport
);
```

## Troubleshooting

### "Forbidden: Insufficient permissions"
- **Check:** User role and required permission
- **Solution:** User needs higher role or contact owner

### "Account is suspended"
- **Check:** User status in team management
- **Solution:** Owner/Admin must activate account

### "Cannot change role of owner"
- **Check:** Trying to modify owner role
- **Solution:** Owner role cannot be changed

### "Cannot remove yourself"
- **Check:** User trying to remove their own account
- **Solution:** Have another admin remove you

## Future Permission Extensions

Planned additions:
- Custom permission sets
- Time-based permissions
- Location-based permissions
- IP-restricted permissions
- Two-factor required permissions
- Department-specific permissions

---

**Last Updated:** 2024-02-01
**Version:** 1.0.0
**Maintained by:** Development Team
