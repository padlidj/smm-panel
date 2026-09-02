'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';

export function TicketNewClient() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!subject || !message) return setError('Subject dan pesan wajib diisi.');

    setLoading(true);
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      router.push(`/dashboard/ticket/${data.ticket_id}`);
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">New Ticket</h1>
      <Card>
        <CardHeader><CardTitle>Create Ticket</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input placeholder="e.g. Order issue" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <textarea className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {error && <Toast type="error" message={error} />}
          <Button onClick={submit} disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}