import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';
import { debitBalance } from '@/lib/balance';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const body = await req.json();
  const { order_id, quantity } = body;

  if (!order_id || !quantity) {
    return NextResponse.json({ status: false, message: 'Missing required fields: order_id, quantity' });
  }

  const order = await prisma.order.findFirst({
    where: { id: Number(order_id), user_id: user.id },
  });

  if (!order) {
    return NextResponse.json({ status: false, message: 'Order not found' });
  }

  if (order.status !== 'SUCCESS') {
    return NextResponse.json({ status: false, message: 'Order must be SUCCESS to refill' });
  }

  const totalPrice = Math.ceil((Number(order.price) / order.quantity) * quantity);

  try {
    await debitBalance(user.id, totalPrice, 'Refill', `Reseller API Refill #${order.id}`);
  } catch {
    return NextResponse.json({ status: false, message: 'Insufficient balance' });
  }

  const refill = await prisma.orderRefill.create({
    data: {
      order_id: order.id,
      user_id: user.id,
      target: order.target,
      quantity,
      price: totalPrice,
      profit: 0,
      status: 'PENDING',
    },
  });

  return NextResponse.json({
    status: true,
    refill_id: refill.id,
    order_id: order.id,
    quantity,
    price: totalPrice,
  });
}