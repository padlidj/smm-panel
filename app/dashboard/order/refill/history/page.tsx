import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RefillHistoryClient } from './client';

export const dynamic = 'force-dynamic';

export default async function RefillHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const page = Math.max(parseInt((searchParams.page as string) || '1', 10) || 1, 1);
  const PER_PAGE = 15;

  const [refills, total] = await Promise.all([
    prisma.orderRefill.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { order: { select: { service_name: true, target: true } } } }),
    prisma.orderRefill.count({ where: { user_id: userId } }),
  ]);

  return <RefillHistoryClient refills={refills} total={total} page={page} />;
}