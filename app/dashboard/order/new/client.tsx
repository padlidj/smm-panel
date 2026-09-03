'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';
import { Star } from 'lucide-react';

export function OrderNewClient({ categories, services, customPrices = {}, balance }: any) {
  const router = useRouter();
  const [catId, setCatId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [target, setTarget] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customComments, setCustomComments] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => services.filter((s: any) => !catId || s.category_id === catId),
    [catId, services]
  );
  const service = filtered.find((s: any) => s.id === Number(serviceId));
  const cp = service ? customPrices[service.id] : null;
  const rate = cp ? Number(cp.price) : service ? Number(service.price) : 0;
  const totalPrice = service
    ? service.type === 'CUSTOM_COMMENTS'
      ? Math.ceil((rate / 1000) * (customComments.split('\n').filter(l => l.trim()).length || 0))
      : Math.ceil((rate / 1000) * Number(quantity || 0))
    : 0;

  const submit = async () => {
    setError('');
    if (!serviceId || !target) return setError('Pilih layanan dan isi target.');
    const qty = service.type === 'CUSTOM_COMMENTS' ? customComments.split('\n').filter(l => l.trim()).length : Number(quantity);
    if (!qty) return setError('Isi jumlah / komentar.');
    if (qty < service.min || qty > service.max) return setError(`Jumlah minimal ${service.min}, maksimal ${service.max}.`);
    if (totalPrice > balance) return setError('Saldo tidak mencukupi.');
    if (service.type === 'CUSTOM_COMMENTS' && !customComments) return setError('Custom comments wajib diisi.');

    setLoading(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: Number(serviceId), target, quantity: qty, custom_comments: customComments, username }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal membuat pesanan.');
      router.push(`/dashboard/order/detail/${data.order_id}`);
      router.refresh();
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setCatId(null); setServiceId(''); setTarget(''); setQuantity(''); setCustomComments(''); setUsername(''); setError(''); };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Baru</h1>
        <div className="text-sm text-muted-foreground">
          Saldo: <span className="font-bold text-primary">Rp {balance.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setCatId(null); setServiceId(''); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!catId ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary hover:bg-secondary/80'}`}>
          Semua
        </button>
        {categories.map((c: any) => (
          <button key={c.id} onClick={() => { setCatId(c.id); setServiceId(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${catId === c.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary hover:bg-secondary/80'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Detail Layanan</CardTitle>
            <CardDescription>Pilih layanan, isi target, tentukan jumlah.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Layanan ({filtered.length})</label>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih layanan...</option>
                {filtered.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — Rp {Number(s.price).toLocaleString('id-ID')}/1K{customPrices[s.id] ? ' (*Khusus)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {service && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Harga/K</div>
                  <div className="font-bold">Rp {rate.toLocaleString('id-ID')} {cp && <span className="text-primary text-xs">(*Khusus)</span>}</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Min</div>
                  <div className="font-bold">{service.min.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Maks</div>
                  <div className="font-bold">{service.max.toLocaleString('id-ID')}</div>
                </div>
                {service.description && <div className="col-span-3 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">{service.description}</div>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target *</label>
              <Input placeholder="Username / Link" value={target} onChange={e => setTarget(e.target.value)} />
            </div>

            {service?.type === 'CUSTOM_COMMENTS' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Custom Comments *</label>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={customComments}
                  onChange={e => setCustomComments(e.target.value)}
                  placeholder="Satu komentar per baris"
                />
                <p className="text-xs text-muted-foreground">Jumlah otomatis: {customComments.split('\n').filter(l => l.trim()).length} komentar</p>
              </div>
            )}

            {service?.type === 'COMMENT_LIKES' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username (pemilik komentar) *</label>
                <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            )}

            {service && service.type !== 'CUSTOM_COMMENTS' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Jumlah *</label>
                <Input type="number" placeholder={`${service.min} - ${service.max}`} value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
            )}

            {error && <Toast type="error" message={error} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Layanan</span><span className="font-medium max-w-40 truncate">{service?.name || '-'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Target</span><span className="font-medium max-w-40 truncate">{target || '-'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Jumlah</span><span className="font-medium">{(service?.type === 'CUSTOM_COMMENTS' ? customComments.split('\n').filter(l => l.trim()).length : Number(quantity || 0)).toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Harga/K</span><span className="font-medium">Rp {rate.toLocaleString('id-ID')}</span></div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm font-medium">Total</span>
              <span className="text-xl font-bold text-primary">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={reset} disabled={loading}>Reset</Button>
              <Button className="flex-1" onClick={submit} disabled={loading}>{loading ? 'Memproses...' : 'Submit'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}