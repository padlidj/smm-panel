import { NotificationClient } from '../notification/client';

export default async function HofPage() {
  const { prisma } = await import('@/lib/prisma');
  const { requireAdmin } = await import('@/lib/admin');
  await requireAdmin();
  const [notifications, pages] = await Promise.all([
    prisma.websiteInformation.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.websitePage.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ]);
  return <NotificationClient notifications={notifications} pages={pages} />;
}