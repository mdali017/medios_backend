"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmergencyNeed = createEmergencyNeed;
exports.createBulkRestockRequests = createBulkRestockRequests;
exports.listStockRequests = listStockRequests;
exports.listEmergencyNeeds = listEmergencyNeeds;
exports.updateEmergencyNeedStatus = updateEmergencyNeedStatus;
exports.fulfillEmergencyNeed = fulfillEmergencyNeed;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
function mapStockRequestRow(row, product, requester) {
    return {
        id: row.id,
        storeId: row.store_id,
        productId: row.product_id,
        productName: product?.product_name ?? 'Unknown product',
        genericName: product?.generic_name ?? '',
        brandName: product?.brand_name ?? '',
        requestedBy: row.requested_by,
        requestedByName: requester?.name ?? 'Staff',
        requestedQty: Number(row.requested_qty),
        requestType: row.request_type,
        status: row.status,
        notes: row.notes ?? null,
        adminNote: row.admin_note ?? null,
        currentStock: Number(row.current_stock),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function resolveStoreIdForStaff(requester) {
    if (requester.role === 'store_manager' || requester.role === 'admin') {
        if (!requester.storeId) {
            throw new AppError_1.AppError('Store not assigned to this user', 400);
        }
        return requester.storeId;
    }
    throw new AppError_1.AppError('You do not have permission to manage stock requests', 403);
}
async function getProductInStore(productId, storeId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('products')
        .select('id, store_id, product_name, generic_name, brand_name, stock_quantity')
        .eq('id', productId)
        .eq('store_id', storeId)
        .maybeSingle();
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    if (!data) {
        throw new AppError_1.AppError('Product not found in your store', 404);
    }
    return data;
}
async function createStockRequest(requester, input, requestType) {
    const storeId = resolveStoreIdForStaff(requester);
    const product = await getProductInStore(input.productId, storeId);
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stock_requests')
        .insert({
        store_id: storeId,
        product_id: input.productId,
        requested_by: requester.id,
        requested_qty: input.requestedQty,
        request_type: requestType,
        status: 'pending',
        notes: input.notes?.trim() || null,
        current_stock: Number(product.stock_quantity),
    })
        .select('*')
        .single();
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    return mapStockRequestRow(data, product, { name: requester.name });
}
async function createEmergencyNeed(requester, input) {
    return createStockRequest(requester, input, 'emergency');
}
async function createBulkRestockRequests(requester, items) {
    const results = [];
    for (const item of items) {
        results.push(await createStockRequest(requester, item, 'restock'));
    }
    return results;
}
async function listStockRequests(requester, filters) {
    let storeId;
    if (requester.role === 'admin' || requester.role === 'store_manager') {
        storeId = resolveStoreIdForStaff(requester);
    }
    else if (requester.role === 'super_admin') {
        storeId = filters?.storeId;
    }
    else {
        throw new AppError_1.AppError('You do not have permission to view stock requests', 403);
    }
    const requestType = filters?.requestType ?? 'emergency';
    let query = supabase_1.supabaseAdmin
        .from('stock_requests')
        .select('*')
        .eq('request_type', requestType)
        .order('created_at', { ascending: false });
    if (storeId) {
        query = query.eq('store_id', storeId);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    const { data, error } = await query;
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    const rows = (data || []);
    if (rows.length === 0)
        return [];
    const productIds = [...new Set(rows.map((row) => row.product_id))];
    const requesterIds = [...new Set(rows.map((row) => row.requested_by))];
    const [{ data: products }, { data: requesters }] = await Promise.all([
        supabase_1.supabaseAdmin
            .from('products')
            .select('id, product_name, generic_name, brand_name')
            .in('id', productIds),
        supabase_1.supabaseAdmin.from('profiles').select('id, name').in('id', requesterIds),
    ]);
    const productById = new Map((products || []).map((product) => [product.id, product]));
    const requesterById = new Map((requesters || []).map((profile) => [profile.id, profile]));
    return rows.map((row) => mapStockRequestRow(row, productById.get(row.product_id), requesterById.get(row.requested_by)));
}
async function listEmergencyNeeds(requester, filters) {
    return listStockRequests(requester, { ...filters, requestType: 'emergency' });
}
async function updateEmergencyNeedStatus(requester, requestId, input) {
    if (requester.role !== 'admin' && requester.role !== 'super_admin') {
        throw new AppError_1.AppError('Only store admins can update emergency requests', 403);
    }
    const storeId = requester.role === 'admin' ? resolveStoreIdForStaff(requester) : undefined;
    let query = supabase_1.supabaseAdmin.from('stock_requests').select('*').eq('id', requestId);
    if (storeId) {
        query = query.eq('store_id', storeId);
    }
    const { data: existing, error: fetchError } = await query.maybeSingle();
    if (fetchError) {
        throw new AppError_1.AppError(fetchError.message, 400);
    }
    if (!existing) {
        throw new AppError_1.AppError('Emergency request not found', 404);
    }
    const row = existing;
    if (row.status !== 'pending' && input.status !== 'fulfilled') {
        throw new AppError_1.AppError('Only pending requests can be approved or rejected', 400);
    }
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stock_requests')
        .update({
        status: input.status,
        admin_note: input.adminNote?.trim() || null,
    })
        .eq('id', requestId)
        .select('*')
        .single();
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    const product = await getProductInStore(row.product_id, row.store_id).catch(() => null);
    return mapStockRequestRow(data, product ?? undefined, { name: requester.name });
}
async function fulfillEmergencyNeed(requester, requestId) {
    if (requester.role !== 'store_manager' && requester.role !== 'admin') {
        throw new AppError_1.AppError('Only store staff can mark emergency requests as handled', 403);
    }
    const storeId = resolveStoreIdForStaff(requester);
    const { data: existing, error: fetchError } = await supabase_1.supabaseAdmin
        .from('stock_requests')
        .select('*')
        .eq('id', requestId)
        .eq('store_id', storeId)
        .eq('request_type', 'emergency')
        .maybeSingle();
    if (fetchError) {
        throw new AppError_1.AppError(fetchError.message, 400);
    }
    if (!existing) {
        throw new AppError_1.AppError('Emergency request not found', 404);
    }
    const row = existing;
    if (row.status !== 'pending') {
        throw new AppError_1.AppError('This request has already been handled', 400);
    }
    const { data, error } = await supabase_1.supabaseAdmin
        .from('stock_requests')
        .update({ status: 'fulfilled' })
        .eq('id', requestId)
        .select('*')
        .single();
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    const product = await getProductInStore(row.product_id, row.store_id).catch(() => null);
    const requesterProfile = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('id', row.requested_by)
        .maybeSingle();
    return mapStockRequestRow(data, product ?? undefined, requesterProfile.data ?? undefined);
}
//# sourceMappingURL=stock-request.service.js.map