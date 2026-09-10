import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { BulkClient } from './client';

export default async function BulkPage() {
  await requireAdmin();
  const providers = await prisma.serviceProvider.findMany({ where: { status: true }, orderBy: { id: 'desc' }, select: { id: true, name: true } });
  return <BulkClient providers={providers} />;
}
