import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);
  const { service_id } = await req.json();
  if (!service_id) return NextResponse.json({ error: 'service_id required' }, { status: 400 });

  const existing = await prisma.serviceFavorite.findUnique({
    where: { user_id_service_id: { user_id: userId, service_id: Number(service_id) } },
  });
  if (existing) {
    await prisma.serviceFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ status: true, favorited: false });
  }
  await prisma.serviceFavorite.create({ data: { user_id: userId, service_id: Number(service_id) } });
  return NextResponse.json({ status: true, favorited: true });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);

  const favorites = await prisma.serviceFavorite.findMany({
    where: { user_id: userId },
    include: { service: { include: { category: { select: { name: true } } } } },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json({ status: true, data: favorites });
}