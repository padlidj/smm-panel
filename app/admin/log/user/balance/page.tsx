import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr, dateRange } from '@/lib/admin';
import { BalanceLogTable } from './table';

export default async function UserBalanceLogsPage({ searchParams }: { searchParams: { page?: string; search?: string; filter_user?: string; filter_type?: string; filter_action?: string; filter_start_date?: string; filter_end_date?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const search = getStr(searchParams, 'search');
  const filter_user = getStr(searchParams, 'filter_user');
  const filter_type = getStr(searchParams, 'filter_type');
  const filter_action = getStr(searchParams, 'filter_action');
  const filter_start_date = getStr(searchParams, 'filter_start_date');
  const filter_end_date = getStr(searchParams, 'filter_end_date');

  const where: any = {};
  const range = dateRange(filter_start_date, filter_end_date);
  if (range) where.created_at = range;
  if (filter_user) where.user = { username: { contains: filter_user } };
  if (filter_type) where.type = filter_type;
  if (filter_action) where.action = { contains: filter_action };
  if (search) {
    const n = parseInt(search, 10);
    where.OR = [
      ...(String(n) === search.trim() ? [{ id: n }] : []),
      { type: { contains: search, mode: 'insensitive' } },
      { action: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.balanceLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } } } }),
    prisma.balanceLog.count({ where }),
  ]);
  return <BalanceLogTable logs={logs} total={total} page={page} filters={{ search, filter_user, filter_type, filter_action, filter_start_date, filter_end_date }} />;
}
