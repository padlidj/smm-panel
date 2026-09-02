import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { debitBalance } from '@/lib/balance';
import { executeProviderOrder } from '@/lib/provider';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { service_id, targets } = body;
  // targets: array of { target, quantity } — single or bulk

  if (!Array.isArray(targets) || targets.length === 0) return NextResponse.json({ status: false, message: 'Target tidak boleh kosong.' });
  if (targets.length > 20) return NextResponse.json({ status: false, message: 'Maksimal 20 target per pesanan.' });

  const service = await prisma.service.findFirst({ where: { id: Number(service_id), status: true }, include: { provider: true } });
  if (!service) return NextResponse.json({ status: false, message: 'Layanan tidak tersedia.' });

  const customPrice = await prisma.customPrice.findUnique({ where: { user_id_service_id: { user_id: userId, service_id: service.id } } });
  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;

  const orders = [];
  const errors = [];
  let totalPrice = 0;

  for (const t of targets) {
    const target = String(t.target ?? '').trim();
    const quantity = Number(t.quantity);
    if (!target || !Number.isInteger(quantity) || quantity < service.min || quantity > service.max) {
      errors.push({ target: target || '(kosong)', error: `Jumlah harus ${service.min}-${service.max}.` });
      continue;
    }
    const price = Math.ceil((pricePerUnit / 1000) * quantity);
    totalPrice += price;
    orders.push({ target, quantity, price });
  }

  if (orders.length === 0) return NextResponse.json({ status: false, message: 'Semua target gagal divalidasi.' });

  try {
    await debitBalance(userId, totalPrice, 'Order', `Bulk pesanan #${service.name} (${orders.length} target)`);
  } catch {
    return NextResponse.json({ status: false, message: 'Saldo tidak mencukupi.' });
  }

  const created = [];
  for (const o of orders) {
    const order = await prisma.order.create({
      data: {
        user_id: userId, service_id: service.id, provider_id: service.provider_id,
        service_name: service.name, target: o.target, quantity: o.quantity, price: o.price,
        profit: Math.ceil((profitPerUnit / 1000) * o.quantity),
        status: 'PENDING', ip_address: req.headers.get('x-forwarded-for') || '',
      },
    });
    if (service.provider.name !== 'MANUAL') {
      executeProviderOrder(service.provider, order, { service, target: o.target, quantity: o.quantity }).then(() => {}).catch(() => {});
    }
    created.push({ order_id: order.id, target: o.target, quantity: o.quantity, price: o.price, status: 'PENDING' });
  }

  return NextResponse.json({
    status: true,
    data: { orders: created, total_price: totalPrice },
    message: errors.length
      ? `${created.length} pesanan dibuat. ${errors.length} target gagal.`
      : `${created.length} pesanan berhasil dibuat.`,
  });
}