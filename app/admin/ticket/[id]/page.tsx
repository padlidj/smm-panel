import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { TicketDetailClient } from './client';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(params.id) },
    include: { user: { select: { username: true, email: true } }, replies: { orderBy: { created_at: 'asc' } } },
  });
  if (!ticket) return <div className="text-center text-muted-foreground">Ticket not found</div>;
  return <TicketDetailClient ticket={ticket} />;
}