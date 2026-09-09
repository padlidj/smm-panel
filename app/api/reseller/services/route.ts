import { NextResponse } from 'next/server';
import { getApiUser, getApiParams } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const user = await getApiUser(req, await getApiParams(req));
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  const services = await prisma.service.findMany({
    where: { status: true },
    include: { category: true },
    orderBy: { id: 'asc' },
  });

  const data = services.map((s) => ({
    id: s.id,
    category: s.category.name,
    name: s.name,
    type: s.type,
    price: s.price,
    min: s.min,
    max: s.max,
    description: s.description,
    status: s.status,
  }));

  return NextResponse.json({ status: true, data });
}

// Standard SMM clients POST here
export const POST = GET;