import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const services = await prisma.service.findMany({
    where: { status: true },
    include: { category: true, provider: true },
    orderBy: { id: 'asc' },
  });

  const data = services.map((s) => ({
    id: s.id,
    category: s.category.name,
    name: s.name,
    type: s.type,
    price: s.price,
    profit: s.profit,
    min: s.min,
    max: s.max,
    description: s.description,
    status: s.status,
    provider: s.provider.name,
  }));

  return NextResponse.json({ status: true, data });
}