"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrders = listOrders;
exports.getOrder = getOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.assignDeliveryStaff = assignDeliveryStaff;
exports.placeOnlineOrder = placeOnlineOrder;
exports.listDeliveryStaff = listDeliveryStaff;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
const VALID_STATUS_TRANSITIONS = {
    pending: ['approved', 'cancelled'],
    approved: ['in_delivery', 'cancelled'],
    in_delivery: ['completed'],
    completed: [],
    cancelled: [],
};
function mapOrderItemRow(row) {
    return {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        genericName: row.generic_name,
        brandName: row.brand_name,
        saleUnit: row.sale_unit,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        lineTotal: Number(row.line_total),
    };
}
function mapOrderRow(row, customerName, deliveryStaffName, items) {
    return {
        id: row.id,
        orderNumber: row.order_number,
        orderType: row.order_type,
        status: row.status,
        storeId: row.store_id,
        customerId: row.customer_id ?? null,
        customerName,
        deliveryStaffId: row.delivery_staff_id ?? null,
        deliveryStaffName,
        deliveryAddress: row.delivery_address ?? null,
        subtotal: Number(row.subtotal),
        taxAmount: Number(row.tax_amount),
        totalAmount: Number(row.total_amount),
        itemCount: Number(row.item_count),
        orderDate: row.created_at,
        items,
    };
}
function resolveStoreId(requester, storeIdFilter) {
    if (requester.role === 'admin') {
        if (!requester.storeId) {
            throw new AppError_1.AppError('Store not assigned to this admin', 400);
        }
        return requester.storeId;
    }
    return storeIdFilter;
}
async function getProfileName(profileId) {
    if (!profileId)
        return null;
    const { data } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', profileId)
        .maybeSingle();
    return data?.name ?? null;
}
async function getOrderById(orderId, storeId) {
    let query = supabase_1.supabaseAdmin.from('orders').select('*').eq('id', orderId);
    if (storeId) {
        query = query.eq('store_id', storeId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    if (!data) {
        throw new AppError_1.AppError('Order not found', 404);
    }
    return data;
}
async function listOrders(requester, filters) {
    const storeId = resolveStoreId(requester, filters.storeId);
    let query = supabase_1.supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
    if (storeId) {
        query = query.eq('store_id', storeId);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    const { data, error } = await query;
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    const rows = (data || []);
    const profileIds = new Set();
    for (const row of rows) {
        if (row.customer_id)
            profileIds.add(row.customer_id);
        if (row.delivery_staff_id)
            profileIds.add(row.delivery_staff_id);
    }
    const profileNames = new Map();
    if (profileIds.size > 0) {
        const { data: profiles } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id, name')
            .in('id', Array.from(profileIds));
        for (const profile of profiles || []) {
            profileNames.set(profile.id, profile.name);
        }
    }
    let results = rows.map((row) => mapOrderRow(row, row.customer_id ? profileNames.get(row.customer_id) ?? null : null, row.delivery_staff_id ? profileNames.get(row.delivery_staff_id) ?? null : null));
    if (filters.search?.trim()) {
        const term = filters.search.trim().toLowerCase();
        results = results.filter((order) => order.orderNumber.toLowerCase().includes(term) ||
            (order.customerName?.toLowerCase().includes(term) ?? false));
    }
    return results;
}
async function getOrder(requester, orderId) {
    const storeId = resolveStoreId(requester);
    const row = await getOrderById(orderId, storeId);
    const { data: itemRows, error: itemsError } = await supabase_1.supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (itemsError) {
        throw new AppError_1.AppError(itemsError.message, 400);
    }
    const customerName = await getProfileName(row.customer_id ?? null);
    const deliveryStaffName = await getProfileName(row.delivery_staff_id ?? null);
    return mapOrderRow(row, customerName, deliveryStaffName, (itemRows || []).map((item) => mapOrderItemRow(item)));
}
async function updateOrderStatus(requester, orderId, input) {
    const storeId = resolveStoreId(requester);
    const row = await getOrderById(orderId, storeId);
    const currentStatus = row.status;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(input.status)) {
        throw new AppError_1.AppError(`Cannot change status from "${currentStatus}" to "${input.status}"`, 400);
    }
    if (input.status === 'approved' && row.order_type === 'pos') {
        throw new AppError_1.AppError('POS orders are already completed at checkout', 400);
    }
    if (input.status === 'approved' && row.order_type === 'online') {
        await deductStockForOrder(orderId, row.store_id);
    }
    const { error } = await supabase_1.supabaseAdmin
        .from('orders')
        .update({ status: input.status })
        .eq('id', orderId);
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    return getOrder(requester, orderId);
}
async function assignDeliveryStaff(requester, orderId, input) {
    const storeId = resolveStoreId(requester);
    const row = await getOrderById(orderId, storeId);
    const currentStatus = row.status;
    if (!['approved', 'in_delivery'].includes(currentStatus)) {
        throw new AppError_1.AppError('Delivery staff can only be assigned to approved orders', 400);
    }
    let staffQuery = supabase_1.supabaseAdmin
        .from('profiles')
        .select('id, name, role, store_id')
        .eq('id', input.deliveryStaffId)
        .eq('role', 'delivery_man')
        .maybeSingle();
    const { data: staff, error: staffError } = await staffQuery;
    if (staffError) {
        throw new AppError_1.AppError(staffError.message, 400);
    }
    if (!staff) {
        throw new AppError_1.AppError('Delivery staff not found', 404);
    }
    if (storeId && staff.store_id && staff.store_id !== storeId) {
        throw new AppError_1.AppError('Delivery staff does not belong to this store', 400);
    }
    const updates = {
        delivery_staff_id: input.deliveryStaffId,
        status: 'in_delivery',
    };
    const { error } = await supabase_1.supabaseAdmin.from('orders').update(updates).eq('id', orderId);
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    return getOrder(requester, orderId);
}
function getUnitPrice(product, saleUnit) {
    if (saleUnit === 'strip')
        return Number(product.price_pata ?? product.price_single);
    if (saleUnit === 'box')
        return Number(product.price_box ?? product.price_single);
    return Number(product.price_single);
}
function getTabletsPerUnit(product, saleUnit) {
    if (saleUnit === 'strip')
        return Number(product.tablets_per_strip);
    if (saleUnit === 'box') {
        return Number(product.tablets_per_strip) * Number(product.strips_per_box);
    }
    return 1;
}
async function generateOnlineOrderNumber(storeId) {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { data } = await supabase_1.supabaseAdmin
        .from('orders')
        .select('order_number')
        .eq('store_id', storeId)
        .like('order_number', `ONL-${datePrefix}-%`);
    const seq = (data?.length ?? 0) + 1;
    return `ONL-${datePrefix}-${String(seq).padStart(4, '0')}`;
}
async function deductStockForOrder(orderId, storeId) {
    const { data: items, error } = await supabase_1.supabaseAdmin
        .from('order_items')
        .select('product_id, tablets_deducted')
        .eq('order_id', orderId);
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    for (const item of items || []) {
        const { data: product, error: productError } = await supabase_1.supabaseAdmin
            .from('products')
            .select('id, stock_quantity, product_name')
            .eq('id', item.product_id)
            .eq('store_id', storeId)
            .single();
        if (productError || !product) {
            throw new AppError_1.AppError('Product not found for order item', 400);
        }
        if (product.stock_quantity < item.tablets_deducted) {
            throw new AppError_1.AppError(`Insufficient stock for "${product.product_name}". Available: ${product.stock_quantity}`, 400);
        }
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('products')
            .update({ stock_quantity: product.stock_quantity - item.tablets_deducted })
            .eq('id', product.id);
        if (updateError) {
            throw new AppError_1.AppError(updateError.message, 400);
        }
    }
}
async function placeOnlineOrder(requester, input) {
    if (requester.role !== 'customer') {
        throw new AppError_1.AppError('Only customers can place online orders', 403);
    }
    let subtotal = 0;
    let tax = 0;
    let itemCount = 0;
    let unitCount = 0;
    const lineItems = [];
    for (const item of input.items) {
        const { data: product, error } = await supabase_1.supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', item.productId)
            .eq('store_id', input.storeId)
            .eq('status', 'active')
            .maybeSingle();
        if (error || !product) {
            throw new AppError_1.AppError(`Product not found: ${item.productId}`, 400);
        }
        const unitPrice = getUnitPrice(product, item.saleUnit);
        const tabletsPerUnit = getTabletsPerUnit(product, item.saleUnit);
        const taxPercent = Number(product.tax_percent);
        const unitTax = (unitPrice * taxPercent) / 100;
        const lineSubtotal = unitPrice * item.quantity;
        const lineTax = unitTax * item.quantity;
        const tabletsDeducted = item.quantity * tabletsPerUnit;
        if (product.stock_quantity < tabletsDeducted) {
            throw new AppError_1.AppError(`Insufficient stock for "${product.product_name}". Available: ${product.stock_quantity}`, 400);
        }
        subtotal += lineSubtotal;
        tax += lineTax;
        itemCount += 1;
        unitCount += item.quantity;
        lineItems.push({
            product_id: product.id,
            product_name: product.product_name,
            generic_name: product.generic_name,
            brand_name: product.brand_name,
            sale_unit: item.saleUnit,
            quantity: item.quantity,
            unit_price: unitPrice,
            unit_tax: unitTax,
            line_subtotal: lineSubtotal,
            line_tax: lineTax,
            line_total: lineSubtotal + lineTax,
            tablets_per_unit: tabletsPerUnit,
            tablets_deducted: tabletsDeducted,
            batch_number: product.batch_number,
            expiry_date: product.expiry_date,
        });
    }
    const orderNumber = await generateOnlineOrderNumber(input.storeId);
    const { data: orderRow, error: orderError } = await supabase_1.supabaseAdmin
        .from('orders')
        .insert({
        store_id: input.storeId,
        order_number: orderNumber,
        order_type: 'online',
        status: 'pending',
        sold_by: requester.id,
        customer_id: requester.id,
        subtotal,
        tax_amount: tax,
        total_amount: subtotal + tax,
        item_count: itemCount,
        unit_count: unitCount,
        delivery_address: input.deliveryAddress,
        notes: input.notes ?? null,
    })
        .select('*')
        .single();
    if (orderError || !orderRow) {
        throw new AppError_1.AppError(orderError?.message || 'Failed to create order', 400);
    }
    const orderItems = lineItems.map((line) => ({
        ...line,
        order_id: orderRow.id,
    }));
    const { error: itemsError } = await supabase_1.supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) {
        await supabase_1.supabaseAdmin.from('orders').delete().eq('id', orderRow.id);
        throw new AppError_1.AppError(itemsError.message, 400);
    }
    const customerName = await getProfileName(requester.id);
    return mapOrderRow(orderRow, customerName, null, lineItems.map((line, index) => mapOrderItemRow({
        id: `pending-${index}`,
        product_id: line.product_id,
        product_name: line.product_name,
        generic_name: line.generic_name,
        brand_name: line.brand_name,
        sale_unit: line.sale_unit,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
    })));
}
async function listDeliveryStaff(requester) {
    let query = supabase_1.supabaseAdmin
        .from('profiles')
        .select('id, name, email, phone')
        .eq('role', 'delivery_man')
        .order('name', { ascending: true });
    if (requester.role === 'admin') {
        if (!requester.storeId) {
            throw new AppError_1.AppError('Store not assigned to this admin', 400);
        }
        query = query.eq('store_id', requester.storeId);
    }
    const { data, error } = await query;
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
    }));
}
//# sourceMappingURL=order.service.js.map