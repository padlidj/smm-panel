import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { full_name, email } = body;

  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return NextResponse.json({ status: false, message: 'Email wajib diisi.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return NextResponse.json({ status: false, message: 'Format email tidak valid.' });

  try {
    await prisma.user.update({ where: { id: userId }, data: { full_name, email: clean } });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ status: false, message: 'Email sudah dipakai akun lain.' });
    throw e;
  }
  return NextResponse.json({ status: true, message: 'Profil berhasil disimpan.' });
}
