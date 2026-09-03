import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const providerId = parseInt(id);
    const used = await prisma.order.count({ where: { provider_id: providerId } });
    if (used) return NextResponse.json({ error: `Provider dipakai ${used} order. Nonaktifkan saja.` }, { status: 400 });
    const svcs = await prisma.service.count({ where: { provider_id: providerId } });
    if (svcs) return NextResponse.json({ error: `Provider punya ${svcs} layanan. Hapus layanan dulu.` }, { status: 400 });
    await prisma.serviceLog.deleteMany({ where: { provider_id: providerId } });
    await prisma.serviceProvider.delete({ where: { id: providerId } });
    return NextResponse.json({ message: 'Provider deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}