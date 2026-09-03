import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const categoryId = parseInt(id);
    const used = await prisma.service.count({ where: { category_id: categoryId } });
    if (used) return NextResponse.json({ error: `Kategori punya ${used} layanan. Pindahkan/hapus layanan dulu.` }, { status: 400 });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    return NextResponse.json({ message: 'Category deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}