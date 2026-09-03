import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { RefillListClient } from './client';

export const dynamic = 'force-dynamic';

export default async function RefillListPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');

  const where: any = {};
  if (status) where.status = status;

  const [refills, total] = await Promise.all([
    prisma.orderRefill.findMany({
      where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { user: { select: { username: true } }, order: { select: { id: true, service_name: true } } },
    }),
    prisma.orderRefill.count({ where }),
  ]);
  return <RefillListClient refills={refills} total={total} page={page} status={status} />;
}
