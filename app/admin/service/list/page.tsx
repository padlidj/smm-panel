import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage } from '@/lib/admin';
import { ServiceListClient } from './client';

export default async function ServiceListPage({ searchParams }: { searchParams: { page?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const [services, total] = await Promise.all([
    prisma.service.findMany({
      orderBy: { id: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: { select: { name: true } }, provider: { select: { name: true } } },
    }),
    prisma.service.count(),
  ]);
  return <ServiceListClient services={services} total={total} page={page} />;
}