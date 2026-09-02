import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/reseller';

export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ status: false, message: 'Invalid API key' });

  return NextResponse.json({
    status: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      balance: Number(user.balance),
      status: user.status,
      created_at: user.created_at,
    },
  });
}