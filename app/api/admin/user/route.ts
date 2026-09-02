import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, username, email, balance, status, role } = await req.json();
    const userId = parseInt(id);
    const newBalance = parseInt(balance);

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: userId } });
      if (!existing) throw new Error('User not found');

      const updated = await tx.user.update({
        where: { id: userId },
        data: { username, email, balance: newBalance, status, role },
      });

      const delta = newBalance - Number(existing.balance);
      if (delta !== 0) {
        await tx.balanceLog.create({
          data: {
            user_id: userId,
            type: delta > 0 ? 'PLUS' : 'MINUS',
            action: 'admin_adjust',
            amount: Math.abs(delta),
            balance_before: Number(existing.balance),
            balance_after: newBalance,
            description: `Saldo disesuaikan admin`,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ message: 'User updated', user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}