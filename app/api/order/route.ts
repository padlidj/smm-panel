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
  const { service_id, target, quantity, custom_comments, username } = body;

  const service = await prisma.service.findFirst({ where: { id: Number(service_id), status: true }, include: { provider: true } });
  if (!service) return NextResponse.json({ status: false, message: 'Layanan tidak tersedia.' });

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json({ status: false, message: `Jumlah minimal ${service.min}, maksimal ${service.max}.` });
  }

  const customPrice = await prisma.customPrice.findUnique({ where: { user_id_service_id: { user_id: userId, service_id: service.id } } });

  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;
  const totalPrice = Math.ceil((pricePerUnit / 1000) * quantity);
  const totalProfit = Math.ceil((profitPerUnit / 1000) * quantity);

  try {
    await debitBalance(userId, totalPrice, 'Order', `Pesanan #${service.name}`);
  } catch (e) {
    return NextResponse.json({ status: false, message: 'Saldo tidak mencukupi.' });
  }

  const order = await prisma.order.create({
    data: {
      user_id: userId, service_id: service.id, provider_id: service.provider_id,
      service_name: service.name, target: String(target), quantity, price: totalPrice, profit: totalProfit,
      status: 'PENDING', ip_address: req.headers.get('x-forwarded-for') || '',
      custom_comments, username,
    },
  });

  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .then(() => {})
      .catch(() => {});
  }

  return NextResponse.json({ status: true, order_id: order.id, message: 'Pesanan berhasil dibuat.' });
}