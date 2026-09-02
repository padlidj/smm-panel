'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';

export function AccountSettingsClient({ user }: any) {
  const router = useRouter();
  const notif = user.notification || {};
  const [orderNotif, setOrderNotif] = useState(notif.order === '1');
  const [whitelist, setWhitelist] = useState(user.api_whitelist_ips || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const saveNotif = async () => {
    setError(''); setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification: { order: orderNotif ? '1' : '0' } }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setInfo('Pengaturan disimpan.');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setError(''); setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_api_key: true }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setInfo('API key baru: ' + data.api_key);
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const saveWhitelist = async () => {
    setError(''); setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_whitelist_ips: whitelist }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setInfo('Whitelist IP disimpan.');
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={orderNotif} onChange={e => setOrderNotif(e.target.checked)} className="h-4 w-4" />
            Email notification on order status change
          </label>
          <Button onClick={saveNotif} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>Your API key for programmatic order creation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/50 p-3 font-mono text-sm break-all">{user.api_key || 'Not generated yet'}</div>
          <Button variant="secondary" onClick={generateKey} disabled={loading}>{loading ? 'Working...' : 'Generate / Regenerate API Key'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>IP Whitelist</CardTitle>
          <CardDescription>Batasi akses API hanya dari IP tertentu. Pisahkan dengan koma. Kosongkan untuk semua IP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="e.g. 43.129.57.93, 192.168.1.1" value={whitelist} onChange={e => setWhitelist(e.target.value)} />
          <Button onClick={saveWhitelist} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </CardContent>
      </Card>
      {error && <Toast type="error" message={error} />}
      {info && <Toast type="success" message={info} />}
    </div>
  );
}