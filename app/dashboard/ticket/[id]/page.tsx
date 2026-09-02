import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TicketDetailClient } from './client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(params.id) }, include: { replies: { orderBy: { created_at: 'asc' } } } });
  if (!ticket || ticket.user_id !== userId) redirect('/dashboard/ticket/list');

  return <TicketDetailClient ticket={ticket} />;
}