import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ticket_id, message, user_id } = await req.json();
    const msg = String(message ?? '').trim();
    if (msg.length < 5 || msg.length > 300) return NextResponse.json({ error: 'Pesan minimal 5 dan maksimal 300 karakter.' }, { status: 400 });
    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(ticket_id) } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.status === 'CLOSED') return NextResponse.json({ error: 'Tiket sudah ditutup.' });

    await prisma.ticketReply.create({
      data: { ticket_id: parseInt(ticket_id), user_id: user_id ? parseInt(user_id) : null, message: msg, is_admin: true },
    });
    await prisma.ticket.update({ where: { id: parseInt(ticket_id) }, data: { status: 'REPLIED' } });
    // Laravel: email only when status actually changes (not already Replied)
    if (ticket.status !== 'REPLIED') {
      void notifyUser(ticket.user_id, 'ticket', `Balasan untuk ticket "${ticket.subject}"`,
        `<p>Admin membalas ticket Anda: <b>${ticket.subject}</b></p><blockquote>${msg}</blockquote>`);
    }
    return NextResponse.json({ message: 'Reply sent' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}