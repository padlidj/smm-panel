import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const isAdmin = async () => {
  const session = await getServerSession(authOptions);
  return session && (session.user as any)?.role === 'admin';
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const userId = searchParams.get('user_id');
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const take = 10;

  const where: any = {
    ...(userId ? { user_id: Number(userId) } : {}),
    ...(search ? {
      user: { username: { contains: search, mode: 'insensitive' } },
    } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.customPrice.count({ where }),
    prisma.customPrice.findMany({
      where,
      include: { user: { select: { username: true } }, service: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  return NextResponse.json({ status: true, data: items, total, page, totalPages: Math.ceil(total / take) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { user_id, service_id, price, profit } = body;

  if (!user_id || !service_id || price === undefined) {
    return NextResponse.json({ status: false, message: 'Data tidak lengkap' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: Number(user_id) } });
  const service = await prisma.service.findUnique({ where: { id: Number(service_id) } });
  if (!user || !service) {
    return NextResponse.json({ status: false, message: 'User atau layanan tidak ditemukan' }, { status: 404 });
  }

  const item = await prisma.customPrice.upsert({
    where: { user_id_service_id: { user_id: Number(user_id), service_id: Number(service_id) } },
    update: { price: Number(price), profit: Number(profit || 0) },
    create: { user_id: Number(user_id), service_id: Number(service_id), price: Number(price), profit: Number(profit || 0) },
  });

  return NextResponse.json({ status: true, data: item });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ status: false, message: 'ID tidak valid' }, { status: 400 });
  await prisma.customPrice.delete({ where: { id } });
  return NextResponse.json({ status: true });
}