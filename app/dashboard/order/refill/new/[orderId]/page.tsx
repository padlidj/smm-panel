import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RefillNewClient } from './client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RefillNewPage({ params }: { params: { orderId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const order = await prisma.order.findUnique({ where: { id: parseInt(params.orderId) } });
  if (!order || order.user_id !== userId) redirect('/dashboard/order/history');
  if (order.status !== 'SUCCESS') redirect('/dashboard/order/history');

  return <RefillNewClient order={order} />;
}