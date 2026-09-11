"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refillGuard = refillGuard;
// Laravel APIController::refill / User OrderRefillController parity, shared by
// app/api/order/refill + app/api/reseller/refill (admin route has its own variant).
async function refillGuard(prisma, orderId, userId) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { service: { select: { is_refill_support: true } }, service_provider: { select: { name: true, is_refill_support: true } } },
    });
    const block = (message) => ({ ok: false, message, order: null });
    if (!order || order.user_id !== userId)
        return block('Pesanan tidak ditemukan.');
    if (!order.service?.is_refill_support || !order.service_provider?.is_refill_support)
        return block('Refill tidak didukung layanan ini.');
    if (order.status !== 'SUCCESS')
        return block('Order must be SUCCESS to refill');
    if (Date.now() - order.created_at.getTime() > 30 * 86400000)
        return block('Masa refill 30 hari sudah lewat.');
    const dup = await prisma.orderRefill.findFirst({ where: { user_id: userId, order_id: orderId, status: 'PENDING' }, select: { id: true } });
    if (dup)
        return block('Anda masih memiliki riwayat refill berstatus Pending untuk pesanan ini.');
    return { ok: true, message: null, order };
}
