import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccountSettingsClient } from './client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: Number((session?.user as any)?.id) },
    select: { id: true, api_key: true, api_whitelist_ips: true, notification: true },
  });
  if (!user) redirect('/auth/login');

  return <AccountSettingsClient user={user} />;
}