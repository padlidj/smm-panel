import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const ticketId = parseInt(params.id);
  const { message } = await req.json();

  if (!message) return NextResponse.json({ status: false, message: 'Pesan wajib diisi.' });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.user_id !== userId) return NextResponse.json({ status: false, message: 'Ticket not found' });
  if (ticket.status === 'CLOSED') return NextResponse.json({ status: false, message: 'Ticket sudah ditutup.' });

  await prisma.ticketReply.create({
    data: { ticket_id: ticketId, user_id: userId, message },
  });
  await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });

  return NextResponse.json({ status: true, message: 'Reply terkirim.' });
}