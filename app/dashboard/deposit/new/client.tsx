'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';

export function DepositNewClient({ methods, user }: any) {
  const router = useRouter();
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const method = methods.find((m: any) => m.id === Number(methodId));
  const fee = method ? Math.ceil((Number(amount || 0) * Number(method.fee_percent || 0)) / 100) : 0;

  const submit = async () => {
    setError(''); setInfo('');
    if (!methodId || !amount || Number(amount) < 1) return setError('Pilih metode dan masukkan nominal.');
    if (method && (Number(amount) < Number(method.min) || Number(amount) > Number(method.max))) {
      return setError(`Minimal Rp ${Number(method.min).toLocaleString('id-ID')}, maksimal Rp ${Number(method.max).toLocaleString('id-ID')}.`);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_id: Number(methodId), amount: Number(amount) }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal membuat deposit.');
      if (data.snap_redirect_url) {
        window.location.href = data.snap_redirect_url;
        return;
      }
      setInfo(data.message || 'Deposit berhasil dibuat. Menunggu konfirmasi admin.');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Deposit</h1>
      <Card>
        <CardHeader>
          <CardTitle>Top Up Balance</CardTitle>
          <CardDescription>User: {user?.username || '-'} ({user?.email || '-'})</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={methodId} onChange={e => setMethodId(e.target.value)}>
              <option value="">Select method</option>
              {methods.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.payment} - {m.method} ({m.type === 'AUTO' ? 'Auto' : 'Manual'}){m.fee_percent > 0 ? ` +${m.fee_percent}%` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          {method && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Min/Max:</span> Rp {Number(method.min).toLocaleString('id-ID')} - Rp {Number(method.max).toLocaleString('id-ID')}</p>
              {method.fee_percent > 0 && <p><span className="text-muted-foreground">Fee:</span> {method.fee_percent}% = Rp {fee.toLocaleString('id-ID')}</p>}
              <p><span className="text-muted-foreground">You pay:</span> <span className="font-bold">Rp {(Number(amount || 0) + fee).toLocaleString('id-ID')}</span></p>
            </div>
          )}
          {error && <Toast type="error" message={error} />}
          {info && <Toast type="success" message={info} />}
          <Button onClick={submit} disabled={loading} className="w-full">{loading ? 'Processing...' : 'Continue to Payment'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}