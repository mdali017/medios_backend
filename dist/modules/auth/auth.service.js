"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getCurrentUser = getCurrentUser;
exports.refreshAccessToken = refreshAccessToken;
exports.logoutUser = logoutUser;
exports.createInternalUser = createInternalUser;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
const roles_1 = require("../../utils/roles");
const auth_1 = require("../../middleware/auth");
async function registerUser(input) {
    const role = (0, roles_1.normalizeRegisterRole)(input.role);
    const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            name: input.name,
            role,
            phone: input.phone,
            pharmacy_name: input.pharmacyName,
            license_number: input.licenseNumber,
        },
    });
    if (authError || !authData.user) {
        throw new AppError_1.AppError(authError?.message || 'Registration failed', 400);
    }
    const { error: profileError } = await supabase_1.supabaseAdmin
        .from('profiles')
        .upsert({
        id: authData.user.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role,
        pharmacy_name: input.pharmacyName || null,
        license_number: input.licenseNumber || null,
        is_verified: true,
        updated_at: new Date().toISOString(),
    });
    if (profileError) {
        await supabase_1.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError_1.AppError(profileError.message, 400);
    }
    return {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role,
        isVerified: true,
    };
}
async function loginUser(input) {
    const { data, error } = await supabase_1.supabaseAnon.auth.signInWithPassword({
        email: input.email,
        password: input.password,
    });
    if (error || !data.session || !data.user) {
        throw new AppError_1.AppError(error?.message || 'Invalid email or password', 401);
    }
    const profile = await (0, auth_1.getProfileById)(data.user.id);
    if (!profile) {
        throw new AppError_1.AppError('User profile not found', 404);
    }
    const user = await (0, auth_1.profileToAuthUser)(profile);
    return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user,
    };
}
async function getCurrentUser(userId) {
    const profile = await (0, auth_1.getProfileById)(userId);
    if (!profile) {
        throw new AppError_1.AppError('User profile not found', 404);
    }
    return await (0, auth_1.profileToAuthUser)(profile);
}
async function refreshAccessToken(input) {
    const { data, error } = await supabase_1.supabaseAnon.auth.refreshSession({
        refresh_token: input.refreshToken,
    });
    if (error || !data.session) {
        throw new AppError_1.AppError(error?.message || 'Invalid refresh token', 401);
    }
    return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
    };
}
async function logoutUser(accessToken) {
    const { data, error } = await supabase_1.supabaseAnon.auth.getUser(accessToken);
    if (error || !data.user) {
        throw new AppError_1.AppError('Invalid or expired token', 401);
    }
    const { error: signOutError } = await supabase_1.supabaseAdmin.auth.admin.signOut(data.user.id, 'global');
    if (signOutError) {
        throw new AppError_1.AppError(signOutError.message, 400);
    }
}
async function createInternalUser(input) {
    const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            name: input.name,
            role: input.role,
            phone: input.phone,
            store_id: input.storeId,
        },
    });
    if (authError || !authData.user) {
        throw new AppError_1.AppError(authError?.message || 'User creation failed', 400);
    }
    const { error: profileError } = await supabase_1.supabaseAdmin
        .from('profiles')
        .upsert({
        id: authData.user.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        store_id: input.storeId || null,
        is_verified: true,
        updated_at: new Date().toISOString(),
    });
    if (profileError) {
        await supabase_1.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError_1.AppError(profileError.message, 400);
    }
    return {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role: input.role,
        permissions: (0, roles_1.getPermissionsForRole)(input.role),
    };
}
//# sourceMappingURL=auth.service.js.map