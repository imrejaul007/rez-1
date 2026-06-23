import { MerchantUserRole } from '../models/MerchantUser';

/**
 * RBAC Permission System
 *
 * This file defines all available permissions and which roles have access to them.
 * Permissions follow the format: "resource:action"
 */

// All available permissions in the system
export const PERMISSIONS = {
  // Products
  'products:view': ['owner', 'admin', 'manager', 'staff'],
  'products:create': ['owner', 'admin', 'manager'],
  'products:edit': ['owner', 'admin', 'manager'],
  'products:delete': ['owner', 'admin'],
  'products:bulk_import': ['owner', 'admin'],
  'products:export': ['owner', 'admin', 'manager'],

  // Orders
  'orders:view': ['owner', 'admin', 'manager', 'staff'],
  'orders:view_all': ['owner', 'admin', 'manager'],
  'orders:update_status': ['owner', 'admin', 'manager', 'staff'],
  'orders:cancel': ['owner', 'admin', 'manager'],
  'orders:refund': ['owner', 'admin'],
  'orders:export': ['owner', 'admin', 'manager'],

  // Team Management
  'team:view': ['owner', 'admin'],
  'team:invite': ['owner', 'admin'],
  'team:remove': ['owner', 'admin'],
  'team:change_role': ['owner'],
  'team:change_status': ['owner', 'admin'],

  // Analytics
  'analytics:view': ['owner', 'admin', 'manager'],
  'analytics:view_revenue': ['owner', 'admin'],
  'analytics:view_costs': ['owner'],
  'analytics:export': ['owner', 'admin'],

  // Store Settings
  'settings:view': ['owner', 'admin'],
  'settings:edit': ['owner'],
  'settings:edit_basic': ['owner', 'admin'],

  // Billing & Subscription
  'billing:view': ['owner'],
  'billing:manage': ['owner'],
  'billing:view_invoices': ['owner'],

  // Customers
  'customers:view': ['owner', 'admin', 'manager', 'staff'],
  'customers:edit': ['owner', 'admin', 'manager'],
  'customers:delete': ['owner', 'admin'],
  'customers:export': ['owner', 'admin', 'manager'],

  // Promotions & Discounts
  'promotions:view': ['owner', 'admin', 'manager'],
  'promotions:create': ['owner', 'admin', 'manager'],
  'promotions:edit': ['owner', 'admin', 'manager'],
  'promotions:delete': ['owner', 'admin'],

  // Reviews & Ratings
  'reviews:view': ['owner', 'admin', 'manager', 'staff'],
  'reviews:respond': ['owner', 'admin', 'manager'],
  'reviews:delete': ['owner', 'admin'],

  // Notifications
  'notifications:view': ['owner', 'admin', 'manager', 'staff'],
  'notifications:send': ['owner', 'admin', 'manager'],

  // Reports
  'reports:view': ['owner', 'admin', 'manager'],
  'reports:export': ['owner', 'admin', 'manager'],
  'reports:view_detailed': ['owner', 'admin'],

  // Inventory
  'inventory:view': ['owner', 'admin', 'manager', 'staff'],
  'inventory:edit': ['owner', 'admin', 'manager'],
  'inventory:bulk_update': ['owner', 'admin'],

  // Categories
  'categories:view': ['owner', 'admin', 'manager', 'staff'],
  'categories:create': ['owner', 'admin', 'manager'],
  'categories:edit': ['owner', 'admin', 'manager'],
  'categories:delete': ['owner', 'admin'],

  // Store Profile
  'profile:view': ['owner', 'admin', 'manager', 'staff'],
  'profile:edit': ['owner', 'admin'],

  // Activity Logs
  'logs:view': ['owner', 'admin'],
  'logs:export': ['owner'],

  // API Access
  'api:access': ['owner', 'admin'],
  'api:manage_keys': ['owner']
} as const;

// Type for permission keys
export type Permission = keyof typeof PERMISSIONS;

/**
 * Role-based permission sets
 * These are the default permissions assigned to each role
 */
export const ROLE_PERMISSIONS: Record<MerchantUserRole, Permission[]> = {
  owner: Object.keys(PERMISSIONS) as Permission[], // Owner has all permissions

  admin: [
    // Products
    'products:view',
    'products:create',
    'products:edit',
    'products:delete',
    'products:bulk_import',
    'products:export',

    // Orders
    'orders:view',
    'orders:view_all',
    'orders:update_status',
    'orders:cancel',
    'orders:refund',
    'orders:export',

    // Team
    'team:view',
    'team:invite',
    'team:remove',
    'team:change_status',

    // Analytics
    'analytics:view',
    'analytics:view_revenue',
    'analytics:export',

    // Settings
    'settings:view',
    'settings:edit_basic',

    // Customers
    'customers:view',
    'customers:edit',
    'customers:delete',
    'customers:export',

    // Promotions
    'promotions:view',
    'promotions:create',
    'promotions:edit',
    'promotions:delete',

    // Reviews
    'reviews:view',
    'reviews:respond',
    'reviews:delete',

    // Notifications
    'notifications:view',
    'notifications:send',

    // Reports
    'reports:view',
    'reports:export',
    'reports:view_detailed',

    // Inventory
    'inventory:view',
    'inventory:edit',
    'inventory:bulk_update',

    // Categories
    'categories:view',
    'categories:create',
    'categories:edit',
    'categories:delete',

    // Profile
    'profile:view',
    'profile:edit',

    // Logs
    'logs:view',

    // API
    'api:access'
  ],

  manager: [
    // Products
    'products:view',
    'products:create',
    'products:edit',
    'products:export',

    // Orders
    'orders:view',
    'orders:view_all',
    'orders:update_status',
    'orders:cancel',
    'orders:export',

    // Analytics
    'analytics:view',

    // Customers
    'customers:view',
    'customers:edit',
    'customers:export',

    // Promotions
    'promotions:view',
    'promotions:create',
    'promotions:edit',

    // Reviews
    'reviews:view',
    'reviews:respond',

    // Notifications
    'notifications:view',
    'notifications:send',

    // Reports
    'reports:view',
    'reports:export',

    // Inventory
    'inventory:view',
    'inventory:edit',

    // Categories
    'categories:view',
    'categories:create',
    'categories:edit',

    // Profile
    'profile:view'
  ],

  staff: [
    // Products
    'products:view',

    // Orders
    'orders:view',
    'orders:update_status',

    // Customers
    'customers:view',

    // Promotions
    'promotions:view',

    // Reviews
    'reviews:view',

    // Notifications
    'notifications:view',

    // Reports
    'reports:view',

    // Inventory
    'inventory:view',

    // Categories
    'categories:view',

    // Profile
    'profile:view'
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: MerchantUserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles ? (allowedRoles as readonly string[]).includes(role) : false;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: MerchantUserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: MerchantUserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: MerchantUserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Get readable permission description
 */
export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    // Products
    'products:view': 'View products',
    'products:create': 'Create new products',
    'products:edit': 'Edit existing products',
    'products:delete': 'Delete products',
    'products:bulk_import': 'Bulk import products',
    'products:export': 'Export products',

    // Orders
    'orders:view': 'View orders',
    'orders:view_all': 'View all order details',
    'orders:update_status': 'Update order status',
    'orders:cancel': 'Cancel orders',
    'orders:refund': 'Process refunds',
    'orders:export': 'Export orders',

    // Team
    'team:view': 'View team members',
    'team:invite': 'Invite team members',
    'team:remove': 'Remove team members',
    'team:change_role': 'Change team member roles',
    'team:change_status': 'Change team member status',

    // Analytics
    'analytics:view': 'View analytics',
    'analytics:view_revenue': 'View revenue analytics',
    'analytics:view_costs': 'View cost analytics',
    'analytics:export': 'Export analytics',

    // Settings
    'settings:view': 'View settings',
    'settings:edit': 'Edit all settings',
    'settings:edit_basic': 'Edit basic settings',

    // Billing
    'billing:view': 'View billing',
    'billing:manage': 'Manage billing',
    'billing:view_invoices': 'View invoices',

    // Customers
    'customers:view': 'View customers',
    'customers:edit': 'Edit customers',
    'customers:delete': 'Delete customers',
    'customers:export': 'Export customers',

    // Promotions
    'promotions:view': 'View promotions',
    'promotions:create': 'Create promotions',
    'promotions:edit': 'Edit promotions',
    'promotions:delete': 'Delete promotions',

    // Reviews
    'reviews:view': 'View reviews',
    'reviews:respond': 'Respond to reviews',
    'reviews:delete': 'Delete reviews',

    // Notifications
    'notifications:view': 'View notifications',
    'notifications:send': 'Send notifications',

    // Reports
    'reports:view': 'View reports',
    'reports:export': 'Export reports',
    'reports:view_detailed': 'View detailed reports',

    // Inventory
    'inventory:view': 'View inventory',
    'inventory:edit': 'Edit inventory',
    'inventory:bulk_update': 'Bulk update inventory',

    // Categories
    'categories:view': 'View categories',
    'categories:create': 'Create categories',
    'categories:edit': 'Edit categories',
    'categories:delete': 'Delete categories',

    // Profile
    'profile:view': 'View store profile',
    'profile:edit': 'Edit store profile',

    // Logs
    'logs:view': 'View activity logs',
    'logs:export': 'Export activity logs',

    // API
    'api:access': 'Access API',
    'api:manage_keys': 'Manage API keys'
  };

  return descriptions[permission] || permission;
}

/**
 * Get role description
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    owner: 'Full access to all features including billing and account deletion',
    admin: 'Manage products, orders, team, and most settings. Cannot manage billing or delete account',
    manager: 'Manage products and orders. Cannot delete products or manage team',
    staff: 'View-only access with ability to update order status'
  };

  return descriptions[role] || role;
}
