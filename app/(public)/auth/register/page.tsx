'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Pendaftaran gagal');
      return;
    }

    setSuccess('Pendaftaran berhasil! Mengalihkan...');
    setTimeout(() => router.push('/auth/login'), 1500);
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Daftar</CardTitle>
        <CardDescription>Buat akun SMM panel baru</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Konfirmasi Password</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <Toast type="error" message={error} />}
          {success && <Toast type="success" message={success} />}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loading label="Memproses..." /> : 'Daftar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <a href="/auth/login" className="text-primary hover:underline">
            Masuk
          </a>
        </p>
      </CardContent>
    </Card>
  );
}