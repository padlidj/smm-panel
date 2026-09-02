import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject) return NextResponse.json({ error: 'to and subject required' }, { status: 400 });

    await sendEmail(to, subject, body || `<p>Test email from SMM Panel</p>`);
    return NextResponse.json({ message: 'Email sent' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}