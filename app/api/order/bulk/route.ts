import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderTarget, positiveInt } from '@/lib/order-input';
import { executeProviderOrder, DISPATCH_READY } from '@/lib/provider';
import { debitGuard } from '@/lib/balance';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { targets } = body;
  const service_id = positiveInt(body.service_id);
  if (!service_id) return NextResponse.json({ status: false, message: 'Layanan tidak valid.' });
  const ip = req.headers.get('x-real-ip') || '';

  if (!Array.isArray(targets) || targets.length === 0) return NextResponse.json({ status: false, message: 'Target tidak boleh kosong.' });
  if (targets.length > 20) return NextResponse.json({ status: false, message: 'Maksimal 20 target per pesanan.' });

  const service = await prisma.service.findFirst({ where: { id: Number(service_id), status: true }, include: { provider: true } });
  if (!service) return NextResponse.json({ status: false, message: 'Layanan tidak tersedia.' });

  const customPrice = await prisma.customPrice.findUnique({ where: { user_id_service_id: { user_id: userId, service_id: service.id } } });
  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;

  const orders: { target: string; quantity: number; price: number }[] = [];
  const errors: { target: string; error: string }[] = [];
  let totalPrice = 0;

  for (const t of targets) {
    const target = orderTarget(t?.target);
    const quantity = positiveInt(t?.quantity);
    if (!target || !Number.isInteger(quantity) || quantity < service.min || quantity > service.max) {
      errors.push({ target: target || '(kosong)', error: `Jumlah harus ${service.min}-${service.max}.` });
      continue;
    }
    const price = Math.ceil((pricePerUnit / 1000) * quantity);
    totalPrice += price;
    orders.push({ target, quantity, price });
  }

  if (orders.length === 0) return NextResponse.json({ status: false, message: 'Semua target gagal divalidasi.' });

  const created = await prisma.$transaction(async (tx) => {
    const { balanceBefore, balanceAfter } = await debitGuard(tx, userId, totalPrice);
    await tx.balanceLog.create({
      data: { user_id: userId, type: 'MINUS', action: 'Order', amount: totalPrice, balance_before: balanceBefore, balance_after: balanceAfter, description: `Bulk pesanan #${service.name} (${orders.length} target)` },
    });

    const result = [];
    for (const o of orders) {
      const order = await tx.order.create({
        data: {
          user_id: userId, service_id: service.id, provider_id: service.provider_id,
          service_name: service.name, target: o.target, quantity: o.quantity, price: o.price,
          profit: Math.ceil((profitPerUnit / 1000) * o.quantity),
          status: 'PENDING', provider_order_log: DISPATCH_READY, ip_address: ip,
        },
      });
      result.push(order);
    }
    return result;
  });

  for (const order of created) {
    if (service.provider.name !== 'MANUAL') {
      executeProviderOrder(service.provider, order, { service, target: order.target, quantity: order.quantity })
        .catch(() => console.error(`Order #${order.id}: dispatch requires review`));
    }
  }

  return NextResponse.json({
    status: true,
    data: { orders: created.map(o => ({ order_id: o.id, target: o.target, quantity: o.quantity, price: o.price, status: 'PENDING' })), total_price: totalPrice },
    message: errors.length
      ? `${created.length} pesanan dibuat. ${errors.length} target gagal.`
      : `${created.length} pesanan berhasil dibuat.`,
  });
}