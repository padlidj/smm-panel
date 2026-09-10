import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { ServiceLogClient } from './client';

export const dynamic = 'force-dynamic';

// Laravel LogDataTable filter parity: search, filter_user, filter_service, filter_provider, date range
export default async function ServiceLogPage({ searchParams }: { searchParams: any }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page || 1));
  const take = 20;
  const where: any = {};

  if (searchParams.provider_id) where.provider_id = Number(searchParams.provider_id);
  if (searchParams.filter_user) where.user = { username: { contains: searchParams.filter_user } };
  if (searchParams.filter_service) where.service = { name: { contains: searchParams.filter_service } };
  if (searchParams.filter_provider) where.provider = { name: { contains: searchParams.filter_provider } };
  if (searchParams.filter_start_date || searchParams.filter_end_date) {
    where.created_at = {};
    if (searchParams.filter_start_date) where.created_at.gte = new Date(`${searchParams.filter_start_date}T00:00:00`);
    if (searchParams.filter_end_date) where.created_at.lte = new Date(`${searchParams.filter_end_date}T23:59:59`);
  }
  if (searchParams.search) {
    const s = searchParams.search;
    where.OR = [
      { logs: { contains: s } },
      { service: { name: { contains: s } } },
      { user: { username: { contains: s } } },
      { provider: { name: { contains: s } } },
    ];
    if (/^\d+$/.test(s)) where.OR.push({ id: Number(s) });
  }

  const [total, logs] = await Promise.all([
    prisma.serviceLog.count({ where }),
    prisma.serviceLog.findMany({
      where,
      include: { service: { select: { name: true } }, provider: { select: { name: true } }, user: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  return (
    <ServiceLogClient
      logs={logs}
      total={total}
      page={page}
      totalPages={Math.ceil(total / take)}
      filters={searchParams}
    />
  );
}
