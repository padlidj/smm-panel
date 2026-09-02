import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { NotificationClient } from './client';

export default async function NotificationPage() {
  await requireAdmin();
  const [notifications, pages] = await Promise.all([
    prisma.websiteInformation.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.websitePage.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ]);
  return <NotificationClient notifications={notifications} pages={pages} />;
}