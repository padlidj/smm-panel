import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const methods = await prisma.depositMethod.findMany({ where: { status: true }, orderBy: { payment: 'asc' } });
  return NextResponse.json({ status: true, data: methods });
}