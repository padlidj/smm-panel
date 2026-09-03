import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { user_id, subject, message } = await req.json();
    if (!user_id || !subject || !message) return NextResponse.json({ error: 'User, subject, pesan wajib diisi' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: parseInt(user_id) }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    const ticket = await prisma.ticket.create({
      data: { user_id: user.id, subject: String(subject), message: String(message) },
    });

    void notifyUser(user.id, 'ticket', `Admin membuka ticket "${subject}"`,
      `<p>Admin membuka ticket untuk Anda: <b>${subject}</b></p><blockquote>${message}</blockquote>`);
    return NextResponse.json({ status: true, ticket_id: ticket.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
