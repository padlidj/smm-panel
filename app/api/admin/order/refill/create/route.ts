import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeProviderRefill } from '@/lib/provider';

// Laravel Admin OrderRefillController::create parity: admin re-submits a SUCCESS order
// to the provider refill API (no user balance change). Guards: service+provider refill
// support, status SUCCESS, age <= 30 days, no duplicate PENDING refill, non-MANUAL.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const orderId = Number(id);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { service: { select: { is_refill_support: true } }, service_provider: { select: { name: true, is_refill_support: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!order.service?.is_refill_support || !order.service_provider?.is_refill_support)
      return NextResponse.json({ error: 'Refill tidak didukung layanan/provider ini.' });
    if (order.status !== 'SUCCESS' || Date.now() - order.created_at.getTime() > 30 * 86400_000)
      return NextResponse.json({ error: 'Aksi tidak diperbolehkan.' });
    if (order.service_provider.name === 'MANUAL')
      return NextResponse.json({ error: 'Pesanan gagal direfill.' });
    const dup = await prisma.orderRefill.findFirst({ where: { user_id: order.user_id, order_id: order.id, status: 'PENDING' } });
    if (dup) return NextResponse.json({ error: 'Pengguna ini masih memiliki Riwayat Refill berstatus Pending untuk Pesanan ini.' });

    // Refill row mirrors the order; price/profit 0 (admin refill is free, no debit — Laravel parity)
    const refill = await prisma.orderRefill.create({
      data: { order_id: order.id, user_id: order.user_id, target: order.target, quantity: order.quantity, price: 0, profit: 0, status: 'PENDING' },
    });
    const full = await prisma.orderRefill.findUnique({ where: { id: refill.id }, include: { order: { include: { service: true } } } });
    const provider = await prisma.serviceProvider.findUnique({ where: { id: order.provider_id } });
    const res = provider && full ? await executeProviderRefill(provider, full) : { success: false, error: 'Provider not found' };
    if (!res.success) {
      // Never dispatched -> remove (else PENDING row blocks retry). Dispatched with unknown
      // outcome -> keep ERROR/PROCESSING row as audit trail; provider may have accepted.
      const cur = await prisma.orderRefill.findUnique({ where: { id: refill.id }, select: { status: true } });
      if (cur?.status === 'PENDING') await prisma.orderRefill.delete({ where: { id: refill.id } });
      return NextResponse.json({ error: res.error || 'Pesanan gagal direfill.' });
    }
    return NextResponse.json({ status: true, message: 'Pesanan berhasil direfill.', provider_refill_id: res.provider_refill_id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
