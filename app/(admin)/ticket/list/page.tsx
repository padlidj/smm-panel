import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { TicketListClient } from './client';

export default async function TicketListPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');

  const where: any = {};
  if (status) where.status = status;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } }, _count: { select: { replies: true } } } }),
    prisma.ticket.count({ where }),
  ]);
  return <TicketListClient tickets={tickets} total={total} page={page} status={status} />;
}