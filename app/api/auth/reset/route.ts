import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Token dan password wajib diisi' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { reset_token: token, reset_token_expires: { gt: new Date() } },
  });
  if (!user) return NextResponse.json({ error: 'Token tidak valid atau sudah kedaluwarsa' }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
      reset_token: null,
      reset_token_expires: null,
    },
  });
  return NextResponse.json({ message: 'Password berhasil direset. Silakan login.' });
}