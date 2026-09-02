'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';

export function AccountProfileClient({ user }: any) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submitProfile = async () => {
    setError(''); setInfo('');
    if (!email) return setError('Email wajib diisi.');
    setLoading(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setInfo('Profil berhasil disimpan.');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setError(''); setInfo('');
    if (!oldPassword || !newPassword) return setError('Isi password lama dan baru.');
    setLoading(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setInfo('Password berhasil diubah.');
      setOldPassword(''); setNewPassword('');
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Account Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Username</div>
            <div className="font-medium">{user.username}</div>
          </div>
          <div className="text-sm text-muted-foreground">Member since {new Date(user.created_at).toLocaleDateString('id-ID')}</div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">API Key</label>
            <Input value={user.api_key || '-'} disabled />
            <p className="text-xs text-muted-foreground">Generated in Settings.</p>
          </div>
          <Button onClick={submitProfile} disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="Current password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          <Input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <Button variant="secondary" onClick={changePassword} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
        </CardContent>
      </Card>
      {error && <Toast type="error" message={error} />}
      {info && <Toast type="success" message={info} />}
    </div>
  );
}