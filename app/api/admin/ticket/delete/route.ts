import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const ticketId = parseInt(id);
    await prisma.$transaction([
      prisma.ticketReply.deleteMany({ where: { ticket_id: ticketId } }),
      prisma.ticket.delete({ where: { id: ticketId } }),
    ]);
    return NextResponse.json({ message: 'Ticket deleted' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}