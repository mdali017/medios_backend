"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.profileToAuthUser = profileToAuthUser;
exports.getProfileById = getProfileById;
const supabase_1 = require("../config/supabase");
const AppError_1 = require("../utils/AppError");
const roles_1 = require("../utils/roles");
async function getStoreName(storeId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .maybeSingle();
    return data?.name ?? null;
}
async function profileToAuthUser(profile) {
    const storeName = profile.store_id ? await getStoreName(profile.store_id) : null;
    const user = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        storeId: profile.store_id,
        storeName,
        profileImage: profile.profile_image,
        permissions: (0, roles_1.getPermissionsForRole)(profile.role),
    };
    if (profile.role === 'customer' && profile.pharmacy_name && profile.license_number) {
        user.pharmacyDetails = {
            name: profile.pharmacy_name,
            license: profile.license_number,
        };
    }
    return user;
}
async function getProfileById(userId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError_1.AppError('Authentication required', 401);
        }
        const token = authHeader.split(' ')[1];
        const { data, error } = await supabase_1.supabaseAnon.auth.getUser(token);
        if (error || !data.user) {
            throw new AppError_1.AppError('Invalid or expired token', 401);
        }
        const profile = await getProfileById(data.user.id);
        if (!profile) {
            throw new AppError_1.AppError('User profile not found', 404);
        }
        req.user = await profileToAuthUser(profile);
        req.accessToken = token;
        next();
    }
    catch (error) {
        next(error);
    }
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError('Authentication required', 401));
        }
        if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
            return next();
        }
        return next(new AppError_1.AppError('You do not have permission to perform this action', 403));
    };
}
//# sourceMappingURL=auth.js.map