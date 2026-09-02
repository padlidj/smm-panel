import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncProviderServices } from '@/lib/provider';

// POST /api/admin/provider/sync/:id — pull services from provider
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { id: Number(params.id) } });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const result = await syncProviderServices(provider);
    if (!result) return NextResponse.json({ error: 'Sync failed — check service_config' }, { status: 502 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}