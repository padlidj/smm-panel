import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const info = await prisma.websiteInformation.findFirst({
    where: { status: true }, orderBy: { id: 'desc' }, select: { id: true, title: true, content: true },
  });
  return NextResponse.json({ status: true, data: info });
}
