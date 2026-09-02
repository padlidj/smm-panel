import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { UserListClient } from './client';

export default async function UserListPage({ searchParams }: { searchParams: { page?: string; search?: string; status?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const search = getStr(searchParams, 'search');
  const status = getStr(searchParams, 'status');

  const where: any = {};
  if (search) where.OR = [{ username: { contains: search } }, { email: { contains: search } }];
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.user.count({ where }),
  ]);

  return <UserListClient users={users} total={total} page={page} search={search} status={status} />;
}