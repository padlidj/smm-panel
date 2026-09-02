import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DepositHistoryClient } from './client';

export const dynamic = 'force-dynamic';

export default async function DepositHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const page = Math.max(parseInt((searchParams.page as string) || '1', 10) || 1, 1);
  const PER_PAGE = 15;

  const [deposits, total] = await Promise.all([
    prisma.deposit.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.deposit.count({ where: { user_id: userId } }),
  ]);

  return <DepositHistoryClient deposits={deposits} total={total} page={page} />;
}