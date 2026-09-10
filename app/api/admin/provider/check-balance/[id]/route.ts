import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkBalance } from '@/lib/provider';

// POST /api/admin/provider/check-balance/:id — hit provider balance/profile endpoint
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = await prisma.serviceProvider.findUnique({ where: { id: Number(params.id) } });
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  if (!(provider.profile_config as any)?.endpoint)
    return NextResponse.json({ error: 'No profile endpoint configured' }, { status: 400 });

  const result = await checkBalance(provider);
  if (!result) return NextResponse.json({ error: 'Provider request failed' }, { status: 502 });
  return NextResponse.json(result);
}
