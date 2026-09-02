import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderNewClient } from './client';

export const dynamic = 'force-dynamic';

export default async function OrderNewPage() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });

  const categories = await prisma.serviceCategory.findMany({ where: { status: true }, orderBy: { name: 'asc' } });
  const services = await prisma.service.findMany({ where: { status: true }, include: { category: { select: { name: true } } }, orderBy: { name: 'asc' } });

  return <OrderNewClient categories={categories} services={services} balance={Number(user?.balance || 0)} />;
}