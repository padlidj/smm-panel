import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { ProviderFormClient } from './client';

export default async function ProviderFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const id = parseInt(params.id);
  const provider = id ? await prisma.serviceProvider.findUnique({ where: { id } }) : null;
  return <ProviderFormClient provider={provider} />;
}