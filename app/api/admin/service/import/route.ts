import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeServiceRows, fetchProviderServices, syncServiceRows } from '@/lib/provider';

async function admin(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') return null;
  return session;
}

// POST /api/admin/service/import { provider_id, action: 'preview'|'commit' }
export async function POST(req: Request) {
  if (!await admin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { provider_id, action, ids } = await req.json();
    const id = Number(provider_id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 });
    const provider = await prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const data = await fetchProviderServices(provider);
    if (!data) return NextResponse.json({ error: 'Gagal menarik layanan dari provider — cek service_config' }, { status: 502 });
    const rows = await computeServiceRows(provider, data);
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Tidak ada layanan tersedia.' }, { status: 502 });

    // selective import: ids[] limits which provider service ids to commit (max 200, Laravel parity)
    let selected = rows;
    if (Array.isArray(ids) && ids.length) {
      if (ids.length > 200) return NextResponse.json({ error: 'Maksimal 200 ID Layanan Penyedia.' }, { status: 400 });
      const wanted = new Set(ids.map(String));
      selected = rows.filter((r) => wanted.has(r.provider_service_id));
    }
    if (action === 'commit') {
      const report = await syncServiceRows(provider, selected, { disableMissing: !(Array.isArray(ids) && ids.length) });
      return NextResponse.json({ report, total: selected.length });
    }
    // preview: final computed rows, existing flag
    const existingIds = new Set((await prisma.service.findMany({
      where: { provider_id: id, provider_service_id: { in: rows.map((r) => r.provider_service_id) } },
      select: { provider_service_id: true },
    })).map((s) => String(s.provider_service_id)));
    return NextResponse.json({ total: rows.length, rows: rows.map((r) => ({ ...r, existing: existingIds.has(r.provider_service_id) })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
