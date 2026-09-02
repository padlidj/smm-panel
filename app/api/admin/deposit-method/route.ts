import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, payment, method, type, min, max, fee_percent, status } = await req.json();
    const data: any = { payment, method, type, min: parseInt(min), max: parseInt(max), fee_percent: parseFloat(fee_percent), status };
    if (id) {
      await prisma.depositMethod.update({ where: { id: parseInt(id) }, data });
    } else {
      await prisma.depositMethod.create({ data });
    }
    return NextResponse.json({ message: 'Deposit method saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}