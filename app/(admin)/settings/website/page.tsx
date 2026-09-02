import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { SettingsClient } from './client';

export default async function WebsiteSettingsPage() {
  await requireAdmin();
  const config = await prisma.websiteConfig.findUnique({ where: { key: 'main' } });
  const value = (config?.value as any) || {};
  return <SettingsClient value={value} />;
}