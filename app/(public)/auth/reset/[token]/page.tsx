'use client';

import { useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Password tidak cocok'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset Password</CardTitle></CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-green-500">Password berhasil direset.</p>
              <Link href="/auth/login"><Button className="w-full">Login</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Input type="password" placeholder="Password baru" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <Input type="password" placeholder="Konfirmasi password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Reset Password'}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}