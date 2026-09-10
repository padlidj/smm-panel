import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { OrderListClient } from './client';

// Laravel OrderDataTable::filter parity: search, filter_status, filter_user, filter_service,
// filter_service_provider, filter_is_api, filter_start_date + filter_end_date.
// Old aliases status/username/from/to stay accepted (existing drill-down links).
export default async function OrderListPage({ searchParams }: { searchParams: any }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const sp = searchParams;
  const filter_status = getStr(sp, 'filter_status') || getStr(sp, 'status');
  const filter_user = getStr(sp, 'filter_user') || getStr(sp, 'username');
  const filter_service = getStr(sp, 'filter_service');
  const filter_service_provider = getStr(sp, 'filter_service_provider');
  const filter_is_api = getStr(sp, 'filter_is_api');
  const filter_start_date = getStr(sp, 'filter_start_date') || getStr(sp, 'from');
  const filter_end_date = getStr(sp, 'filter_end_date') || getStr(sp, 'to');
  const search = getStr(sp, 'search');
  const serviceId = parseInt(getStr(sp, 'service_id') || '0') || 0;

  const where: any = {};
  if (filter_status) where.status = filter_status;
  if (serviceId) where.service_id = serviceId;
  if (filter_user) where.user = { username: { contains: filter_user } };
  if (filter_service) where.OR = [{ service: { name: { contains: filter_service } } }, { service_name: { contains: filter_service } }];
  if (filter_service_provider) where.service_provider = { name: { contains: filter_service_provider } };
  if (filter_is_api === '1' || filter_is_api === '0') where.is_api = filter_is_api === '1';
  if (filter_start_date || filter_end_date) {
    where.created_at = {};
    if (filter_start_date) where.created_at.gte = new Date(`${filter_start_date}T00:00:00`);
    if (filter_end_date) where.created_at.lte = new Date(`${filter_end_date}T23:59:59`);
  }
  if (search) {
    const s: any[] = [
      { service_name: { contains: search } },
      { target: { contains: search } },
      { provider_order_id: { contains: search } },
      { service: { name: { contains: search } } },
      { user: { username: { contains: search } } },
      { service_provider: { name: { contains: search } } },
    ];
    // Laravel id/quantity/price LIKE numeric -> Prisma exact match only when fully numeric
    if (/^\d+$/.test(search)) s.push({ id: Number(search) }, { quantity: Number(search) });
    if (where.OR) where.AND = [{ OR: where.OR }, { OR: s }]; else where.OR = s;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } }, service: { select: { name: true } }, service_provider: { select: { name: true } } } }),
    prisma.order.count({ where }),
  ]);
  return <OrderListClient orders={orders} total={total} page={page} filters={sp} service_id={serviceId || undefined} />;
}
