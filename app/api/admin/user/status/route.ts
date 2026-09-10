import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Laravel UserController::status + ::verified parity (single endpoint, enum-checked).
const STATUSES = ['ACTIVE', 'BANNED', 'UNVERIFIED'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, status } = await req.json();
    const userId = Number(id);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !STATUSES.includes(status))
      return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
    const me = (session.user as any).id;
    if (Number(me) === userId) return NextResponse.json({ error: 'Cannot change own status' }, { status: 400 });
    const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    return NextResponse.json({ ok: true, status: user.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
