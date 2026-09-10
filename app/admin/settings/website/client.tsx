'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

export function SettingsClient({ value }: any) {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    website_name: value.website_name || '',
    website_url: value.website_url || '',
    logo: value.logo || '',
    is_register_enabled: value.is_register_enabled ?? true,
    is_reset_password_enabled: value.is_reset_password_enabled ?? false,
    is_email_verification_enabled: value.is_email_verification_enabled ?? false,
    is_maintenance: value.is_maintenance ?? false,
    meta_description: value.meta_description || '',
    meta_keywords: value.meta_keywords || '',
    order_info: value.order_info || '',
    deposit_info: value.deposit_info || '',
    smtp: { host: '', port: '', username: '', password: '', from: '', encryption: '', ...(value.smtp || {}) },
    midtrans_payment: { server_key: (value.midtrans_payment || {}).server_key || '' },
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setIn = (k: string, sub: string, v: any) => setForm((f: any) => ({ ...f, [k]: { ...f[k], [sub]: v } }));
  const area = (label: string, k: string) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <textarea className="w-full rounded-md border bg-transparent p-3 text-sm min-h-20" value={form[k]} onChange={e => set(k, e.target.value)} />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/settings', { key: 'main', ...form });
      setSuccess('Settings saved');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggle = (label: string, k: string) => (
    <div className="flex items-center justify-between border rounded-md px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => set(k, !form[k])}
        className={`w-11 h-6 rounded-full transition-colors ${form[k] ? 'bg-primary' : 'bg-secondary'}`}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transform transition-transform ${form[k] ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Website Settings</h1>
      <Card>
        <CardHeader><CardTitle>Main Config</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Website Name</label>
              <Input value={form.website_name} onChange={e => set('website_name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Website URL</label>
              <Input value={form.website_url} onChange={e => set('website_url', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex gap-2">
                <Input value={form.logo} onChange={e => set('logo', e.target.value)} placeholder="URL logo" className="flex-1" />
                <Button variant="secondary" type="button" onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file'; input.accept = 'image/*';
                  input.onchange = async () => {
                    const f = input.files?.[0]; if (!f) return;
                    const fd = new FormData(); fd.append('file', f);
                    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                    const d = await res.json();
                    if (res.ok) set('logo', d.url);
                  };
                  input.click();
                }}>Upload</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Description</label>
              <Input value={form.meta_description} onChange={e => set('meta_description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Keywords</label>
              <Input value={form.meta_keywords} onChange={e => set('meta_keywords', e.target.value)} />
            </div>
            {area('Order Info (HTML, tampil di form order baru)', 'order_info')}
            {area('Deposit Info (HTML, tampil di form deposit baru)', 'deposit_info')}
            <div className="space-y-2">
              <label className="text-sm font-medium">SMTP Host</label>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="smtp.gmail.com" value={form.smtp.host} onChange={e => setIn('smtp', 'host', e.target.value)} />
                <Input placeholder="587" value={form.smtp.port} onChange={e => setIn('smtp', 'port', e.target.value)} />
                <select className="rounded-md border bg-transparent px-2 text-sm" value={form.smtp.encryption} onChange={e => setIn('smtp', 'encryption', e.target.value)}>
                  <option value="">tls</option>
                  <option value="ssl">ssl</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="SMTP username" value={form.smtp.username} onChange={e => setIn('smtp', 'username', e.target.value)} />
                <Input placeholder="SMTP password" type="password" value={form.smtp.password} onChange={e => setIn('smtp', 'password', e.target.value)} />
              </div>
              <Input placeholder="From address (opsional)" value={form.smtp.from} onChange={e => setIn('smtp', 'from', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Midtrans Server Key</label>
              <Input type="password" value={form.midtrans_payment.server_key} onChange={e => setIn('midtrans_payment', 'server_key', e.target.value)} placeholder="kosongkan = pakai env MIDTRANS_SERVER_KEY" />
            </div>
            <div className="space-y-2">
              {toggle('Registration Enabled', 'is_register_enabled')}
              {toggle('Reset Password Enabled', 'is_reset_password_enabled')}
              {toggle('Email Verification', 'is_email_verification_enabled')}
              {toggle('Maintenance Mode', 'is_maintenance')}
            </div>
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}