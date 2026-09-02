import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { OrderListClient } from './client';

export default async function OrderListPage({ searchParams }: { searchParams: { page?: string; status?: string; username?: string; from?: string; to?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');
  const username = getStr(searchParams, 'username');
  const from = getStr(searchParams, 'from');
  const to = getStr(searchParams, 'to');

  const where: any = {};
  if (status) where.status = status;
  if (username) where.user = { username: { contains: username } };
  if (from || to) where.created_at = {};
  if (from) where.created_at.gte = new Date(from);
  if (to) where.created_at.lte = new Date(`${to}T23:59:59`);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } } } }),
    prisma.order.count({ where }),
  ]);
  return <OrderListClient orders={orders} total={total} page={page} status={status} username={username} from={from} to={to} />;
}