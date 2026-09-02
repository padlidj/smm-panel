import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, content } = await req.json();
    if (!title || !content) return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    await prisma.websiteInformation.create({ data: { title, content, status: true } });
    return NextResponse.json({ message: 'Notification saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}