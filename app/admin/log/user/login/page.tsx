import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { LogTable } from './table';

export default async function UserLoginLogsPage({ searchParams }: { searchParams: { page?: string; status?: string; username?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const username = getStr(searchParams, 'username');

  const where: any = { type: 'USER' };
  if (status) where.status = status;
  if (username) where.username = { contains: username };

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.loginLog.count({ where }),
  ]);
  return <LogTable logs={logs} total={total} page={page} title="User Login Logs" basePath="/admin/log/user/login" filters={{ status, username }} />;
}