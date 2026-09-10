import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Laravel Admin UserController::postForm parity: id set = update, no id = create
// (create hashes password + generates api_key; update password/api_key optional).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, username, email, balance, status, role, full_name, password, api_key } = await req.json();
    if (role !== undefined && !['USER', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    if (status && !['ACTIVE', 'BANNED', 'UNVERIFIED'].includes(status)) return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });

    if (!id) {
      // create: username+email+password mandatory (Laravel PostRequest rules); balance optional -> 0
      if (!username?.trim() || !email?.includes('@')) return NextResponse.json({ error: 'Username dan email wajib diisi' }, { status: 400 });
      if (!password || String(password).length < 6) return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      const newBalance = balance == null || balance === '' ? 0 : Number(balance);
      if (!Number.isSafeInteger(newBalance) || newBalance < 0) return NextResponse.json({ error: 'Balance tidak valid' }, { status: 400 });
      const dupe = await prisma.user.findFirst({ where: { OR: [{ username: String(username).trim() }, { email: String(email).trim() }] }, select: { username: true, email: true } });
      if (dupe) return NextResponse.json({ error: `Username/email sudah dipakai (${dupe.username})`, status: false });
      const user = await prisma.user.create({
        data: {
          username: String(username).trim(), email: String(email).trim(), full_name: full_name?.trim() || null,
          password: await bcrypt.hash(String(password), 12),
          balance: newBalance, role: role || 'USER', status: status || 'ACTIVE', // Laravel create: is_verified=1 -> ACTIVE
          api_key: randomBytes(24).toString('hex'),
        },
      });
      return NextResponse.json({ message: 'Pengguna berhasil ditambahkan.', user });
    }

    // update: strict legacy contract — id and balance always provided & validated pre-transaction
    if ([id, balance].some(value => typeof value !== 'number' && (typeof value !== 'string' || !value.trim())))
      return NextResponse.json({ error: 'Invalid balance or user ID' }, { status: 400 });
    const userId = Number(id);
    const newBalance = Number(balance);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(newBalance) || newBalance < 0)
      return NextResponse.json({ error: 'Invalid balance or user ID' }, { status: 400 });
    if (password && String(password).length < 6) return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });

    const data: any = { balance: newBalance, role: role || 'USER' };
    if (username?.trim()) data.username = String(username).trim();
    if (email?.trim()) data.email = String(email).trim();
    if (status) data.status = status;
    if (full_name !== undefined) data.full_name = String(full_name).trim() || null;
    if (api_key) data.api_key = String(api_key).trim();
    if (password) data.password = await bcrypt.hash(String(password), 12);

    const user = await prisma.$transaction(async (tx) => {
      // Lock before reading: an absolute admin adjustment must log the balance it replaces.
      const [existing] = await tx.$queryRaw<{ balance: unknown }[]>`SELECT balance FROM users WHERE id = ${userId} FOR UPDATE`;
      if (!existing) throw new Error('User not found');

      const updated = await tx.user.update({ where: { id: userId }, data });

      const delta = newBalance - Number(existing.balance);
      if (delta !== 0) {
        await tx.balanceLog.create({
          data: {
            user_id: userId,
            type: delta > 0 ? 'PLUS' : 'MINUS',
            action: 'admin_adjust',
            amount: Math.abs(delta),
            balance_before: Number(existing.balance),
            balance_after: newBalance,
            description: `Saldo disesuaikan admin`,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ message: 'Pengguna berhasil diperbarui.', user });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Username/email sudah dipakai' }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
