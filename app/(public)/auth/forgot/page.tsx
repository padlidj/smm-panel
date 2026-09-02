'use client';

import { useState, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lupa Password</CardTitle>
          <CardDescription>Masukkan email untuk menerima link reset.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">Jika email terdaftar, link reset telah dikirim.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Link Reset'}</Button>
              <p className="text-center text-sm"><Link href="/auth/login" className="text-primary">Kembali ke login</Link></p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}