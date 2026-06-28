"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreReports = getStoreReports;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
function resolveStoreId(requester, storeIdFilter) {
    if (requester.role === 'admin') {
        if (!requester.storeId) {
            throw new AppError_1.AppError('Store not assigned to this admin', 400);
        }
        return requester.storeId;
    }
    if (!storeIdFilter) {
        throw new AppError_1.AppError('Store ID is required', 400);
    }
    return storeIdFilter;
}
function isRevenueOrder(row) {
    const status = row.status;
    const orderType = row.order_type;
    return status === 'completed' || orderType === 'pos';
}
function getStockStatus(stockQuantity, expiryDate) {
    if (stockQuantity === 0)
        return 'Stock Out';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90)
        return 'Expiring Soon';
    if (stockQuantity <= 20)
        return 'Low Stock';
    return 'In Stock';
}
function toDateKey(date) {
    return date.toISOString().slice(0, 10);
}
function parseDateOnly(value, label) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new AppError_1.AppError(`Invalid ${label}. Use YYYY-MM-DD format.`, 400);
    }
    return date;
}
function resolveReportDateRange(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = endDate ? parseDateOnly(endDate, 'endDate') : new Date(today);
    const start = startDate
        ? parseDateOnly(startDate, 'startDate')
        : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    if (start > end) {
        throw new AppError_1.AppError('startDate must be on or before endDate', 400);
    }
    const periodDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (periodDays > 365) {
        throw new AppError_1.AppError('Date range cannot exceed 365 days', 400);
    }
    return {
        start,
        end,
        startDate: toDateKey(start),
        endDate: toDateKey(end),
        periodDays,
    };
}
function isOrderInRange(createdAt, start, end) {
    const orderDate = new Date(createdAt);
    const orderDay = new Date(orderDate);
    orderDay.setHours(0, 0, 0, 0);
    return orderDay >= start && orderDay <= end;
}
function buildDailySalesForRange(orders, start, end) {
    const points = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        points.push({ date: toDateKey(cursor), revenue: 0, orders: 0 });
        cursor.setDate(cursor.getDate() + 1);
    }
    const indexByDate = new Map(points.map((point, index) => [point.date, index]));
    for (const order of orders) {
        if (!isRevenueOrder(order))
            continue;
        if (!isOrderInRange(order.created_at, start, end))
            continue;
        const key = toDateKey(new Date(order.created_at));
        const index = indexByDate.get(key);
        if (index === undefined)
            continue;
        points[index].revenue += Number(order.total_amount);
        points[index].orders += 1;
    }
    return points;
}
async function getStoreReports(requester, filters) {
    const storeId = resolveStoreId(requester, filters?.storeId);
    const dateRange = resolveReportDateRange(filters?.startDate, filters?.endDate);
    const rangeEndExclusive = new Date(dateRange.end);
    rangeEndExclusive.setHours(23, 59, 59, 999);
    const { data: orders, error: ordersError } = await supabase_1.supabaseAdmin
        .from('orders')
        .select('id, order_number, order_type, status, total_amount, subtotal, tax_amount, created_at')
        .eq('store_id', storeId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', rangeEndExclusive.toISOString())
        .order('created_at', { ascending: false });
    if (ordersError) {
        throw new AppError_1.AppError(ordersError.message, 400);
    }
    const orderRows = (orders || []);
    const revenueOrders = orderRows.filter(isRevenueOrder);
    let totalRevenue = 0;
    let posOrders = 0;
    let onlineOrders = 0;
    for (const order of revenueOrders) {
        const amount = Number(order.total_amount);
        totalRevenue += amount;
        if (order.order_type === 'pos')
            posOrders += 1;
        if (order.order_type === 'online')
            onlineOrders += 1;
    }
    const averageDailyRevenue = dateRange.periodDays > 0
        ? Number((totalRevenue / dateRange.periodDays).toFixed(2))
        : 0;
    const { data: products, error: productsError } = await supabase_1.supabaseAdmin
        .from('products')
        .select('id, product_name, generic_name, stock_quantity, expiry_date, cost_price_single')
        .eq('store_id', storeId);
    if (productsError) {
        throw new AppError_1.AppError(productsError.message, 400);
    }
    const productRows = products || [];
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let expiringSoon = 0;
    let totalStockUnits = 0;
    const alerts = [];
    for (const product of productRows) {
        const stockQuantity = Number(product.stock_quantity);
        totalStockUnits += stockQuantity;
        const status = getStockStatus(stockQuantity, product.expiry_date);
        if (status === 'In Stock')
            inStock += 1;
        if (status === 'Low Stock')
            lowStock += 1;
        if (status === 'Stock Out')
            outOfStock += 1;
        if (status === 'Expiring Soon')
            expiringSoon += 1;
        if (status !== 'In Stock') {
            alerts.push({
                id: product.id,
                productName: product.product_name,
                genericName: product.generic_name,
                stockQuantity,
                expiryDate: product.expiry_date,
                status,
            });
        }
    }
    alerts.sort((a, b) => a.stockQuantity - b.stockQuantity);
    const revenueOrderIds = revenueOrders.map((order) => order.id);
    let orderItems = [];
    if (revenueOrderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase_1.supabaseAdmin
            .from('order_items')
            .select('product_id, product_name, quantity, line_total, tablets_deducted')
            .in('order_id', revenueOrderIds);
        if (itemsError) {
            throw new AppError_1.AppError(itemsError.message, 400);
        }
        orderItems = (items || []);
    }
    const costByProductId = new Map();
    for (const product of productRows) {
        costByProductId.set(product.id, product.cost_price_single != null ? Number(product.cost_price_single) : null);
    }
    let estimatedCost = 0;
    let costCoverageRevenue = 0;
    const productAgg = new Map();
    for (const item of orderItems) {
        const productId = item.product_id;
        const lineTotal = Number(item.line_total);
        const tabletsDeducted = Number(item.tablets_deducted);
        const unitCost = costByProductId.get(productId) ?? null;
        const lineCost = unitCost != null ? unitCost * tabletsDeducted : null;
        if (lineCost != null) {
            estimatedCost += lineCost;
            costCoverageRevenue += lineTotal;
        }
        const existing = productAgg.get(productId);
        const lineProfit = lineCost != null ? lineTotal - lineCost : null;
        if (existing) {
            existing.quantitySold += Number(item.quantity);
            existing.revenue += lineTotal;
            if (lineProfit != null) {
                existing.estimatedProfit = (existing.estimatedProfit ?? 0) + lineProfit;
                existing.hasCost = true;
            }
        }
        else {
            productAgg.set(productId, {
                productName: item.product_name,
                quantitySold: Number(item.quantity),
                revenue: lineTotal,
                estimatedProfit: lineProfit,
                hasCost: lineCost != null,
            });
        }
    }
    const itemsRevenue = orderItems.reduce((sum, item) => sum + Number(item.line_total), 0);
    const estimatedProfit = estimatedCost > 0 ? itemsRevenue - estimatedCost : 0;
    const marginPercent = costCoverageRevenue > 0 ? Number(((estimatedProfit / costCoverageRevenue) * 100).toFixed(1)) : null;
    const topProducts = Array.from(productAgg.entries())
        .map(([productId, agg]) => ({
        productId,
        productName: agg.productName,
        quantitySold: agg.quantitySold,
        revenue: agg.revenue,
        estimatedProfit: agg.hasCost ? agg.estimatedProfit : null,
    }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    const recentOrders = revenueOrders.slice(0, 50).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        totalAmount: Number(order.total_amount),
        orderDate: order.created_at,
    }));
    return {
        storeId,
        dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            periodDays: dateRange.periodDays,
        },
        sales: {
            totalRevenue,
            totalOrders: revenueOrders.length,
            posOrders,
            onlineOrders,
            averageDailyRevenue,
            dailySales: buildDailySalesForRange(orderRows, dateRange.start, dateRange.end),
        },
        stock: {
            totalProducts: productRows.length,
            inStock,
            lowStock,
            outOfStock,
            expiringSoon,
            totalStockUnits,
            alerts: alerts.slice(0, 15),
        },
        profit: {
            totalRevenue: itemsRevenue,
            estimatedCost,
            estimatedProfit,
            marginPercent,
            topProducts,
        },
        recentOrders,
    };
}
//# sourceMappingURL=report.service.js.map