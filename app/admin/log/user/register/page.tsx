import { prisma } from '@/lib/prisma';
import { requireAdmin, PER_PAGE, getPage, getStr } from '@/lib/admin';
import { RegisterLogTable } from './table';

export default async function UserRegisterLogsPage({ searchParams }: { searchParams: { page?: string; username?: string } }) {
  await requireAdmin();
  const page = getPage(searchParams);
  const username = getStr(searchParams, 'username');

  const where: any = {};
  if (username) where.OR = [{ username: { contains: username } }, { email: { contains: username } }];

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.user.count({ where }),
  ]);
  return <RegisterLogTable users={users} total={total} page={page} filters={{ username }} />;
}