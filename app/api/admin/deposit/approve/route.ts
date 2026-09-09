import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';
import { creditGuard } from '@/lib/balance';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const deposit = await prisma.deposit.findUnique({ where: { id: parseInt(id) } });
    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });

    let balanceAfter = 0;
    try {
      await prisma.$transaction(async (tx) => {
        // Claim: only one concurrent approve flips PENDING->SUCCESS and credits.
        const claimed = await tx.deposit.updateMany({
          where: { id: deposit.id, status: 'PENDING' },
          data: { status: 'SUCCESS' },
        });
        if (claimed.count === 0) throw new Error('ALREADY_PROCESSED');
        const credited = await creditGuard(tx, deposit.user_id, Number(deposit.net));
        const balanceBefore = credited.balanceBefore;
        balanceAfter = credited.balanceAfter;
        await tx.balanceLog.create({
          data: {
            user_id: deposit.user_id,
            type: 'PLUS',
            action: 'deposit',
            amount: deposit.net,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Deposit via ${deposit.method} approved`,
          },
        });
      });
    } catch (e: any) {
      if (e.message === 'ALREADY_PROCESSED') return NextResponse.json({ error: 'Deposit not pending' }, { status: 400 });
      throw e;
    }
    void notifyUser(deposit.user_id, 'deposit', `Deposit #${deposit.id} disetujui`,
      `<p>Deposit Rp ${Number(deposit.net).toLocaleString('id-ID')} berhasil. Saldo: Rp ${balanceAfter.toLocaleString('id-ID')}</p>`);
    return NextResponse.json({ message: 'Deposit approved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}