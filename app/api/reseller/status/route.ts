import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const body = await req.json();
  const { order_id } = body;

  if (!order_id) {
    return NextResponse.json({ status: false, message: 'Missing order_id' });
  }

  const order = await prisma.order.findFirst({
    where: { id: Number(order_id), user_id: user.id },
  });

  if (!order) {
    return NextResponse.json({ status: false, message: 'Order not found' });
  }

  return NextResponse.json({
    status: true,
    data: {
      order_id: order.id,
      service_name: order.service_name,
      target: order.target,
      quantity: order.quantity,
      price: Number(order.price),
      remains: order.remains,
      start_count: order.start_count,
      status: order.status,
      created_at: order.created_at,
    },
  });
}