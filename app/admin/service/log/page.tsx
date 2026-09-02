import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { ServiceLogClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ServiceLogPage({
  searchParams,
}: {
  searchParams: { provider_id?: string; page?: string };
}) {
  await requireAdmin();
  const filterProvider = searchParams.provider_id ? Number(searchParams.provider_id) : undefined;
  const page = Math.max(1, Number(searchParams.page || 1));
  const take = 20;

  const where: any = filterProvider ? { provider_id: filterProvider } : {};

  const [total, logs, providers] = await Promise.all([
    prisma.serviceLog.count({ where }),
    prisma.serviceLog.findMany({
      where,
      include: { service: { select: { name: true } }, provider: { select: { name: true } }, user: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.serviceProvider.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <ServiceLogClient
      logs={logs}
      total={total}
      page={page}
      totalPages={Math.ceil(total / take)}
      filterProvider={filterProvider}
      providers={providers}
    />
  );
}