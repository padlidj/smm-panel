import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { DepositListClient } from './client';

export default async function DepositListPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const status = getStr(searchParams, 'status');

  const where: any = {};
  if (status) where.status = status;

  const [deposits, total] = await Promise.all([
    prisma.deposit.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { username: true } } } }),
    prisma.deposit.count({ where }),
  ]);
  return <DepositListClient deposits={deposits} total={total} page={page} status={status} />;
}