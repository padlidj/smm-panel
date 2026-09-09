import { prisma } from './prisma';

// Reseller API key auth: `X-API-Key` header, `api_key` header, `Authorization: Bearer *** or `?api_key=` query param.
// body: parsed form/JSON params (standard SMM clients post api_key in the body)
export async function getApiUser(req: Request, body?: Record<string, any>) {
  const url = new URL(req.url);
  let key = url.searchParams.get('api_key') || '';
  if (!key && body?.api_key) key = String(body.api_key);
  if (!key) key = req.headers.get('api_key') || req.headers.get('x-api-key') || '';
  if (!key) {
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) key = auth.slice(7);
  }
  if (!key) return null;

  const user = await prisma.user.findFirst({ where: { api_key: key } });
  if (!user || user.status !== 'ACTIVE') return null;

  // IP whitelist: if set, require client IP to be in comma-separated list.
  // x-real-ip is set clean by nginx; x-forwarded-for is append-only and spoofable by the client.
  if (user.api_whitelist_ips) {
    const clientIp = (req.headers.get('x-real-ip') || '').trim() || 'unknown';
    const allowed = user.api_whitelist_ips.split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(clientIp)) return null;
  }

  return user;
}

// Accept both JSON and form-urlencoded bodies (standard SMM API clients post forms)
export async function getApiParams(req: Request): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return req.json().catch(() => ({}));
  try {
    const form = await req.formData();
    const out: Record<string, any> = {};
    for (const [k, v] of form.entries()) out[k] = v;
    if (Object.keys(out).length) return out;
  } catch { /* not a form */ }
  const url = new URL(req.url);
  const out: Record<string, any> = {};
  for (const [k, v] of url.searchParams) out[k] = v;
  return out;
}
