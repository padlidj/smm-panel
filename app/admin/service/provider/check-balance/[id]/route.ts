import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { id: parseInt(params.id) } });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    // ponytail: no live provider API yet — returns profile from stored config
    const profile = (provider.profile_config as any) || {};
    return NextResponse.json({ balance: profile.balance ?? profile.balance_amount ?? 'n/a (config only)' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}