import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 — don't leak whether email exists
  if (user) {
    const token = randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: new Date(Date.now() + 3600_000) },
    });
    const resetUrl = `${process.env.NEXTAUTH_URL || 'https://kuygas.my.id'}/auth/reset/${token}`;
    await sendEmail(
      user.email,
      'Reset Password',
      `<p>Halo ${user.username},</p><p>Klik link berikut untuk reset password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Link berlaku 1 jam.</p>`
    );
  }
  return NextResponse.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
}