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

    await prisma.$transaction([
      prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'SUCCESS' } }),
      prisma.user.update({ where: { id: deposit.user_id }, data: { balance: { increment: deposit.net } } }),
      prisma.balanceLog.create({
        data: {
          user_id: deposit.user_id,
          type: 'PLUS',
          action: 'deposit',
          amount: deposit.net,
          balance_before: 0,
          balance_after: 0,
          description: `Deposit via ${deposit.method} approved`,
        },
      }),
    ]);
    return NextResponse.json({ message: 'Deposit approved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}