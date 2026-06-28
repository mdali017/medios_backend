"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERNAL_ROLES = exports.PUBLIC_REGISTER_ROLES = void 0;
exports.getPermissionsForRole = getPermissionsForRole;
exports.normalizeRegisterRole = normalizeRegisterRole;
exports.isRoleAllowed = isRoleAllowed;
const ROLE_PERMISSIONS = {
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
};
exports.PUBLIC_REGISTER_ROLES = ['customer'];
exports.INTERNAL_ROLES = ['super_admin', 'admin', 'store_manager', 'delivery_man'];
function getPermissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
}
function normalizeRegisterRole(role) {
    if (!role || role === 'pharmacy_owner') {
        return 'customer';
    }
    if (exports.PUBLIC_REGISTER_ROLES.includes(role)) {
        return role;
    }
    throw new Error('Invalid role for public registration');
}
function isRoleAllowed(requiredRoles, userRole) {
    if (userRole === 'super_admin')
        return true;
    return requiredRoles.includes(userRole);
}
//# sourceMappingURL=roles.js.map