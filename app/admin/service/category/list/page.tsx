import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { CategoryListClient } from './client';

export default async function CategoryListPage() {
  await requireAdmin();
  const categories = await prisma.serviceCategory.findMany({ orderBy: { id: 'asc' } });
  return <CategoryListClient categories={categories} />;
}