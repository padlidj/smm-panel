import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status } = await req.json();
    if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    await prisma.orderRefill.update({ where: { id: parseInt(id) }, data: { status } });
    return NextResponse.json({ status: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
