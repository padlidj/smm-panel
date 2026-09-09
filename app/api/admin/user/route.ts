import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, username, email, balance, status, role } = await req.json();
    if ([id, balance].some(value => typeof value !== 'number' && (typeof value !== 'string' || !value.trim())))
      return NextResponse.json({ error: 'Invalid balance or user ID' }, { status: 400 });
    const userId = Number(id);
    const newBalance = Number(balance);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(newBalance) || newBalance < 0)
      return NextResponse.json({ error: 'Invalid balance or user ID' }, { status: 400 });

    const user = await prisma.$transaction(async (tx) => {
      // Lock before reading: an absolute admin adjustment must log the balance it replaces.
      const [existing] = await tx.$queryRaw<{ balance: unknown }[]>`SELECT balance FROM users WHERE id = ${userId} FOR UPDATE`;
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