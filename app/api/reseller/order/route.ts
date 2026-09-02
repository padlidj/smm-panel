import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';
import { debitBalance } from '@/lib/balance';
import { executeProviderOrder } from '@/lib/provider';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const body = await req.json();
  const { service_id, target, quantity, custom_comments, username } = body;

  if (!service_id || !target || !quantity) {
    return NextResponse.json({ status: false, message: 'Missing required fields: service_id, target, quantity' });
  }

  const service = await prisma.service.findFirst({
    where: { id: Number(service_id), status: true },
    include: { provider: true },
  });
  if (!service) return NextResponse.json({ status: false, message: 'Service not found' });

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json({
      status: false,
      message: `Min: ${service.min}, Max: ${service.max}`,
    });
  }

  const customPrice = await prisma.customPrice.findUnique({
    where: { user_id_service_id: { user_id: user.id, service_id: service.id } },
  });
  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;
  const totalPrice = Math.ceil((pricePerUnit / 1000) * quantity);
  const totalProfit = Math.ceil((profitPerUnit / 1000) * quantity);

  try {
    await debitBalance(user.id, totalPrice, 'Order', `Reseller API #${service.name}`);
  } catch {
    return NextResponse.json({ status: false, message: 'Insufficient balance' });
  }

  const order = await prisma.order.create({
    data: {
      user_id: user.id,
      service_id: service.id,
      provider_id: service.provider_id,
      service_name: service.name,
      target: String(target),
      quantity,
      price: totalPrice,
      profit: totalProfit,
      status: 'PENDING',
      is_api: true,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '',
      custom_comments,
      username,
    },
  });

  // Fire-and-forget provider order
  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .then(() => {})
      .catch(() => {});
  }

  return NextResponse.json({
    status: true,
    order_id: order.id,
    service_name: service.name,
    price: totalPrice,
    quantity,
  });
}