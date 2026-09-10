import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { TicketListClient } from './client';

export default async function TicketListPage({ searchParams }: { searchParams: { page?: string; status?: string; search?: string; filter_user?: string; filter_start_date?: string; filter_end_date?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const search = getStr(searchParams, 'search');
  const filter_user = getStr(searchParams, 'filter_user');
  const from = getStr(searchParams, 'filter_start_date');
  const to = getStr(searchParams, 'filter_end_date');

  const where: any = {};
  if (status) where.status = status;
  if (filter_user) where.user = { username: { contains: filter_user, mode: 'insensitive' } };
  if (search) where.OR = [
    { id: /^\d+$/.test(search) ? parseInt(search) : -1 },
    { subject: { contains: search, mode: 'insensitive' } },
    { status: { contains: search, mode: 'insensitive' } },
    { user: { username: { contains: search, mode: 'insensitive' } } },
  ];
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(`${from}T00:00:00`);
    if (to) where.created_at.lte = new Date(`${to}T23:59:59.999`);
  }

  const [tickets, total, users] = await Promise.all([
    prisma.ticket.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } }, _count: { select: { replies: true } } } }),
    prisma.ticket.count({ where }),
    prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, username: true }, orderBy: { username: 'asc' }, take: 500 }),
  ]);
  return <TicketListClient tickets={tickets} total={total} page={page} status={status} search={search} filter_user={filter_user} filter_start_date={from} filter_end_date={to} users={users} />;
}
