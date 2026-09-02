import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/midtrans';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status } = body;

    if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
      return NextResponse.json({ status: false, message: 'Invalid signature' });
    }

    const deposit = await prisma.deposit.findFirst({ where: { midtrans_order_id: order_id } });
    if (!deposit) return NextResponse.json({ status: false, message: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return NextResponse.json({ status: false, message: 'Already processed' });

    const isSuccess = (transaction_status === 'settlement' || transaction_status === 'capture') && fraud_status === 'accept';
    if (isSuccess) {
      await prisma.$transaction(async (tx) => {
        await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'SUCCESS' } });
        const user = await tx.user.findUnique({ where: { id: deposit.user_id } });
        if (!user) throw new Error('User not found');
        const balanceBefore = Number(user.balance);
        const balanceAfter = balanceBefore + Number(deposit.net);
        await tx.user.update({ where: { id: deposit.user_id }, data: { balance: balanceAfter } });
        await tx.balanceLog.create({
          data: {
            user_id: deposit.user_id, type: 'PLUS', action: 'Deposit', amount: deposit.net,
            balance_before: balanceBefore, balance_after: balanceAfter, description: `Deposit #${deposit.id} via ${deposit.method}`,
          },
        });
      });
      return NextResponse.json({ status: true, message: 'Deposit approved' });
    }

    if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'FAILED' } });
    }

    return NextResponse.json({ status: true, message: 'Notification received' });
  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}