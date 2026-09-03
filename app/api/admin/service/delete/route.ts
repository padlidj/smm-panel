import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const serviceId = parseInt(id);
    const used = await prisma.order.count({ where: { service_id: serviceId } });
    if (used) return NextResponse.json({ error: `Layanan dipakai ${used} order. Nonaktifkan saja.` }, { status: 400 });

    await prisma.$transaction([
      prisma.customPrice.deleteMany({ where: { service_id: serviceId } }),
      prisma.serviceFavorite.deleteMany({ where: { service_id: serviceId } }),
      prisma.serviceLog.deleteMany({ where: { service_id: serviceId } }),
      prisma.service.delete({ where: { id: serviceId } }),
    ]);
    return NextResponse.json({ message: 'Service deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}