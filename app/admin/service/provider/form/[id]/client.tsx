'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

// One tab per operation (Laravel provider form parity: Utama/Profil/Pesanan/Status/Layanan/Refill/Status Refill).
// Request rows: panel field -> provider param name ('' = unused, '-' = send as-is, 'action' value = literal).
const OPS: { key: string; label: string; req: [string, string][]; resp: [string, string][]; sv?: string[]; extra?: 'service' }[] = [
  { key: 'profile_config', label: 'Profil', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia']], resp: [['balance', 'Saldo Tersisa'], ['currency', 'Mata Uang']] },
  { key: 'order_config', label: 'Pesanan', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia'], ['service', 'ID Layanan'], ['target', 'Target'], ['quantity', 'Jumlah'], ['answer_number', 'Nomor Jawaban Poll'], ['username', 'Username Komentar'], ['custom_comments', 'Custom Comments']], resp: [['order_id', 'ID Pesanan']] },
  { key: 'status_config', label: 'Status Pesanan', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia'], ['order_id', 'ID Pesanan']], resp: [['status', 'Status'], ['start_count', 'Jumlah Awal'], ['remains', 'Jumlah Sisa']], sv: ['pending', 'processing', 'success', 'error', 'partial'] },
  { key: 'service_config', label: 'Layanan', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia']], resp: [['looping', 'Looping'], ['id', 'ID Layanan'], ['name', 'Nama'], ['description', 'Deskripsi'], ['category', 'Kategori'], ['price', 'Harga'], ['min', 'Minimal'], ['max', 'Maksimal'], ['type', 'Tipe'], ['refill', 'Refill']], extra: 'service' },
  { key: 'refill_config', label: 'Refill Pesanan', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia'], ['order_id', 'ID Pesanan']], resp: [['refill_id', 'ID Refill']] },
  { key: 'refill_status_config', label: 'Status Refill', req: [['action', 'Aksi'], ['provider_id', 'ID'], ['provider_key', 'Kunci'], ['provider_secret', 'Rahasia'], ['refill_id', 'ID Refill']], resp: [['status', 'Status']], sv: ['pending', 'processing', 'success', 'error'] },
];

// Presets 1:1 dari JS blade Laravel (is_default_settings = SMM Luar, is_indo_settings = SMM Indo).
// Response path gaya kurung siku ['x'] — engine normalisasi via toPath.
type Cfg = Record<string, any>;
const V2: Cfg = {
  profile_config: { endpoint: '', request: { action: 'balance', provider_id: '-', provider_key: 'key', provider_secret: '' }, response: { balance: "['balance']" } },
  order_config: { endpoint: '', request: { action: 'add', provider_id: '-', provider_key: 'key', provider_secret: '', service: 'service', target: 'link', quantity: 'quantity', custom_comments: 'comments' }, response: { order_id: "['order']" } },
  status_config: { endpoint: '', request: { action: 'status', provider_id: '-', provider_key: 'key', provider_secret: '', order_id: 'order' }, response: { status: "['status']", start_count: "['start_count']", remains: "['remains']" }, status_value: { pending: 'Pending', processing: 'Processing', success: 'Completed', error: 'Canceled', partial: 'Cancelled' } },
  service_config: { endpoint: '', request: { action: 'services', provider_id: '-', provider_key: 'key', provider_secret: '' }, response: { looping: "['data']", id: "['service']", name: "['name']", category: "['category']", price: "['rate']", min: "['min']", max: "['max']", type: "['type']", refill: "['refill']" }, other_value: { custom_comments: 'comments', comment_likes: 'link', is_refill_support: 'true' }, currency: 'IDR', price_setting: { operator: '*', value: '1' }, profit_setting: { operator: '*', value: '1' } },
  refill_config: { endpoint: '', request: { action: 'refill', provider_id: '-', provider_key: 'key', provider_secret: '', order_id: 'order' }, response: { refill_id: "['refill']" } },
  refill_status_config: { endpoint: '', request: { action: 'refill_status', provider_id: '-', provider_key: 'key', provider_secret: '', refill_id: 'refill_id' }, response: { status: "['status']" }, status_value: { pending: 'Pending', processing: 'Processing', success: 'Completed', error: 'Error' } },
};
const INDO: Cfg = {
  profile_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '' }, response: { balance: "['data']['balance']" } },
  order_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '', service: 'service', target: 'target', quantity: 'quantity', custom_comments: 'custom_comments' }, response: { order_id: "['data']['id']" } },
  status_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '', order_id: 'id' }, response: { status: "['data']['status']", start_count: "['data']['start_count']", remains: "['data']['remains']" }, status_value: { pending: 'Pending', processing: 'Processing', success: 'Success', error: 'Error', partial: 'Partial' } },
  service_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '' }, response: { looping: "['data']", id: "['id']", name: "['name']", category: "['category']", price: "['price']", min: "['min']", max: "['max']", type: "['type']", refill: "['refill']" }, other_value: { custom_comments: 'custom_comments', comment_likes: 'custom_link', is_refill_support: 'true' }, currency: 'IDR', price_setting: { operator: '*', value: '1' }, profit_setting: { operator: '*', value: '1' } },
  refill_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '', order_id: 'id_order' }, response: { refill_id: "['data']['id_refill']" } },
  refill_status_config: { endpoint: '', request: { action: '', provider_id: 'api_id', provider_key: 'api_key', provider_secret: '', refill_id: 'id_refill' }, response: { status: "['data']['status']" }, status_value: { pending: 'Pending', processing: 'Proses', success: 'Success', error: 'Gagal' } },
};

function blankCfg() { return OPS.reduce((a, o) => ({ ...a, [o.key]: { endpoint: '', request: {}, response: {}, status_value: {}, advanced: '', ...(o.extra === 'service' ? { other_value: {}, price_setting: {}, profit_setting: {}, currency: 'IDR' } : {}) } }), {} as any); }
function toForm(provider: any): Cfg {
  const out: Cfg = blankCfg();
  for (const op of OPS) {
    const saved = (provider?.[op.key] || {}) as any;
    const { endpoint = '', request = {}, response = {}, status_value = {}, looping, other_value, price_setting, profit_setting, currency, ...rest } = saved;
    out[op.key] = {
      endpoint: endpoint || provider?.endpoint?.[op.key.replace('_config', '')] || '',
      request,
      response: { ...response, ...(looping ? { looping } : {}) },
      status_value,
      ...(op.extra === 'service' ? { other_value: other_value || {}, price_setting: price_setting || {}, profit_setting: profit_setting || {}, currency: currency || 'IDR' } : {}),
      advanced: Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '',
    };
  }
  return out;
}

const selCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export function ProviderFormClient({ provider }: any) {
  const router = useRouter();
  const [tab, setTab] = useState(OPS[0].key);
  const [form, setForm] = useState<any>({
    id: provider?.id, name: provider?.name || '', provider_id: provider?.provider_id || '',
    provider_key: provider?.provider_key || '', provider_secret: provider?.provider_secret || '',
    status: provider?.status ?? true, is_refill_support: provider?.is_refill_support ?? false,
  });
  const [cfg, setCfg] = useState<any>(() => toForm(provider));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  // deep-copy only the active op's config; walk path INSIDE it (was walking the
  // whole cfg map -> `next.request` undefined -> TypeError crash on any keystroke)
  const setC = (op: string, path: string[], v: any) => setCfg((c: any) => {
    const clone = JSON.parse(JSON.stringify(c[op]));
    let n = clone; for (const p of path.slice(0, -1)) n = n[p] ??= {};
    n[path[path.length - 1]] = v;
    return { ...c, [op]: clone };
  });
  const applyPreset = (which: 'v2' | 'indo') => {
    const src = which === 'v2' ? V2 : INDO;
    if (!confirm(`Timpa semua tab mapping dengan preset ${which === 'v2' ? 'SMM Luar (v2)' : 'SMM Indo'}?`)) return;
    const base = blankCfg();
    for (const op of OPS) {
      const s = structuredClone(src[op.key]);
      base[op.key] = { ...base[op.key], endpoint: s.endpoint || '', request: s.request || {}, status_value: s.status_value || {},
        response: s.response || {}, advanced: '',
        ...(op.extra === 'service' ? { other_value: s.other_value || {}, price_setting: s.price_setting || {}, profit_setting: s.profit_setting || {}, currency: s.currency || 'IDR' } : {}) };
    }
    setCfg(base);
    setForm((f: any) => ({ ...f, currency: which === 'indo' ? 'IDR' : f.currency }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const payload: any = { ...form };
    for (const op of OPS) {
      const c = cfg[op.key];
      const { looping, ...respFields } = c.response;
      const out: any = { request: c.request, response: respFields, status_value: c.status_value };
      if (c.endpoint) out.endpoint = c.endpoint;
      if (looping) out.looping = looping;
      if (op.extra === 'service') {
        if (Object.keys(c.other_value || {}).length) out.other_value = c.other_value;
        if (c.price_setting?.operator) out.price_setting = c.price_setting;
        if (c.profit_setting?.operator) out.profit_setting = c.profit_setting;
      }
      const adv = c.advanced?.trim();
      if (adv) { try { Object.assign(out, JSON.parse(adv)); } catch { setError(`JSON lanjutan ${op.label} tidak valid`); return; } }
      payload[op.key] = JSON.stringify(out);
    }
    try {
      await postForm('/api/admin/provider', payload);
      setSuccess('Provider tersimpan');
      setTimeout(() => router.push('/admin/service/provider/list'), 800);
    } catch (err: any) { setError(err.message); }
  };

  const cur = OPS.find(o => o.key === tab)!;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{provider ? `Edit Provider: ${provider.name}` : 'Provider Baru'}</h1>
      <div className="flex gap-1 flex-wrap">
        {OPS.map(o => (
          <Button key={o.key} type="button" size="sm" variant={tab === o.key ? 'primary' : 'secondary'} onClick={() => setTab(o.key)}>{o.label}</Button>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === OPS[0].key && (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-sm font-medium">Nama *</label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
                <div className="space-y-1"><label className="text-sm font-medium">ID *</label><Input value={form.provider_id} onChange={e => set('provider_id', e.target.value)} required /></div>
                <div className="space-y-1"><label className="text-sm font-medium">Kunci</label><Input value={form.provider_key} onChange={e => set('provider_key', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-sm font-medium">Rahasia</label><Input value={form.provider_secret} onChange={e => set('provider_secret', e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">Mata Uang Harga</label><select className={selCls} value={form.currency || 'IDR'} onChange={e => set('currency', e.target.value)}><option>IDR</option><option>USD</option></select></div>
                <div className="space-y-1"><label className="text-sm font-medium">Status</label><select className={selCls} value={String(form.status)} onChange={e => set('status', e.target.value === 'true')}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_refill_support} onChange={e => set('is_refill_support', e.target.checked)} /> Refill Support</label>
              <div className="space-y-1">
                <label className="text-sm font-medium">2. Endpoint Profil <span className="text-xs text-muted-foreground font-normal">(URL cek saldo — untuk tombol Balance di list)</span></label>
                <Input value={cfg.profile_config.endpoint} onChange={e => setC('profile_config', ['endpoint'], e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('v2')}>Default Settings (SMM Luar)</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('indo')}>Default Settings (SMM Indo)</Button>
              </div>
            </>)}
            {tab !== OPS[0].key && (<>
              <div className="space-y-1">
                <label className="text-sm font-medium">1. Endpoint</label>
                <Input value={cfg[tab].endpoint} onChange={e => setC(tab, ['endpoint'], e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" />
              </div>
              <div>
                <h6 className="font-medium mb-2">2. Request <span className="text-xs text-muted-foreground font-normal">— nama kolom panel → nama parameter provider</span></h6>
                <div className="space-y-2">
                  {cur.req.map(([f, label]) => (
                    <div key={f} className="grid grid-cols-8 gap-2 items-center">
                      <Input className="col-span-5" value={cfg[tab].request[f] ?? ''} onChange={e => setC(tab, ['request', f], e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" />
                      <span className="col-span-3 text-sm text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h6 className="font-medium mb-2">3. Response <span className="text-xs text-muted-foreground font-normal">— path, gaya ['data']['x'] atau data.x</span></h6>
                <div className="space-y-2">
                  {cur.resp.map(([f, label]) => (
                    <div key={f} className="grid grid-cols-8 gap-2 items-center">
                      <Input className="col-span-5" value={cfg[tab].response[f] ?? ''} onChange={e => setC(tab, ['response', f], e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" />
                      <span className="col-span-3 text-sm text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {cur.sv && (
                <div>
                  <h6 className="font-medium mb-2">Status Value <span className="text-xs text-muted-foreground font-normal">— nilai mentah provider per status (pisahkan koma untuk banyak)</span></h6>
                  <div className="space-y-2">
                    {cur.sv.map(f => (
                      <div key={f} className="grid grid-cols-8 gap-2 items-center">
                        <Input className="col-span-5" value={typeof cfg[tab].status_value[f] === 'string' ? cfg[tab].status_value[f] : (cfg[tab].status_value[f] || []).join(', ')} onChange={e => setC(tab, ['status_value', f], e.target.value)} />
                        <span className="col-span-3 text-sm text-muted-foreground capitalize">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cur.extra === 'service' && (
                <>
                  <div>
                    <h6 className="font-medium mb-2">4. Other Value <span className="text-xs text-muted-foreground font-normal">— deteksi tipe layanan</span></h6>
                    {(['custom_comments', 'comment_likes', 'is_refill_support'] as const).map(f => (
                      <div key={f} className="grid grid-cols-8 gap-2 items-center mb-2">
                        <Input className="col-span-5" value={cfg[tab].other_value?.[f] ?? ''} onChange={e => setC(tab, ['other_value', f], e.target.value)} placeholder="Kosongkan jika tidak dibutuhkan" />
                        <span className="col-span-3 text-sm text-muted-foreground font-mono">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h6 className="font-medium mb-2">5. Price & Profit Setting</h6>
                    {(['price_setting', 'profit_setting'] as const).map(f => (
                      <div key={f} className="grid grid-cols-8 gap-2 items-center mb-2">
                        <div className="col-span-2"><select className={selCls} value={cfg[tab][f]?.operator ?? ''} onChange={e => setC(tab, [f, 'operator'], e.target.value)}>
                          <option value="">Pilih...</option><option value="*">* (Kali)</option><option value="/">/ (Bagi)</option><option value="+">+ (Tambah)</option><option value="-">- (Kurang)</option>{f === 'profit_setting' && <option value="%">% (Persen)</option>}
                        </select></div>
                        <Input className="col-span-3" value={cfg[tab][f]?.value ?? ''} onChange={e => setC(tab, [f, 'value'], e.target.value)} />
                        <span className="col-span-3 text-sm text-muted-foreground">{f === 'price_setting' ? 'Harga (tanpa %)' : 'Keuntungan (boleh %)'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <details>
                <summary className="text-sm text-muted-foreground cursor-pointer">7. JSON lanjutan (headers, method, content_type, settings update-flag)</summary>
                <textarea className="mt-2 flex w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={cfg[tab].advanced} onChange={e => setC(tab, ['advanced'], e.target.value)} placeholder='{"headers":{"Authorization":"provider_key"},"content_type":"application/json","settings":{"name":"1","price_profit":"1"}}' />
              </details>
            </>)}
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="secondary" disabled={tab === OPS[0].key} onClick={() => setTab(OPS[OPS.findIndex(o => o.key === tab) - 1].key)}>Kembali</Button>
              <Button type="submit">Simpan</Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/service/provider/list')}>Batal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
