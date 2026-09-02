import { prisma } from './prisma';

// Reseller API key auth: `X-API-Key` header, `api_key` header, `Authorization: Bearer ` or `?api_key=` query param.
export async function getApiUser(req: Request) {
  const url = new URL(req.url);
  let key = url.searchParams.get('api_key') || '';
  if (!key) key = req.headers.get('api_key') || req.headers.get('x-api-key') || '';
  if (!key) {
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) key = auth.slice(7);
  }
  if (!key) return null;

  const user = await prisma.user.findFirst({ where: { api_key: key } });
  if (!user || user.status === 'BANNED') return null;

  // IP whitelist: if set, require client IP to be in comma-separated list.
  if (user.api_whitelist_ips) {
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const allowed = user.api_whitelist_ips.split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(clientIp)) return null;
  }

  return user;
}
