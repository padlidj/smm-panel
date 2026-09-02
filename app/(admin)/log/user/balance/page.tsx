import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { BalanceLogTable } from './table';

export default async function UserBalanceLogsPage({ searchParams }: { searchParams: { page?: string; type?: string; username?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const type = getStr(searchParams, 'type');
  const username = getStr(searchParams, 'username');

  const where: any = {};
  if (type) where.type = type;
  if (username) where.user = { username: { contains: username } };

  const [logs, total] = await Promise.all([
    prisma.balanceLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } } } }),
    prisma.balanceLog.count({ where }),
  ]);
  return <BalanceLogTable logs={logs} total={total} page={page} filters={{ type, username }} />;
}