import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') redirect('/auth/login');
  return session;
}

export const PER_PAGE = 20;

export function getPage(searchParams: { page?: string | string[] }) {
  const p = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const page = parseInt(p || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getStr(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const v = searchParams[key];
  return typeof v === 'string' ? v : '';
}
