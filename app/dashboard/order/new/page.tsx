import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OrderNewClient } from './client';

export const dynamic = 'force-dynamic';

export default async function OrderNewPage() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user) redirect('/auth/login');

  const [categories, services, customPrices] = await Promise.all([
    prisma.serviceCategory.findMany({ where: { status: true }, orderBy: { name: 'asc' } }),
    prisma.service.findMany({ where: { status: true }, include: { category: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    prisma.customPrice.findMany({ where: { user_id: userId }, select: { service_id: true, price: true } }),
  ]);

  const cpMap: Record<number, any> = {};
  for (const c of customPrices) cpMap[c.service_id] = c;

  return <OrderNewClient categories={categories} services={services} customPrices={cpMap} balance={Number(user?.balance || 0)} />;
}