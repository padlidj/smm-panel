import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GetServiceClient } from './client';

export const dynamic = 'force-dynamic';

export default async function GetServicePage() {
  await requireAdmin();
  const providers = await prisma.serviceProvider.findMany({
    where: { status: true },
    select: { id: true, name: true, _count: { select: { services: true } } },
    orderBy: { name: 'asc' },
  });
  return <GetServiceClient providers={providers} />;
}