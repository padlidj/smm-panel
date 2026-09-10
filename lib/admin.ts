import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') redirect('/auth/login');
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if ((session.user as any)?.level !== 'SUPERADMIN') redirect('/admin');
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

// Laravel DataTables: filter_start_date + filter_end_date set together -> DATE(created_at) BETWEEN both
export function dateRange(from?: string, to?: string): { gte: Date; lte: Date } | undefined {
  if (!from || !to) return undefined;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T23:59:59');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return undefined;
  return { gte: a, lte: b };
}

// Laravel search uses LIKE %s% on the id column; Postgres Int has no LIKE -> exact match for numerics, contains for strings
export function searchOr(search: string, intField: string, fields: string[]) {
  const n = parseInt(search, 10);
  return [
    ...(String(n) === search.trim() ? [{ [intField]: n }] : []),
    ...fields.map(f => ({ [f]: { contains: search, mode: 'insensitive' as const } })),
  ];
}
