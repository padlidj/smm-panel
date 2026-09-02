import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BalanceLogClient } from './client';

export const dynamic = 'force-dynamic';

export default async function BalanceLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const page = Math.max(parseInt((searchParams.page as string) || '1', 10) || 1, 1);
  const PER_PAGE = 20;

  const [logs, total] = await Promise.all([
    prisma.balanceLog.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.balanceLog.count({ where: { user_id: userId } }),
  ]);

  return <BalanceLogClient logs={logs} total={total} page={page} />;
}