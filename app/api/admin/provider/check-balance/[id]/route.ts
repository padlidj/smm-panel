import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import get from 'lodash.get';

// POST /api/admin/provider/check-balance/:id — hit provider balance/profile endpoint
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { id: Number(params.id) } });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const config = (provider.profile_config as any) || {};
    const endpoint = config.endpoint;
    if (!endpoint) return NextResponse.json({ error: 'No profile endpoint configured' }, { status: 400 });

    const replace = (v: any): any => {
      if (typeof v === 'string') {
        return v
          .replace(/{api_key}/g, provider.provider_key || '')
          .replace(/{api_secret}/g, provider.provider_secret || '')
          .replace(/{key}/g, provider.provider_key || '')
          .replace(/{provider_id}/g, provider.provider_id || '');
      }
      if (Array.isArray(v)) return v.map(replace);
      if (v && typeof v === 'object') {
        const o: any = {};
        for (const [k, val] of Object.entries(v)) o[k] = replace(val);
        return o;
      }
      return v;
    };

    const body = replace(config.body || config.request || {});
    const isFormData = config.content_type === 'application/x-www-form-urlencoded' || !config.content_type;
    const headers: Record<string, string> = {
      'Content-Type': isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
      ...(config.headers || {}),
    };
    for (const [k, v] of Object.entries(headers)) {
      headers[k] = String(v).replace(/{api_key}/g, provider.provider_key || '').replace(/{api_secret}/g, provider.provider_secret || '');
    }

    const reqBody = isFormData
      ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString()
      : JSON.stringify(body);

    const res = await fetch(endpoint, { method: config.method || 'POST', headers, body: reqBody });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: `Provider returned ${res.status}` }, { status: 502 });

    const resp = config.response || {};
    const balance = get(data, resp.balance || 'balance', null);
    const currency = get(data, resp.currency || 'currency', provider.currency);
    return NextResponse.json({
      balance: balance !== null ? Number(balance) : null,
      currency,
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}