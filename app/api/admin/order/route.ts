import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status, target, provider_order_id, remains, start_count } = await req.json();
    const data: any = {};
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
      data.status = status;
    }
    if (target !== undefined) data.target = String(target).trim() || undefined;
    if (provider_order_id !== undefined) data.provider_order_id = String(provider_order_id).trim() || null;
    if (remains !== undefined) data.remains = Math.max(0, parseInt(remains) || 0);
    if (start_count !== undefined) data.start_count = Math.max(0, parseInt(start_count) || 0);
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });

    const order = await prisma.order.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json({ status: true, order_id: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
