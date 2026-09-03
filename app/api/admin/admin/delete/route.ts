import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const adminId = parseInt(id);
    if (Number((session.user as any)?.id) === adminId) return NextResponse.json({ error: 'Tidak bisa hapus akun sendiri' }, { status: 400 });
    const superCount = await prisma.admin.count({ where: { level: 'SUPERADMIN', status: true } });
    const target = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!target) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (target.level === 'SUPERADMIN' && superCount <= 1) return NextResponse.json({ error: 'Superadmin terakhir tidak bisa dihapus' }, { status: 400 });
    await prisma.admin.delete({ where: { id: adminId } });
    return NextResponse.json({ message: 'Admin deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}