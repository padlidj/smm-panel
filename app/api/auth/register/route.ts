import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getMainConfig } from '@/lib/config';

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

    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ message: 'Pendaftaran berhasil' }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}