import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { AdminListClient } from './client';

export default async function AdminListPage() {
  await requireSuperAdmin();
  const admins = await prisma.admin.findMany({ orderBy: { id: 'asc' } });
  return <AdminListClient admins={admins} />;
}