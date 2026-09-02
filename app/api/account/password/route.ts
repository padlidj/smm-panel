import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const { old_password, new_password } = await req.json();

  if (!old_password || !new_password) return NextResponse.json({ status: false, message: 'Isi password lama dan baru.' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) return NextResponse.json({ status: false, message: 'User not found' });

  const valid = await bcrypt.compare(old_password, user.password);
  if (!valid) return NextResponse.json({ status: false, message: 'Password lama salah.' });

  const hashed = await bcrypt.hash(new_password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ status: true, message: 'Password berhasil diubah.' });
}