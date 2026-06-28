import type { UserRole } from '../types'

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    'manage_stores',
    'manage_users',
    'view_invoices',
    'manage_subscriptions',
    'view_all_leads',
  ],
  admin: [
    'manage_orders',
    'manage_products',
    'manage_managers',
    'view_reports',
    'manage_stock',
    'manage_leads',
    'access_pos',
  ],
  store_manager: [
    'manage_orders',
    'view_products',
    'request_stock',
    'manage_leads',
    'access_pos',
  ],
  customer: ['create_order', 'view_products', 'upload_prescription'],
  delivery_man: ['view_assigned_deliveries', 'update_delivery_status'],
}

export const PUBLIC_REGISTER_ROLES: UserRole[] = ['customer']

export const INTERNAL_ROLES: UserRole[] = ['super_admin', 'admin', 'store_manager', 'delivery_man']

export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}

export function normalizeRegisterRole(role?: string): UserRole {
  if (!role || role === 'pharmacy_owner') {
    return 'customer'
  }

  if (PUBLIC_REGISTER_ROLES.includes(role as UserRole)) {
    return role as UserRole
  }

  throw new Error('Invalid role for public registration')
}

export function isRoleAllowed(requiredRoles: UserRole[], userRole: UserRole): boolean {
  if (userRole === 'super_admin') return true
  return requiredRoles.includes(userRole)
}
