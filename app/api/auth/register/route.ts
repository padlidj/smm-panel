import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getMainConfig } from '@/lib/config';
import { sendEmail } from '@/lib/email';

const regHits = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const cfg = await getMainConfig();
    if (!cfg.is_register_enabled) {
      return NextResponse.json({ error: 'Pendaftaran sedang dinonaktifkan' }, { status: 403 });
    }
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Username 3-20 karakter (huruf, angka, _ . -)' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    // ponytail: in-process limiter, resets on restart; move to DB/redis if ever multi-instance
    const ip = req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const recent = regHits.get(ip) || [];
    const keep = recent.filter((t) => now - t < 60_000);
    if (keep.length >= 5) {
      regHits.set(ip, keep);
      return NextResponse.json({ error: 'Terlalu banyak percobaan, coba lagi nanti' }, { status: 429 });
    }
    keep.push(now);
    regHits.set(ip, keep);
    if (regHits.size > 10_000) regHits.clear();

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Username atau email sudah terdaftar' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Activation email only when both the setting and SMTP are on — otherwise users would lock themselves out
    const needVerify = !!cfg.is_email_verification_enabled && !!process.env.SMTP_USER;
    const activateToken = needVerify ? randomBytes(32).toString('hex') : null;

    const created = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        status: needVerify ? 'UNVERIFIED' : 'ACTIVE',
        activate_token: activateToken,
      },
    });

    await prisma.registerLog.create({ data: { user_id: created.id, username, email, ip_address: ip, user_agent: req.headers.get('user-agent')?.slice(0, 255) || null } }).catch(() => {});

    if (needVerify) {
      const url = `${process.env.NEXTAUTH_URL || 'https://kuygas.my.id'}/auth/activate/${activateToken}`;
      await sendEmail(email, 'Aktivasi Akun',
        `<p>Halo ${username}, klik untuk aktivasi akun:</p><p><a href="${url}">${url}</a></p>`).catch(() => {});
      return NextResponse.json({ message: 'Pendaftaran berhasil. Cek email untuk aktivasi akun.' }, { status: 201 });
    }

    return NextResponse.json({ message: 'Pendaftaran berhasil' }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}