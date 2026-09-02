import { prisma } from './prisma';

// Reseller API key auth: `api_key` header, `Authorization: Bearer <key>`, or `?api_key=` query param.
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
  return user;
}

// ponytail: IP whitelist (api_whitelist_ips) not enforced. Add when API abuse appears.
