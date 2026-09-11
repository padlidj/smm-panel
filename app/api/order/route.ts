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
  const { custom_comments, username, answer_number } = body;
  const service_id = positiveInt(body.service_id);
  const target = orderTarget(body.target);
  const quantity = positiveInt(body.quantity);

  if (!service_id || !target || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ status: false, message: 'Jumlah tidak valid.' });
  }

  const service = await prisma.service.findFirst({ where: { id: Number(service_id), status: true }, include: { provider: true } });
  if (!service) return NextResponse.json({ status: false, message: 'Layanan tidak tersedia.' });

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json({ status: false, message: `Jumlah minimal ${service.min}, maksimal ${service.max}.` });
  }

  const customPrice = await prisma.customPrice.findUnique({ where: { user_id_service_id: { user_id: userId, service_id: service.id } } });
  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;
  const totalPrice = Math.ceil((pricePerUnit / 1000) * quantity);
  const totalProfit = Math.ceil((profitPerUnit / 1000) * quantity);

  const order = await prisma.$transaction(async (tx) => {
    const { balanceBefore, balanceAfter } = await debitGuard(tx, userId, totalPrice);
    await tx.balanceLog.create({
      data: { user_id: userId, type: 'MINUS', action: 'Order', amount: totalPrice, balance_before: balanceBefore, balance_after: balanceAfter, description: `Pesanan #${service.name}` },
    });
    return tx.order.create({
      data: {
        user_id: userId, service_id: service.id, provider_id: service.provider_id,
        service_name: service.name, target, quantity, price: totalPrice, profit: totalProfit,
        status: 'PENDING', provider_order_log: DISPATCH_READY, ip_address: req.headers.get('x-real-ip') || '',
        custom_comments, username, answer_number: positiveInt(answer_number) ?? null,
      },
    });
  });

  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .catch(() => console.error(`Order #${order.id}: dispatch requires review`));
  }

  return NextResponse.json({ status: true, order_id: order.id, message: 'Pesanan berhasil dibuat.' });
}