import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { CategoryFormClient } from './client';

export default async function CategoryFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const category = await prisma.serviceCategory.findUnique({ where: { id: parseInt(params.id) } });
  if (!category) return <CategoryFormClient category={null} />;
  return <CategoryFormClient category={category} />;
}