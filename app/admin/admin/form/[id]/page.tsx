import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { AdminFormClient } from './client';

export default async function AdminFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const id = parseInt(params.id);
  const admin = id ? await prisma.admin.findUnique({ where: { id } }) : null;
  return <AdminFormClient admin={admin} />;
}