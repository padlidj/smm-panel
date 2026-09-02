import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DepositNewClient } from './client';

export const dynamic = 'force-dynamic';

export default async function DepositNewPage() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true } });
  const methods = await prisma.depositMethod.findMany({ where: { status: true }, orderBy: { payment: 'asc' } });

  return <DepositNewClient methods={methods} user={user} />;
}