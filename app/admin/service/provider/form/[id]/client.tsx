'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

const CONFIG_FIELDS = ['profile_config', 'order_config', 'status_config', 'service_config', 'refill_config', 'refill_status_config'] as const;

// Preset: standar panel SMM v2 (api/admin.php) — parity is_default_settings Laravel.
const V2_PRESET = {
  profile_config: JSON.stringify({ endpoint: '', request: { action: 'balance', key: 'provider_key' }, response: { balance: 'balance', currency: 'currency' } }, null, 2),
  order_config: JSON.stringify({ endpoint: '', request: { action: 'add', key: 'provider_key', service: 'service_id', quantity: 'quantity', target: 'target' }, response: { order: { order_id: 'order' } } }, null, 2),
  status_config: JSON.stringify({ endpoint: '', request: { action: 'status', key: 'provider_key', order_id: 'order_id' }, response: { status: 'status', start_count: 'start_count', remains: 'remains' }, status_value: { COMPLETED: ['Completed', 'COMPLETE', 'Finish', 'Selesai'], CANCELED: ['Canceled', 'Cancel', 'Refunded'] } }, null, 2),
  service_config: JSON.stringify({ endpoint: '', request: { action: 'services', key: 'provider_key' }, looping: 'data', response: { id: 'id', name: 'name', category: 'category', price: 'price', min: 'min', max: 'max', type: 'type', refill: 'refill', description: 'description' }, currency: 'IDR', price_setting: { operator: '*', value: '1' }, profit_setting: { operator: '%', value: '20' }, other_value: { custom_comments: '', comment_likes: '', is_refill_support: 'true' }, settings: { name: '1', min_max: '1', price_profit: '1', description: '1', custom_comments: '1', refill_support: '1', category: '1', status: '1' } }, null, 2),
  refill_config: JSON.stringify({ endpoint: '', request: { action: 'refill', key: 'provider_key', service: 'refill_service_id', order_id: 'order_id' }, response: { refill: { refill_id: 'refill' } } }, null, 2),
  refill_status_config: JSON.stringify({ endpoint: '', request: { action: 'refill_status', key: 'provider_key', id: 'refill_id' }, response: { status: 'status', start_count: 'start_count', remains: 'remains' }, status_value: { COMPLETED: ['Completed', 'Selesai'], CANCELED: ['Canceled', 'Refunded'] } }, null, 2),
};

export function ProviderFormClient({ provider }: any) {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    id: provider?.id,
    name: provider?.name || '',
    provider_id: provider?.provider_id || '',
    provider_key: provider?.provider_key || '',
    provider_secret: provider?.provider_secret || '',
    status: provider?.status ?? true,
    is_refill_support: provider?.is_refill_support ?? false,
    currency: provider?.currency || 'IDR',
    ...CONFIG_FIELDS.reduce((acc, k) => ({ ...acc, [k]: provider?.[k] ? JSON.stringify(provider[k], null, 2) : '' }), {}),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/provider', form);
      setSuccess('Provider saved');
      setTimeout(() => router.push('/admin/service/provider/list'), 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{provider ? `Edit Provider: ${provider.name}` : 'New Provider'}</h1>
      <Card>
        <CardHeader><CardTitle>Provider</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider ID</label>
                <Input value={form.provider_id} onChange={e => set('provider_id', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider Key</label>
                <Input value={form.provider_key} onChange={e => set('provider_key', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider Secret</label>
                <Input value={form.provider_secret} onChange={e => set('provider_secret', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(form.status)} onChange={e => set('status', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_refill_support} onChange={e => set('is_refill_support', e.target.checked)} />
              <label className="text-sm">Support Refill</label>
              <Button type="button" variant="secondary" size="sm" className="ml-auto"
                onClick={() => { if (confirm('Timpa semua config dengan preset standar panel v2?')) CONFIG_FIELDS.forEach(f => set(f, V2_PRESET[f])); }}>
                Preset v2
              </Button>
            </div>
            {CONFIG_FIELDS.map(field => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium font-mono">{field}</label>
                <textarea
                  className="flex w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  placeholder='{"endpoint":"https://.../api/v2","request":{"action":"services","key":"provider_key"},"looping":"data","response":{"id":"id","name":"name","category":"category","price":"price","min":"min","max":"max"},"price_setting":{"operator":"*","value":"1"},"profit_setting":{"operator":"%","value":"20"},"settings":{"name":"1","price_profit":"1"}}'
                />
              </div>
            ))}
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/admin/service/provider/list')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}