'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';

export function OrderNewClient({ categories, services, customPrices = {}, balance }: any) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [target, setTarget] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customComments, setCustomComments] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => services.filter((s: any) => !categoryId || s.category_id === Number(categoryId)), [categoryId, services]);
  const service = filtered.find((s: any) => s.id === Number(serviceId));
  const cp = service ? customPrices[service.id] : null;
  const rate = cp ? Number(cp.price) : service ? Number(service.price) : 0;
  const totalPrice = service ? Math.ceil((rate / 1000) * Number(quantity || 0)) : 0;

  const submit = async () => {
    setError('');
    if (!serviceId || !target || !quantity) return setError('Lengkapi semua field.');
    if (Number(quantity) < service.min || Number(quantity) > service.max) return setError(`Jumlah minimal ${service.min}, maksimal ${service.max}.`);
    if (totalPrice > balance) return setError('Saldo tidak mencukupi.');
    if (service.type === 'CUSTOM_COMMENTS' && !customComments) return setError('Custom comments wajib diisi.');

    setLoading(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: Number(serviceId), target, quantity: Number(quantity), custom_comments: customComments, username }),
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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">New Order</h1>
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>Saldo Anda: <span className="font-medium">Rp {balance.toLocaleString('id-ID')}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={categoryId} onChange={e => { setCategoryId(e.target.value); setServiceId(''); }}>
              <option value="">Select category</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Service</label>
            <Select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={!categoryId}>
              <option value="">Select service</option>
              {filtered.map((s: any) => <option key={s.id} value={s.id}>{s.name} - Rp {Number(s.price).toLocaleString('id-ID')}/1K{customPrices[s.id] ? ' (*Khusus)' : ''}</option>)}
            </Select>
          </div>
          {service && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Price:</span> Rp {rate.toLocaleString('id-ID')} / 1000 {cp && <span className="text-primary font-semibold">(*Khusus)</span>}</p>
              <p><span className="text-muted-foreground">Min/Max:</span> {service.min} - {service.max}</p>
              {service.description && <p><span className="text-muted-foreground">Desc:</span> {service.description}</p>}
              {service.type === 'SUBSCRIPTIONS' && <p className="text-muted-foreground">Fill target with your profile URL.</p>}
              {service.type === 'CUSTOM_COMMENTS' && <p className="text-muted-foreground">Custom comments: fill each comment separated by newline.</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target</label>
            <Input placeholder="Link / username / ID" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" placeholder="e.g. 1000" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          {service?.type === 'CUSTOM_COMMENTS' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Custom Comments</label>
              <textarea className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={customComments} onChange={e => setCustomComments(e.target.value)} />
            </div>
          )}
          {service?.type === 'COMMENT_LIKES' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input placeholder="Comment username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          )}
          {error && <Toast type="error" message={error} />}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-bold">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
            <Button onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Submit Order'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}