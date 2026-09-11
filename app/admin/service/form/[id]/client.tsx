'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

export function ServiceFormClient({ service, categories, providers }: any) {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    id: service?.id,
    category_id: service?.category_id || (categories[0]?.id ?? ''),
    provider_id: service?.provider_id || (providers[0]?.id ?? ''),
    name: service?.name || '',
    type: service?.type || 'DEFAULT',
    price: service?.price ?? '',
    profit: service?.profit ?? '',
    min: service?.min ?? '',
    max: service?.max ?? '',
    description: service?.description || '',
    status: service?.status ?? true,
    provider_service_id: service?.provider_service_id || '',
    refill_provider_service_id: service?.refill_provider_service_id || '',
    is_refill_support: service?.is_refill_support ?? false,
    update_service: service?.settings ? String(service.settings.update_service) === '1' : true,
    update_automate: ['name', 'min_max', 'price_profit', 'profit', 'description', 'custom_comments', 'refill_support', 'status'].reduce((a: any, k) => { a[k] = service?.settings ? String(service.settings[k]) === '1' : true; return a; }, {}),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/service', form);
      setSuccess('Service saved');
      setTimeout(() => router.push('/admin/service/list'), 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{service ? `Edit Service: ${service.name}` : 'New Service'}</h1>
      <Card>
        <CardHeader><CardTitle>Service</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.provider_id} onChange={e => set('provider_id', e.target.value)}>
                  {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="DEFAULT">Default</option>
                  <option value="COMMENT_LIKES">Comment Likes</option>
                  <option value="CUSTOM_COMMENTS">Custom Comments</option>
                  <option value="SUBSCRIPTIONS">Subscriptions</option>
                  <option value="POLL">Poll</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(form.status)} onChange={e => set('status', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Profit</label>
                <Input type="number" value={form.profit} onChange={e => set('profit', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min</label>
                <Input type="number" value={form.min} onChange={e => set('min', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max</label>
                <Input type="number" value={form.max} onChange={e => set('max', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider Service ID</label>
                <Input value={form.provider_service_id} onChange={e => set('provider_service_id', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Refill Provider Service ID</label>
                <Input value={form.refill_provider_service_id} onChange={e => set('refill_provider_service_id', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea className="flex w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            {/* Laravel parity: is_refill_support + update_service + update_automate checkboxes */}
            <div className="space-y-2 border-t pt-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.is_refill_support} onChange={e => set('is_refill_support', e.target.checked)} />
                Refill Support
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.update_service} onChange={e => set('update_service', e.target.checked)} />
                Auto-update service (sync from provider)
              </label>
              {form.update_service && (
                <div className="grid grid-cols-2 gap-2 pl-6 md:grid-cols-4">
                  {(['name', 'min_max', 'price_profit', 'profit', 'description', 'custom_comments', 'refill_support', 'status'] as const).map(k => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.update_automate[k]} onChange={e => set('update_automate', { ...form.update_automate, [k]: e.target.checked })} />
                      {k}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/admin/service/list')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}