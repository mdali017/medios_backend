"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutPosOrder = checkoutPosOrder;
const supabase_1 = require("../../config/supabase");
const socket_1 = require("../../config/socket");
const AppError_1 = require("../../utils/AppError");
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
        unitTax: Number(row.unit_tax),
        lineSubtotal: Number(row.line_subtotal),
        lineTax: Number(row.line_tax),
        lineTotal: Number(row.line_total),
        tabletsPerUnit: Number(row.tablets_per_unit),
        tabletsDeducted: Number(row.tablets_deducted),
    };
}
function mapOrderRow(row, items) {
    return {
        id: row.id,
        storeId: row.store_id,
        orderNumber: row.order_number,
        orderType: row.order_type,
        status: row.status,
        soldBy: row.sold_by,
        subtotal: Number(row.subtotal),
        taxAmount: Number(row.tax_amount),
        totalAmount: Number(row.total_amount),
        itemCount: Number(row.item_count),
        unitCount: Number(row.unit_count),
        notes: row.notes ?? null,
        createdAt: row.created_at,
        items,
    };
}
async function checkoutPosOrder(requester, input) {
    if (requester.role !== 'store_manager' && requester.role !== 'admin') {
        throw new AppError_1.AppError('You do not have permission to checkout POS orders', 403);
    }
    if (!requester.storeId) {
        throw new AppError_1.AppError('Store not assigned to this user', 400);
    }
    const rpcItems = input.items.map((item) => ({
        productId: item.productId,
        saleUnit: item.saleUnit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitTax: item.unitTax ?? 0,
        tabletsPerUnit: item.tabletsPerUnit,
    }));
    const { data: orderId, error: rpcError } = await supabase_1.supabaseAdmin.rpc('create_pos_order', {
        p_store_id: requester.storeId,
        p_sold_by: requester.id,
        p_items: rpcItems,
        p_notes: input.notes ?? null,
    });
    if (rpcError) {
        throw new AppError_1.AppError(rpcError.message, 400);
    }
    if (!orderId) {
        throw new AppError_1.AppError('Failed to create order', 500);
    }
    const { data: orderRow, error: orderError } = await supabase_1.supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
    if (orderError || !orderRow) {
        throw new AppError_1.AppError(orderError?.message || 'Order created but could not be loaded', 500);
    }
    const { data: itemRows, error: itemsError } = await supabase_1.supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (itemsError) {
        throw new AppError_1.AppError(itemsError.message, 500);
    }
    const items = (itemRows || []).map((row) => mapOrderItemRow(row));
    const order = mapOrderRow(orderRow, items);
    const productIds = [...new Set(items.map((item) => item.productId))];
    if (productIds.length > 0 && requester.storeId) {
        const { data: stockRows } = await supabase_1.supabaseAdmin
            .from('products')
            .select('id, stock_quantity')
            .in('id', productIds);
        if (stockRows?.length) {
            (0, socket_1.emitStockUpdated)(requester.storeId, {
                updates: stockRows.map((row) => ({
                    productId: row.id,
                    stockQuantity: Number(row.stock_quantity),
                })),
                source: 'checkout',
                orderId: order.id,
                orderNumber: order.orderNumber,
            });
        }
    }
    return order;
}
//# sourceMappingURL=pos.service.js.map