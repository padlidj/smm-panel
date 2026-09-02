import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { debitBalance } from '@/lib/balance';
import { executeProviderRefill } from '@/lib/provider';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { order_id, quantity } = body;

  const order = await prisma.order.findUnique({ where: { id: Number(order_id) } });
  if (!order || order.user_id !== userId) return NextResponse.json({ status: false, message: 'Order not found' });
  if (order.status !== 'SUCCESS') return NextResponse.json({ status: false, message: 'Order must be SUCCESS to refill' });

  const totalPrice = Math.ceil((Number(order.price) / order.quantity) * quantity);

  try {
    await debitBalance(userId, totalPrice, 'Refill', `Refill #${order.id}`);
  } catch {
    return NextResponse.json({ status: false, message: 'Saldo tidak mencukupi.' });
  }

  const refill = await prisma.orderRefill.create({
    data: {
      order_id: order.id, user_id: userId, target: order.target, quantity,
      price: totalPrice, profit: 0, status: 'PENDING',
    },
  });

  // Auto-submit to provider when configured (skip MANUAL)
  const provider = await prisma.serviceProvider.findUnique({ where: { id: order.provider_id } });
  if (provider && provider.name !== 'MANUAL' && (provider.refill_config as any)?.endpoint) {
    const full = await prisma.orderRefill.findUnique({
      where: { id: refill.id },
      include: { order: { include: { service: true } } },
    });
    if (full) await executeProviderRefill(provider, full);
  }

  return NextResponse.json({ status: true, data: { id: refill.id, order_id: order.id, quantity, price: totalPrice, status: 'PENDING' }, message: 'Refill berhasil dibuat.' });
}