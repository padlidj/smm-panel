import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

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

    const before = await prisma.order.findUnique({ where: { id: parseInt(id) }, include: { user: { select: { email: true, username: true, notification: true } } } });
    const order = await prisma.order.update({ where: { id: parseInt(id) }, data });

    // Laravel parity: email user when admin changes status and user notification.order == '1'
    if (before && status && status !== before.status) {
      const notif: any = before.user.notification || {};
      if (String(notif.order) === '1' && before.user.email) {
        void sendEmail(before.user.email, 'Informasi Pesanan',
          `<p>Halo ${before.user.username}, pesanan #${order.id} (${order.service_name}) target ${order.target} qty ${order.quantity} harga Rp ${Number(order.price).toLocaleString('id-ID')} kini berstatus <b>${order.status}</b>.</p>`
        ).catch(() => {}); // fire-and-forget like Laravel (send_email swallows errors)
      }
    }
    return NextResponse.json({ status: true, order_id: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
