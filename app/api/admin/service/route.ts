import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, category_id, provider_id, name, type, price, profit, min, max, description, status, provider_service_id, refill_provider_service_id, is_refill_support, settings, update_automate, update_service } = await req.json();
    const data: any = { category_id: parseInt(category_id), provider_id: parseInt(provider_id), name, type, price: parseInt(price), profit: parseInt(profit), min: parseInt(min), max: parseInt(max), status };
    if (description !== undefined) data.description = description;
    if (provider_service_id !== undefined) data.provider_service_id = provider_service_id;
    if (refill_provider_service_id !== undefined) data.refill_provider_service_id = refill_provider_service_id || null;
    if (is_refill_support !== undefined) data.is_refill_support = !!is_refill_support;
    // Laravel ServiceController parity: settings JSON built from update_service + update_automate checkboxes
    if (update_automate !== undefined || settings !== undefined) {
      const on = (k: string) => (settings ? String((settings as any)[k]) === '1' : !!(update_automate as any)?.[k]) ? '1' : '0';
      data.settings = {
        update_service: settings ? String((settings as any).update_service) : (update_service ? '1' : '0'),
        name: on('name'), min_max: on('min_max'), price_profit: on('price_profit'), profit: on('profit'),
        description: on('description'), custom_comments: on('custom_comments'), refill_support: on('refill_support'), status: on('status'),
      };
    }
    if (id) {
      await prisma.service.update({ where: { id: parseInt(id) }, data });
    } else {
      await prisma.service.create({ data });
    }
    return NextResponse.json({ message: 'Service saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}