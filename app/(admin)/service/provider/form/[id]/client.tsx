'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

const CONFIG_FIELDS = ['profile_config', 'order_config', 'status_config', 'service_config', 'refill_config', 'refill_status_config'] as const;

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
            </div>
            {CONFIG_FIELDS.map(field => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium font-mono">{field}</label>
                <textarea
                  className="flex w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  placeholder="{}"
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