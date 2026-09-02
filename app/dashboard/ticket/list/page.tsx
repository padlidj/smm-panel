import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TicketListClient } from './client';

export const dynamic = 'force-dynamic';

export default async function TicketListPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const page = Math.max(parseInt((searchParams.page as string) || '1', 10) || 1, 1);
  const status = (searchParams.status as string) || '';
  const PER_PAGE = 15;

  const where: any = { user_id: userId };
  if (status) where.status = status;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { replies: true } } } }),
    prisma.ticket.count({ where }),
  ]);

  return <TicketListClient tickets={tickets} total={total} page={page} status={status} />;
}