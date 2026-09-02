import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { LogTable } from './table';

export default async function AdminLoginLogsPage({ searchParams }: { searchParams: { page?: string; status?: string; username?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const username = getStr(searchParams, 'username');

  const where: any = { type: 'ADMIN' };
  if (status) where.status = status;
  if (username) where.username = { contains: username };

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.loginLog.count({ where }),
  ]);
  return <LogTable logs={logs} total={total} page={page} title="Admin Login Logs" basePath="/admin/log/admin/login" filters={{ status, username }} />;
}