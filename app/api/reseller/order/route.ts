import { NextResponse } from 'next/server';
import { getApiUser, getApiParams } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';
import { orderTarget, positiveInt } from '@/lib/order-input';
import { executeProviderOrder, DISPATCH_READY } from '@/lib/provider';
import { debitGuard } from '@/lib/balance';

export async function POST(req: Request) {
  const body = await getApiParams(req);
  const user = await getApiUser(req, body);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });
  // Standard SMM API param names (`service`, `id`) accepted alongside ours
  const { custom_comments, username } = body;
  const target = orderTarget(body.target);
  const service_id = positiveInt(body.service_id ?? body.service);
  const quantity = positiveInt(body.quantity);

  if (!service_id || !target || !quantity) {
    return NextResponse.json({ status: false, message: 'Missing required fields: service_id, target, quantity' });
  }
  if (!service_id || !target || !Number.isInteger(quantity) || quantity <= 0) {
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
        service_name: service.name, target, quantity, price: totalPrice, profit: totalProfit,
        status: 'PENDING', provider_order_log: DISPATCH_READY, is_api: true,
        ip_address: req.headers.get('x-real-ip') || '',
        custom_comments, username,
      },
    });
  });

  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .catch(() => console.error(`Order #${order.id}: dispatch requires review`));
  }

  return NextResponse.json({
    status: true,
    data: { id: order.id },
    order_id: order.id,
    service_name: service.name,
    price: totalPrice,
    quantity,
  });
}