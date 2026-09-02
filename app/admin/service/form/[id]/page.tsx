import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { ServiceFormClient } from './client';

export default async function ServiceFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const id = parseInt(params.id);
  const [service, categories, providers] = await Promise.all([
    id ? prisma.service.findUnique({ where: { id } }) : null,
    prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.serviceProvider.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return <ServiceFormClient service={service} categories={categories} providers={providers} />;
}