import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bumpMainConfig } from '@/lib/config';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { key, ...values } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });
    const existing = await prisma.websiteConfig.findUnique({ where: { key } });
    const merged = { ...((existing?.value as any) || {}), ...values }; // Laravel postIndex keeps keys the form does not post (logo/favicon/banner)
    await prisma.websiteConfig.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    });
    if (key === 'main') bumpMainConfig();
    return NextResponse.json({ message: 'Settings saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}