import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const deposit = await prisma.deposit.findUnique({ where: { id: parseInt(id) } });
    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    if (deposit.status === 'SUCCESS') return NextResponse.json({ error: 'Deposit sukses tidak bisa dihapus (audit trail).' }, { status: 400 });
    await prisma.deposit.delete({ where: { id: deposit.id } });
    return NextResponse.json({ message: 'Deposit deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}