import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;
  if (!session || me?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me?.level !== 'SUPERADMIN') return NextResponse.json({ error: 'Hanya SUPERADMIN yang bisa mengelola admin' }, { status: 403 });

  try {
    const { id, username, email, password, level, status } = await req.json();
    if (!username?.trim() || username.length > 20 || !email?.includes('@')) return NextResponse.json({ error: 'Username (maks 20) dan email valid wajib diisi' }, { status: 400 });
    if (level && !['ADMIN', 'SUPERADMIN'].includes(level)) return NextResponse.json({ error: 'Level tidak valid' }, { status: 400 });
    const bcrypt = (await import('bcryptjs')).default;
    const data: any = { username: String(username).trim(), email: String(email).trim(), level, status };
    if (password) data.password = await bcrypt.hash(password, 10);
    if (id) {
      if (Number(me.id) === parseInt(id)) {
        if (status === false) return NextResponse.json({ error: 'Tidak bisa menonaktifkan akun sendiri' }, { status: 400 });
        if (level && level !== me.level) return NextResponse.json({ error: 'Tidak bisa mengubah level sendiri' }, { status: 400 });
      }
      if (!password) delete data.password;
      await prisma.admin.update({ where: { id: parseInt(id) }, data });
    } else {
      if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
      await prisma.admin.create({ data });
    }
    return NextResponse.json({ message: 'Admin saved' });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Username/email sudah dipakai admin lain' }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}