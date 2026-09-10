import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr, dateRange, searchOr } from '@/lib/admin';
import { LogTable } from './table';

export default async function AdminLoginLogsPage({ searchParams }: { searchParams: { page?: string; status?: string; search?: string; filter_user?: string; filter_start_date?: string; filter_end_date?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const search = getStr(searchParams, 'search');
  const filter_user = getStr(searchParams, 'filter_user');
  const filter_start_date = getStr(searchParams, 'filter_start_date');
  const filter_end_date = getStr(searchParams, 'filter_end_date');
  const range = dateRange(filter_start_date, filter_end_date);

  const where: any = { type: 'ADMIN' };
  if (status) where.status = status;
  if (range) where.created_at = range;
  if (filter_user) where.username = { contains: filter_user };
  if (search) where.OR = searchOr(search, 'id', ['username', 'ip_address']);

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.loginLog.count({ where }),
  ]);
  return <LogTable logs={logs} total={total} page={page} title="Admin Login Logs" basePath="/admin/log/admin/login" filters={{ status, search, filter_user, filter_start_date, filter_end_date }} />;
}
