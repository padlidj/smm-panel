import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr, dateRange, searchOr } from '@/lib/admin';
import { RegisterLogTable } from './table';

export default async function UserRegisterLogsPage({ searchParams }: { searchParams: { page?: string; search?: string; filter_user?: string; filter_start_date?: string; filter_end_date?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const search = getStr(searchParams, 'search');
  const filter_user = getStr(searchParams, 'filter_user');
  const filter_start_date = getStr(searchParams, 'filter_start_date');
  const filter_end_date = getStr(searchParams, 'filter_end_date');

  const where: any = {};
  const range = dateRange(filter_start_date, filter_end_date);
  if (range) where.created_at = range;
  if (filter_user) where.user = { username: { contains: filter_user } };
  if (search) where.OR = searchOr(search, 'id', ['username', 'email', 'ip_address']);

  const [logs, total] = await Promise.all([
    prisma.registerLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.registerLog.count({ where }),
  ]);
  return <RegisterLogTable logs={logs} total={total} page={page} filters={{ search, filter_user, filter_start_date, filter_end_date }} />;
}
