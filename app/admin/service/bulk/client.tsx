'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

// Laravel BulkController parity: comma-separated provider service IDs -> mass import, max 200.
// Manual providers rejected client-side (Laravel: "Gagal (Provider Manual)").
export function BulkClient({ providers }: { providers: any[] }) {
  const [providerId, setProviderId] = useState('');
  const [ids, setIds] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState('');

  const submit = async () => {
    setError(''); setReport('');
    const provider = providers.find(p => String(p.id) === providerId);
    if (!provider) return setError('Pilih provider');
    if (provider.name.toUpperCase() === 'MANUAL') return setError('Provider Manual tidak bisa di-bulk import.');
    const list = ids.split(/[\s,]+/).filter(Boolean);
    if (!list.length) return setError('Isi minimal 1 ID layanan provider');
    if (list.length > 200) return setError('Maksimal 200 ID Layanan Penyedia.');
    setBusy(true);
    try {
      const r: any = await postForm('/api/admin/service/import', { provider_id: provider.id, action: 'commit', ids: list });
      setReport(`Ditambahkan: ${r.report.added} • Diperbarui: ${r.report.updated}\n${r.report.details.join('\n')}`);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Bulk Import Layanan</h1>
      <Card>
        <CardHeader><CardTitle>Import by ID</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={providerId} onChange={e => setProviderId(e.target.value)}>
            <option value="">— Pilih Provider —</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea className="flex w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="Pisahkan dengan koma/spasi. Contoh: 101,102,105" value={ids} onChange={e => setIds(e.target.value)} />
          {error && <Toast type="error" message={error} />}
          {report && <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs max-h-80 overflow-auto">{report}</pre>}
          <Button onClick={submit} disabled={busy}>{busy ? 'Memproses...' : 'Bulk Import'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
