import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();

  if (body.generate_api_key) {
    const apiKey = `SMM-${crypto.randomBytes(24).toString('hex')}`;
    await prisma.user.update({ where: { id: userId }, data: { api_key: apiKey } });
    return NextResponse.json({ status: true, api_key: apiKey, message: 'API key generated.' });
  }

  if (body.notification) {
    await prisma.user.update({ where: { id: userId }, data: { notification: body.notification } });
    return NextResponse.json({ status: true, message: 'Pengaturan disimpan.' });
  }

  if (body.api_whitelist_ips !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { api_whitelist_ips: String(body.api_whitelist_ips).trim() } });
    return NextResponse.json({ status: true, message: 'Whitelist IP disimpan.' });
  }

  return NextResponse.json({ status: false, message: 'No action specified.' });
}