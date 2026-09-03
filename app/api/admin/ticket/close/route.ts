import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const ticket = await prisma.ticket.update({ where: { id: parseInt(id) }, data: { status: 'CLOSED' } });
    void notifyUser(ticket.user_id, 'ticket', `Ticket "${ticket.subject}" ditutup`,
      `<p>Ticket Anda telah ditutup oleh admin.</p>`);
    return NextResponse.json({ message: 'Ticket closed' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}