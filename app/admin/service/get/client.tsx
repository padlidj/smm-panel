'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/toast';

type Row = { provider_service_id: string; name: string; category_name: string; price: number; profit: number; min: number; max: number; type: string; existing?: boolean };

// Import services: pick provider -> preview computed rows (price after markup) -> commit selected.
export function GetServiceClient({ providers }: any) {
  const [providerId, setProviderId] = useState<string>(providers[0] ? String(providers[0].id) : '');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const call = async (action: 'preview' | 'commit', ids?: string[]) => {
    setLoading(true); setError(''); setReport(null);
    try {
      const res = await fetch('/api/admin/service/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, action, ...(ids ? { ids } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal');
      return json;
    } catch (e: any) { setError(e.message); return null; } finally { setLoading(false); }
  };

  const preview = async () => {
    const json = await call('preview');
    if (!json) return;
    setRows(json.rows); setTotal(json.total);
    const fresh = json.rows.filter((r: Row) => !r.existing).map((r: Row) => r.provider_service_id);
    setSelected(new Set(fresh)); setChecked(new Set(fresh));
  };

  const commit = async () => {
    const ids = [...selected];
    const json = await call('commit', ids.length ? ids : undefined);
    if (!json) return;
    setReport(json.report); setRows(null);
  };

  const toggle = (id: string) => {
    setChecked((c) => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const rp = (n: number) => `Rp ${Number(n).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Import Service dari Provider</h1>
      <Card>
        <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={providerId} onChange={e => setProviderId(e.target.value)}>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p._count.services} layanan)</option>)}
            </select>
            <Button onClick={preview} disabled={!providerId || loading}>{loading ? 'Memuat...' : 'Tarik & Preview'}</Button>
          </div>
          {error && <Toast type="error" message={error} />}
          {report && (
            <Toast type="success" message={`+${report.added} baru, ~${report.updated} update, -${report.disabled} hilang dinonaktifkan`} />
          )}
          {rows && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{total} layanan dari provider, {selected.size} dipilih (yang baru sudah tercentang).</div>
              <div className="max-h-[28rem] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted"><tr>
                    <th className="p-2"></th><th className="p-2 text-left">ID</th><th className="p-2 text-left">Nama</th>
                    <th className="p-2 text-left">Kategori</th><th className="p-2 text-right">Harga</th><th className="p-2 text-right">Profit</th>
                    <th className="p-2 text-right">Min/Max</th><th className="p-2 text-left">Tipe</th><th className="p-2"></th>
                  </tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.provider_service_id} className="border-t">
                        <td className="p-2"><input type="checkbox" checked={checked.has(r.provider_service_id)} onChange={() => toggle(r.provider_service_id)} disabled={r.existing} /></td>
                        <td className="p-2 font-mono">{r.provider_service_id}</td>
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.category_name}</td>
                        <td className="p-2 text-right">{rp(r.price)}</td>
                        <td className="p-2 text-right">{rp(r.profit)}</td>
                        <td className="p-2 text-right">{r.min}/{r.max}</td>
                        <td className="p-2">{r.type}</td>
                        <td className="p-2">{r.existing ? <Badge variant="secondary">ada</Badge> : <Badge variant="success">baru</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={commit} disabled={loading || selected.size === 0}>Import {selected.size} layanan</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
