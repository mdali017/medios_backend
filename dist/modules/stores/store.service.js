"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStores = listStores;
exports.getStoreById = getStoreById;
exports.createStore = createStore;
exports.updateStore = updateStore;
exports.deleteStore = deleteStore;
exports.assignStoreAdmin = assignStoreAdmin;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
function mapStoreRow(row) {
    return row;
}
async function getStoreAdmin(storeId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('store_id', storeId)
        .eq('role', 'admin')
        .maybeSingle();
    if (!data)
        return null;
    return {
        id: data.id,
        name: data.name,
        email: data.email,
    };
}
async function attachAdmin(store) {
    const storeAdmin = await getStoreAdmin(store.id);
    return { ...mapStoreRow(store), storeAdmin };
}
async function listStores(status) {
    let query = supabase_1.supabaseAdmin
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });
    if (status) {
        query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
        if (error.message.includes('Could not find the table')) {
            throw new AppError_1.AppError('Stores table not found. Run supabase/stores.sql first.', 500);
        }
        throw new AppError_1.AppError(error.message, 400);
    }
    const stores = (data || []);
    return Promise.all(stores.map(attachAdmin));
}
async function getStoreById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !data) {
        throw new AppError_1.AppError('Store not found', 404);
    }
    return attachAdmin(data);
}
async function createStore(input) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stores')
        .insert({
        name: input.name,
        address: input.address,
        city: input.city || null,
        phone: input.phone || null,
        license_number: input.licenseNumber,
        logo_url: input.logoUrl || null,
        status: input.status || 'pending',
    })
        .select('*')
        .single();
    if (error || !data) {
        throw new AppError_1.AppError(error?.message || 'Failed to create store', 400);
    }
    return attachAdmin(data);
}
async function updateStore(id, input) {
    await getStoreById(id);
    const updates = {};
    if (input.name !== undefined)
        updates.name = input.name;
    if (input.address !== undefined)
        updates.address = input.address;
    if (input.city !== undefined)
        updates.city = input.city || null;
    if (input.phone !== undefined)
        updates.phone = input.phone || null;
    if (input.licenseNumber !== undefined)
        updates.license_number = input.licenseNumber;
    if (input.logoUrl !== undefined)
        updates.logo_url = input.logoUrl || null;
    if (input.status !== undefined)
        updates.status = input.status;
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
    if (error || !data) {
        throw new AppError_1.AppError(error?.message || 'Failed to update store', 400);
    }
    return attachAdmin(data);
}
async function deleteStore(id) {
    await getStoreById(id);
    await supabase_1.supabaseAdmin
        .from('profiles')
        .update({ store_id: null })
        .eq('store_id', id);
    const { error } = await supabase_1.supabaseAdmin.from('stores').delete().eq('id', id);
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
}
async function assignStoreAdmin(input) {
    const store = await getStoreById(input.storeId);
    const existingAdmin = await getStoreAdmin(input.storeId);
    if (existingAdmin) {
        throw new AppError_1.AppError('This store already has an admin assigned', 400);
    }
    const { data: existingEmail } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();
    if (existingEmail) {
        throw new AppError_1.AppError('Email is already registered', 400);
    }
    const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            name: input.name,
            role: 'admin',
            store_id: input.storeId,
        },
    });
    if (authError || !authData.user) {
        throw new AppError_1.AppError(authError?.message || 'Failed to create store admin', 400);
    }
    const { error: profileError } = await supabase_1.supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        role: 'admin',
        store_id: input.storeId,
        is_verified: true,
        updated_at: new Date().toISOString(),
    });
    if (profileError) {
        await supabase_1.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError_1.AppError(profileError.message, 400);
    }
    if (store.status === 'pending') {
        await supabase_1.supabaseAdmin.from('stores').update({ status: 'live' }).eq('id', input.storeId);
    }
    return {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role: 'admin',
        storeId: input.storeId,
        storeName: store.name,
    };
}
//# sourceMappingURL=store.service.js.map