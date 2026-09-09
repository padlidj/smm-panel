import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { AdminFormClient } from './client';

export default async function AdminFormPage({ params }: { params: { id: string } }) {
  await requireSuperAdmin();
  const id = parseInt(params.id);
  const admin = id ? await prisma.admin.findUnique({ where: { id } }) : null;
  return <AdminFormClient admin={admin} />;
}