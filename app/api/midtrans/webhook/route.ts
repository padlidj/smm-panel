import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/midtrans';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status } = body;

    if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
      return NextResponse.json({ status: false, message: 'Invalid signature' });
    }

    const deposit = await prisma.deposit.findFirst({ where: { midtrans_order_id: order_id } });
    if (!deposit) return NextResponse.json({ status: false, message: 'Deposit not found' });

    const isSuccess = (transaction_status === 'settlement' || transaction_status === 'capture') && fraud_status === 'accept';
    if (isSuccess) {
      // Claim + credit in one transaction: only the caller that flips PENDING->SUCCESS credits,
      // and a failed credit rolls the claim back.
      let balanceAfter = 0;
      try {
        await prisma.$transaction(async (tx) => {
          const claimed = await tx.deposit.updateMany({
            where: { id: deposit.id, status: 'PENDING' },
            data: { status: 'SUCCESS' },
          });
          if (claimed.count === 0) throw new Error('ALREADY_PROCESSED');
          const user = await tx.user.findUnique({ where: { id: deposit.user_id } });
          if (!user) throw new Error('User not found');
          const balanceBefore = Number(user.balance);
          balanceAfter = balanceBefore + Number(deposit.net);
          await tx.$executeRaw`UPDATE users SET balance = balance + ${deposit.net}, updated_at = NOW() WHERE id = ${deposit.user_id}`;
          await tx.balanceLog.create({
            data: {
              user_id: deposit.user_id, type: 'PLUS', action: 'Deposit', amount: deposit.net,
              balance_before: balanceBefore, balance_after: balanceAfter, description: `Deposit #${deposit.id} via ${deposit.method}`,
            },
          });
        });
      } catch (e: any) {
        if (e.message === 'ALREADY_PROCESSED') return NextResponse.json({ status: false, message: 'Already processed' });
        throw e;
      }
      void notifyUser(deposit.user_id, 'deposit', `Deposit #${deposit.id} berhasil`,
        `<p>Deposit Rp ${Number(deposit.net).toLocaleString('id-ID')} masuk. Saldo: Rp ${balanceAfter.toLocaleString('id-ID')}</p>`);
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