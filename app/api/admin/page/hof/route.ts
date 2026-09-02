import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, slug, content } = await req.json();
    if (!title || !slug || !content) return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    await prisma.websitePage.upsert({
      where: { slug },
      update: { title, content },
      create: { title, slug, content, status: true },
    });
    return NextResponse.json({ message: 'Page saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}