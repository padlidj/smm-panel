import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, name, status } = await req.json();
    if (id) {
      await prisma.serviceCategory.update({ where: { id: parseInt(id) }, data: { name, status } });
    } else {
      await prisma.serviceCategory.create({ data: { name, status } });
    }
    return NextResponse.json({ message: 'Category saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}