import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ticket_id, message, user_id } = await req.json();
    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(ticket_id) } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    await prisma.ticketReply.create({
      data: { ticket_id: parseInt(ticket_id), user_id: user_id ? parseInt(user_id) : null, message, is_admin: true },
    });
    await prisma.ticket.update({ where: { id: parseInt(ticket_id) }, data: { status: 'REPLIED' } });
    return NextResponse.json({ message: 'Reply sent' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}