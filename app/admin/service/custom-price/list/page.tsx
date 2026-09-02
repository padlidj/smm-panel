import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { CustomPriceListClient } from './client';

export const dynamic = 'force-dynamic';

export default async function CustomPriceListPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  await requireAdmin();
  const search = searchParams.search || '';
  const page = Math.max(1, Number(searchParams.page || 1));
  const take = 10;

  const where: any = search
    ? { user: { username: { contains: search, mode: 'insensitive' as const } } }
    : {};

  const [total, items, users, services] = await Promise.all([
    prisma.customPrice.count({ where }),
    prisma.customPrice.findMany({
      where,
      include: {
        user: { select: { username: true } },
        service: { select: { name: true, category: { select: { name: true } } } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.user.findMany({ orderBy: { username: 'asc' }, select: { id: true, username: true } }),
    prisma.service.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <CustomPriceListClient
      items={items}
      total={total}
      page={page}
      totalPages={Math.ceil(total / take)}
      search={search}
      users={users}
      services={services}
    />
  );
}