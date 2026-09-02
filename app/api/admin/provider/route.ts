import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, name, provider_id, provider_key, provider_secret, status, is_refill_support, currency, profile_config, order_config, status_config, service_config, refill_config, refill_status_config } = await req.json();
    const parseJson = (v: string) => { try { return JSON.parse(v); } catch { return v; } };
    const data: any = { name, provider_id, provider_key, status, is_refill_support, currency };
    if (provider_secret !== undefined) data.provider_secret = provider_secret;
    for (const key of ['profile_config', 'order_config', 'status_config', 'service_config', 'refill_config', 'refill_status_config']) {
      if (eval(key) !== undefined) data[key] = parseJson(eval(key));
    }
    if (id) {
      await prisma.serviceProvider.update({ where: { id: parseInt(id) }, data });
    } else {
      await prisma.serviceProvider.create({ data });
    }
    return NextResponse.json({ message: 'Provider saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}