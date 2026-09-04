import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const refill = await prisma.orderRefill.findUnique({ where: { id: parseInt(id) } });
    if (!refill) return NextResponse.json({ error: 'Refill not found' }, { status: 404 });
    if (refill.status === 'SUCCESS') return NextResponse.json({ error: 'Refill sukses tidak bisa dihapus (audit trail).' }, { status: 400 });
    await prisma.orderRefill.delete({ where: { id: refill.id } });
    return NextResponse.json({ message: 'Refill deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
