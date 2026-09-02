import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const deposit = await prisma.deposit.findUnique({ where: { id: parseInt(id) } });
    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    if (deposit.status !== 'PENDING') return NextResponse.json({ error: 'Deposit not pending' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: deposit.user_id } });
      if (!user) throw new Error('User not found');
      const balanceBefore = Number(user.balance);
      const balanceAfter = balanceBefore + Number(deposit.net);

      await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'SUCCESS' } });
      await tx.user.update({ where: { id: deposit.user_id }, data: { balance: balanceAfter } });
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
    return NextResponse.json({ message: 'Deposit approved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}