import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderTarget, positiveInt } from '@/lib/order-input';
import { debitGuard } from '@/lib/balance';
import { executeProviderRefill } from '@/lib/provider';
import { refillGuard } from '@/lib/refill';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const order_id = positiveInt(body.order_id);
  const quantity = positiveInt(body.quantity);
  if (!order_id || !Number.isInteger(quantity) || quantity <= 0)
    return NextResponse.json({ status: false, message: 'Jumlah tidak valid.' });

  const g = await refillGuard(prisma, Number(order_id), userId);
  if (!g.ok) return NextResponse.json({ status: false, message: g.message });
  const order = g.order;

  const target = orderTarget(order.target);
  if (!target || !positiveInt(order.quantity)) return NextResponse.json({ status: false, message: 'Invalid original order target or quantity' });
  const totalPrice = Math.ceil((Number(order.price) / order.quantity) * quantity);

  let refill;
  try {
    refill = await prisma.$transaction(async (tx) => {
      const { balanceBefore, balanceAfter } = await debitGuard(tx, userId, totalPrice);
      await tx.balanceLog.create({
        data: { user_id: userId, type: 'MINUS', action: 'Refill', amount: totalPrice, balance_before: balanceBefore, balance_after: balanceAfter, description: `Refill #${order.id}` },
      });
      return tx.orderRefill.create({
        data: {
          order_id: order.id, user_id: userId, target, quantity,
          price: totalPrice,
          profit: Math.ceil((Number(order.profit) / order.quantity) * quantity), status: 'PENDING',
        },
      });
    });
  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message.includes('Saldo tidak mencukupi') ? 'Saldo tidak mencukupi.' : 'Gagal membuat refill.' });
  }

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