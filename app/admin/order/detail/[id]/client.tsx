'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { postForm } from '@/lib/admin-client';

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'];

export function OrderEditClient({ order }: { order: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [target, setTarget] = useState(order.target);
  const [providerOrderId, setProviderOrderId] = useState(order.provider_order_id || '');
  const [remains, setRemains] = useState(String(order.remains));
  const [startCount, setStartCount] = useState(String(order.start_count));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await postForm('/api/admin/order', { id: order.id, status, target, provider_order_id: providerOrderId, remains, start_count: startCount });
      router.refresh();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Edit Order</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Status
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </label>
          <label className="text-sm font-medium">Provider Order ID
            <Input value={providerOrderId} onChange={e => setProviderOrderId(e.target.value)} placeholder="kosongkan untuk hapus" />
          </label>
          <label className="text-sm font-medium">Target
            <Input value={target} onChange={e => setTarget(e.target.value)} />
          </label>
          <label className="text-sm font-medium">Remains
            <Input type="number" min={0} value={remains} onChange={e => setRemains(e.target.value)} />
          </label>
          <label className="text-sm font-medium">Start Count
            <Input type="number" min={0} value={startCount} onChange={e => setStartCount(e.target.value)} />
          </label>
        </div>
        <Button className="mt-4" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Simpan'}</Button>
      </CardContent>
    </Card>
  );
}
