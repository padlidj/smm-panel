'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';

export function RefillNewClient({ order }: any) {
  const router = useRouter();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!quantity || Number(quantity) < 1) return setError('Masukkan jumlah yang valid.');

    setLoading(true);
    try {
      const res = await fetch('/api/order/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, quantity: Number(quantity) }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      router.push('/dashboard/order/refill/history');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Refill Order #{order.id}</h1>
      <Card>
        <CardHeader><CardTitle>Refill Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Service:</span> {order.service_name}</p>
            <p><span className="text-muted-foreground">Target:</span> {order.target}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" placeholder="e.g. 100" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          {error && <Toast type="error" message={error} />}
          <Button onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Submit Refill'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}