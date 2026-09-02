import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { provider_order_id, provider_id, status, remains, start_count } = await req.json();

    const where: any = { provider_order_id: String(provider_order_id) };
    if (provider_id) where.provider_id = Number(provider_id);

    const order = await prisma.order.findFirst({ where });
    if (!order) return NextResponse.json({ status: false, message: 'Order not found' });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (remains !== undefined) updateData.remains = remains;
    if (start_count !== undefined) updateData.start_count = start_count;

    await prisma.order.update({ where: { id: order.id }, data: updateData });

    return NextResponse.json({ status: true, message: 'Status updated' });
  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}