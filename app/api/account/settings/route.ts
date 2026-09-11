import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'user') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();

  if (body.generate_api_key) {
    const apiKey = `SMM-${crypto.randomBytes(24).toString('hex')}`;
    await prisma.user.update({ where: { id: userId }, data: { api_key: apiKey } });
    return NextResponse.json({ status: true, api_key: apiKey, message: 'API key generated.' });
  }

  if (body.notification) {
    // Laravel parity: per-key toggle preserves unknown keys (setNotification loops existing json)
    const cur = await prisma.user.findUnique({ where: { id: userId }, select: { notification: true } });
    const merged = { ...((cur?.notification as any) || {}) };
    for (const k of ['order', 'deposit', 'ticket']) {
      if (body.notification[k] === undefined) continue;
      merged[k] = body.notification[k] === '1' ? '1' : '0'; // whitelist values (Laravel in_array ['0','1'])
    }
    await prisma.user.update({ where: { id: userId }, data: { notification: merged } });
    return NextResponse.json({ status: true, message: 'Notifikasi berhasil diperbarui.' });
  }

  if (body.api_whitelist_ips !== undefined) {
    const raw = String(body.api_whitelist_ips).trim();
    // Laravel parity: each comma item must be a valid IP (postSettingsWhitelistIP)
    const isIp = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) ? s.split('.').every(o => Number(o) <= 255) : /^[0-9a-f:]+$/i.test(s) && s.includes(':');
    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    const bad = items.find(s => !isIp(s));
    if (bad !== undefined) return NextResponse.json({ status: false, type: 'validation', message: `Whitelist IP tidak valid: ${bad}` });
    await prisma.user.update({ where: { id: userId }, data: { api_whitelist_ips: items.join(',') } });
    return NextResponse.json({ status: true, message: 'Whitelist IP disimpan.' });
  }

  return NextResponse.json({ status: false, message: 'No action specified.' });
}