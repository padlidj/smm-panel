import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { key, ...values } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });
    await prisma.websiteConfig.upsert({
      where: { key },
      update: { value: values },
      create: { key, value: values },
    });
    return NextResponse.json({ message: 'Settings saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}