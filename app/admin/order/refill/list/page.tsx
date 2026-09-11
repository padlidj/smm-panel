import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr, dateRange, searchOr } from '@/lib/admin';
import { RefillListClient } from './client';

export const dynamic = 'force-dynamic';

export default async function RefillListPage({ searchParams }: { searchParams: any }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const user = getStr(searchParams, 'user');
  const service = getStr(searchParams, 'service');
  const search = getStr(searchParams, 'search');

  const where: any = {};
  if (status) where.status = status;
  if (user) where.user = { username: { contains: user, mode: 'insensitive' } };
  if (service) where.order = { service_name: { contains: service, mode: 'insensitive' } };
  Object.assign(where, { created_at: dateRange(getStr(searchParams, 'start_date'), getStr(searchParams, 'end_date')) });

  // Laravel filter_user also matches refill target / order id
  if (search) where.OR = [...searchOr(search, 'id', ['target']), { order_id: Number(search) || -1 }];

  const [refills, total] = await Promise.all([
    prisma.orderRefill.findMany({
      where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { user: { select: { username: true } }, order: { select: { id: true, service_name: true } } },
    }),
    prisma.orderRefill.count({ where }),
  ]);

  const query = Object.fromEntries(Object.entries({ status, user, service, search, start_date: getStr(searchParams, 'start_date'), end_date: getStr(searchParams, 'end_date') }).filter(([, v]) => v));
  return <RefillListClient refills={refills} total={total} page={page} query={query} />;
}
