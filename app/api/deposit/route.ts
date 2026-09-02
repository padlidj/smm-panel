import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSnapTransaction } from '@/lib/midtrans';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { method_id, amount } = body;

  const method = await prisma.depositMethod.findUnique({ where: { id: Number(method_id), status: true } });
  if (!method) return NextResponse.json({ status: false, message: 'Metode tidak tersedia.' });
  if (amount < Number(method.min) || amount > Number(method.max)) {
    return NextResponse.json({ status: false, message: `Minimal Rp ${Number(method.min).toLocaleString('id-ID')}, maksimal Rp ${Number(method.max).toLocaleString('id-ID')}.` });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true } });
  if (!user) return NextResponse.json({ status: false, message: 'User not found' });

  const fee = Math.ceil((amount * Number(method.fee_percent)) / 100);
  const net = amount - fee;

  if (method.type === 'AUTO') {
    const orderId = `INV-${Date.now()}-${userId}`;
    try {
      const snap = await createSnapTransaction(orderId, amount, { name: user.username, email: user.email || `${user.username}@smm.com` });
      const deposit = await prisma.deposit.create({
        data: {
          user_id: userId, amount, fee, net, method: method.payment,
          midtrans_order_id: orderId, snap_token: snap.token, snap_redirect_url: snap.redirect_url,
          ip_address: req.headers.get('x-forwarded-for') || '',
        },
      });
      return NextResponse.json({ status: true, deposit_id: deposit.id, snap_redirect_url: snap.redirect_url });
    } catch (e: any) {
      return NextResponse.json({ status: false, message: e.message });
    }
  }

  // Manual deposit
  const deposit = await prisma.deposit.create({
    data: { user_id: userId, amount, fee, net, method: method.payment, ip_address: req.headers.get('x-forwarded-for') || '' },
  });
  return NextResponse.json({ status: true, deposit_id: deposit.id, message: 'Deposit menunggu konfirmasi admin.' });
}