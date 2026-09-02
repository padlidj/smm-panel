'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      username,
      password,
      type,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Username, password, atau tipe tidak valid');
      return;
    }

    if (type === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Masuk</CardTitle>
        <CardDescription>Masuk ke panel SMM Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipe Login</label>
            <Select value={type} onChange={e => setType(e.target.value as 'user' | 'admin')}>
              <option value="user">Pengguna</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          {error && <Toast type="error" message={error} />}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loading label="Memproses..." /> : 'Masuk'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <a href="/auth/register" className="text-primary hover:underline">
            Daftar
          </a>
        </p>
      </CardContent>
    </Card>
  );
}