import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';
import { executeProviderOrder } from '@/lib/provider';
import { debitGuard } from '@/lib/balance';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const body = await req.json();
  const { service_id, target, custom_comments, username } = body;
  const quantity = Number(body.quantity);

  if (!service_id || !target || !quantity) {
    return NextResponse.json({ status: false, message: 'Missing required fields: service_id, target, quantity' });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ status: false, message: 'Invalid quantity' });
  }

  const service = await prisma.service.findFirst({
    where: { id: Number(service_id), status: true },
    include: { provider: true },
  });
  if (!service) return NextResponse.json({ status: false, message: 'Service not found' });

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json({ status: false, message: `Min: ${service.min}, Max: ${service.max}` });
  }

  const customPrice = await prisma.customPrice.findUnique({
    where: { user_id_service_id: { user_id: user.id, service_id: service.id } },
  });
  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;
  const totalPrice = Math.ceil((pricePerUnit / 1000) * quantity);
  const totalProfit = Math.ceil((profitPerUnit / 1000) * quantity);

  const order = await prisma.$transaction(async (tx) => {
    const { balanceBefore, balanceAfter } = await debitGuard(tx, user.id, totalPrice);
    await tx.balanceLog.create({
      data: { user_id: user.id, type: 'MINUS', action: 'Order', amount: totalPrice, balance_before: balanceBefore, balance_after: balanceAfter, description: `Reseller API #${service.name}` },
    });
    return tx.order.create({
      data: {
        user_id: user.id, service_id: service.id, provider_id: service.provider_id,
        service_name: service.name, target: String(target), quantity, price: totalPrice, profit: totalProfit,
        status: 'PENDING', is_api: true,
        ip_address: req.headers.get('x-real-ip') || '',
        custom_comments, username,
      },
    });
  });

  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .catch((e: any) => prisma.order.update({ where: { id: order.id }, data: { status: 'ERROR', provider_order_log: e.message } }));
  }

  return NextResponse.json({
    status: true,
    order_id: order.id,
    service_name: service.name,
    price: totalPrice,
    quantity,
  });
}