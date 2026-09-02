import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { full_name, email } = body;

  if (!email) return NextResponse.json({ status: false, message: 'Email wajib diisi.' });

  await prisma.user.update({ where: { id: userId }, data: { full_name, email } });
  return NextResponse.json({ status: true, message: 'Profil berhasil disimpan.' });
}