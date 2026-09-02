'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';

export function BulkOrderClient({ categories, services, balance }: any) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [lines, setLines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const filtered = useMemo(() => services.filter((s: any) => !categoryId || s.category_id === Number(categoryId)), [categoryId, services]);
  const service = filtered.find((s: any) => s.id === Number(serviceId));

  const calcTotal = () => {
    if (!service) return 0;
    return lines.split('\n').reduce((sum, line) => {
      const parts = line.trim().split('|');
      if (parts.length !== 2) return sum;
      const qty = Number(parts[1]);
      if (!Number.isInteger(qty) || qty < service.min || qty > service.max) return sum;
      return sum + Math.ceil((Number(service.price) / 1000) * qty);
    }, 0);
  };

  const submit = async () => {
    setError('');
    setResult(null);
    if (!serviceId || !lines.trim()) return setError('Pilih layanan dan isi target.');
    const targets = lines.trim().split('\n').filter(Boolean).map((line) => {
      const parts = line.trim().split('|');
      return { target: parts[0]?.trim() || '', quantity: Number(parts[1] || 0) };
    });
    if (targets.length === 0) return setError('Setidaknya 1 target.');
    if (targets.length > 20) return setError('Maksimal 20 target.');

    setLoading(true);
    try {
      const res = await fetch('/api/order/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: Number(serviceId), targets }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setResult(data.data);
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Bulk Order</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pesan Massal</CardTitle>
          <CardDescription>Saldo: <span className="font-medium">Rp {balance.toLocaleString('id-ID')}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={categoryId} onChange={e => { setCategoryId(e.target.value); setServiceId(''); }}>
              <option value="">Pilih kategori</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Service</label>
            <Select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={!categoryId}>
              <option value="">Pilih layanan</option>
              {filtered.map((s: any) => <option key={s.id} value={s.id}>{s.name} - Rp {Number(s.price).toLocaleString('id-ID')}/1K</option>)}
            </Select>
          </div>
          {service && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Harga:</span> Rp {Number(service.price).toLocaleString('id-ID')} / 1000</p>
              <p><span className="text-muted-foreground">Min/Max:</span> {service.min} - {service.max} per target</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target (1 baris = 1 target)</label>
            <p className="text-xs text-muted-foreground">Format: <code>target|jumlah</code>, maks 20 baris.</p>
            <textarea
              className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder={`https://instagram.com/user1|100\nhttps://instagram.com/user2|200`}
              value={lines}
              onChange={e => setLines(e.target.value)}
            />
          </div>
          {error && <Toast type="error" message={error} />}

          {result ? (
            <div className="space-y-2">
              <p className="text-sm text-green-500">{result.orders.length} pesanan berhasil dibuat (Rp {result.total_price.toLocaleString('id-ID')}).</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.orders.map((o: any) => (
                  <div key={o.order_id} className="text-xs bg-muted p-2 rounded flex justify-between">
                    <span>{o.target}</span>
                    <span>{o.quantity}x - Rp {o.price.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => router.push('/dashboard/order/history')}>Lihat Pesanan</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Estimasi total:</span>{' '}
                <span className="font-bold">Rp {calcTotal().toLocaleString('id-ID')}</span>
              </div>
              <Button onClick={submit} disabled={loading || !service}>{loading ? 'Processing...' : 'Pesan Massal'}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}