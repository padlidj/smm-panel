import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { MethodListClient } from './client';

export default async function MethodListPage() {
  await requireAdmin();
  const methods = await prisma.depositMethod.findMany({ orderBy: { id: 'asc' } });
  return <MethodListClient methods={methods} />;
}