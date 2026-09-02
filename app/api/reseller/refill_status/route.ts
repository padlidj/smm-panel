import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, data: { message: 'Invalid API key' } }, { status: 403 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ status: false, data: { message: 'Missing refill ID' } }, { status: 400 });

  const refill = await prisma.orderRefill.findFirst({
    where: { id: Number(id), user_id: user.id },
  });
  if (!refill) return NextResponse.json({ status: false, data: { message: 'Refill not found' } }, { status: 403 });

  return NextResponse.json({ status: true, data: { status: refill.status } });
}