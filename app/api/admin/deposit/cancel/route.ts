import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  const deposit = await prisma.deposit.findUnique({ where: { id: Number(id) } });
  if (!deposit) return NextResponse.json({ error: 'Deposit tidak ditemukan' }, { status: 404 });
  // Conditional update: cancel loses the race against approve/webhook if not PENDING anymore.
  const cancelled = await prisma.deposit.updateMany({
    where: { id: deposit.id, status: 'PENDING' },
    data: { status: 'EXPIRED' },
  });
  if (cancelled.count === 0) return NextResponse.json({ error: 'Hanya deposit PENDING yang bisa dibatalkan' }, { status: 400 });
  return NextResponse.json({ status: true });
}