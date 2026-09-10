import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage } from '@/lib/admin';
import { ServiceListClient } from './client';

export default async function ServiceListPage({ searchParams }: { searchParams: any }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const { search, filter_category, filter_provider, filter_status, filter_type, refill_support, filter_row } = searchParams;
  const per = [10, 30, 50, 100].includes(parseInt(filter_row)) ? parseInt(filter_row) : PER_PAGE;

  // Laravel parity: search = name/id contains; filters = category, provider, status, type, refill_support
  const where: any = {};
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    Number(search) ? { id: Number(search) } : undefined,
  ].filter(Boolean);
  if (filter_category) where.category_id = parseInt(filter_category);
  if (filter_provider) where.provider_id = parseInt(filter_provider);
  if (filter_status === '1' || filter_status === '0') where.status = filter_status === '1';
  if (filter_type) where.type = filter_type;
  if (refill_support === '1' || refill_support === '0') where.is_refill_support = refill_support === '1';

  const [services, total, categories, providers] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * per,
      take: per,
      include: { category: { select: { name: true } }, provider: { select: { name: true } } },
    }),
    prisma.service.count({ where }),
    prisma.serviceCategory.findMany({ where: { status: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.serviceProvider.findMany({ where: { status: true }, orderBy: { id: 'desc' }, select: { id: true, name: true } }),
  ]);
  return <ServiceListClient services={services} total={total} page={page} per={per} filters={searchParams} categories={categories} providers={providers} />;
}
