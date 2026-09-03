import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const userId = parseInt(id);

    const [orders, deposits, tickets] = await Promise.all([
      prisma.order.count({ where: { user_id: userId } }),
      prisma.deposit.count({ where: { user_id: userId } }),
      prisma.ticket.count({ where: { user_id: userId } }),
    ]);
    if (orders || deposits || tickets) {
      return NextResponse.json({ error: `User punya riwayat (order: ${orders}, deposit: ${deposits}, ticket: ${tickets}). Ban saja, jangan hapus.` }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.customPrice.deleteMany({ where: { user_id: userId } }),
      prisma.serviceFavorite.deleteMany({ where: { user_id: userId } }),
      prisma.serviceLog.deleteMany({ where: { user_id: userId } }),
      prisma.balanceLog.deleteMany({ where: { user_id: userId } }),
      prisma.loginLog.deleteMany({ where: { user_id: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return NextResponse.json({ message: 'User deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}