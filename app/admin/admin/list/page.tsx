import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { AdminListClient } from './client';

export default async function AdminListPage() {
  await requireAdmin();
  const admins = await prisma.admin.findMany({ orderBy: { id: 'asc' } });
  return <AdminListClient admins={admins} />;
}