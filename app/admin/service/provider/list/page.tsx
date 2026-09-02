import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { ProviderListClient } from './client';

export default async function ProviderListPage() {
  await requireAdmin();
  const providers = await prisma.serviceProvider.findMany({ orderBy: { id: 'desc' }, include: { _count: { select: { services: true } } } });
  return <ProviderListClient providers={providers} />;
}