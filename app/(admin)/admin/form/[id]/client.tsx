'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

export function AdminFormClient({ admin }: any) {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    id: admin?.id,
    username: admin?.username || '',
    email: admin?.email || '',
    password: '',
    level: admin?.level || 'ADMIN',
    status: admin?.status ?? true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.id && !form.password) {
      setError('Password required for new admin');
      return;
    }
    try {
      await postForm('/api/admin/admin', form);
      setSuccess('Admin saved');
      setTimeout(() => router.push('/admin/admin/list'), 1000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{admin ? `Edit Admin: ${admin.username}` : 'New Admin'}</h1>
      <Card>
        <CardHeader><CardTitle>Admin (SUPERADMIN only)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={form.username} onChange={e => set('username', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password {admin ? '(leave blank to keep)' : ''}</label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.level} onChange={e => set('level', e.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(form.status)} onChange={e => set('status', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/admin/admin/list')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}