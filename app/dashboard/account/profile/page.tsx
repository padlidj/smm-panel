import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccountProfileClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: Number((session?.user as any)?.id) },
    select: { id: true, username: true, email: true, full_name: true, api_key: true, created_at: true },
  });
  if (!user) redirect('/auth/login');

  return <AccountProfileClient user={user} />;
}