import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const services = await prisma.service.findMany({ where: { status: true }, select: { id: true, name: true, price: true, min: true, max: true, category_id: true, type: true, description: true }, orderBy: { name: 'asc' } });
  return NextResponse.json({ status: true, data: services });
}