'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

// Laravel user form parity: full_name, username, email, balance, level(role), status,
// password (optional on edit / required on create), api_key (optional on edit).
export function UserFormClient({ user }: any) {
  const router = useRouter();
  const isEdit = !!user?.id;
  const [full_name, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [balance, setBalance] = useState(String(user?.balance ?? 0));
  const [status, setStatus] = useState(user?.status || 'ACTIVE');
  const [role, setRole] = useState(user?.role || 'USER');
  const [password, setPassword] = useState('');
  const [api_key, setApiKey] = useState(user?.api_key || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/user', {
        ...(isEdit ? { id: user.id } : {}),
        username, email, full_name, balance: parseInt(balance || '0', 10), status, role,
        ...(password ? { password } : {}),
        ...(api_key ? { api_key } : {}),
      });
      setSuccess(isEdit ? 'Pengguna berhasil diperbarui.' : 'Pengguna berhasil ditambahkan.');
      setTimeout(() => router.push('/admin/user/list'), 800);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-2"><label className="text-sm font-medium">{label}</label>{node}</div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit User' : 'Tambah User'}</h1>
      <Card>
        <CardHeader><CardTitle>{isEdit ? `User #${user.id} - ${user.username}` : 'User Baru'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('Nama Lengkap', <Input value={full_name} onChange={e => setFullName(e.target.value)} />)}
            {field('Username', <Input value={username} onChange={e => setUsername(e.target.value)} required maxLength={20} />)}
            {field('Email', <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />)}
            {field('Balance', <Input type="number" min={0} value={balance} onChange={e => setBalance(e.target.value)} required />)}
            {field('Status', <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option><option value="BANNED">Banned</option><option value="UNVERIFIED">Unverified</option>
            </Select>)}
            {field('Role', <Select value={role} onChange={e => setRole(e.target.value)}>
              <option value="USER">User</option><option value="ADMIN">Admin</option>
            </Select>)}
            {field(`Password${isEdit ? ' (kosongkan jika tidak diubah)' : ' (min 6 karakter)'}`, <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />)}
            {field(`API Key${isEdit ? ' (kosongkan jika tidak diubah)' : ' (otomatis dibuat)'}`, <Input value={api_key} onChange={e => setApiKey(e.target.value)} disabled={!isEdit} placeholder={!isEdit ? 'auto-generated' : ''} />)}
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
            <div className="flex gap-2">
              <Button type="submit">Simpan</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/admin/user/list')}>Batal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
