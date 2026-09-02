import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const services = await prisma.service.findMany({ where: { status: true }, include: { category: { select: { name: true } } }, orderBy: { name: 'asc' } });
  return NextResponse.json({ status: true, data: services });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { subject, message } = body;
  if (!subject || !message) return NextResponse.json({ status: false, message: 'Subject dan pesan wajib diisi.' });

  const userId = Number((session.user as any).id);
  const ticket = await prisma.ticket.create({
    data: { user_id: userId, subject, message },
  });

  return NextResponse.json({ status: true, ticket_id: ticket.id, message: 'Ticket berhasil dibuat.' });
}