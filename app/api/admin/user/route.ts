import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, username, email, balance, status, role } = await req.json();
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { username, email, balance: parseInt(balance), status, role },
    });
    return NextResponse.json({ message: 'User updated', user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}