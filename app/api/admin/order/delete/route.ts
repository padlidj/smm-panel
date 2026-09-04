import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status === 'SUCCESS') return NextResponse.json({ error: 'Order sukses tidak bisa dihapus (audit trail).' }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.orderRefill.deleteMany({ where: { order_id: order.id } });
      await tx.order.delete({ where: { id: order.id } });
    });
    return NextResponse.json({ message: 'Order deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
