'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/toast';

export function TicketDetailClient({ ticket }: any) {
  const router = useRouter();
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const statusColor = (s: string) => {
    const map: Record<string, string> = { OPEN: 'destructive', REPLIED: 'default', CLOSED: 'secondary' };
    return map[s] || 'outline';
  };

  const sendReply = async () => {
    setError(''); setInfo('');
    if (!reply.trim()) return setError('Pesan tidak boleh kosong.');
    setLoading(true);
    try {
      const res = await fetch(`/api/ticket/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!data.status) return setError(data.message || 'Gagal.');
      setReply('');
      setInfo('Reply terkirim.');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Ticket #{ticket.id}</h1>
      <div className="flex items-center gap-2">
        <Badge variant={statusColor(ticket.status) as any}>{ticket.status}</Badge>
        <span className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleString('id-ID')}</span>
      </div>
      <Card>
        <CardHeader><CardTitle>{ticket.subject}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
          <div className="mt-4 space-y-3">
            {ticket.replies.map((r: any) => (
              <div key={r.id} className={`rounded-md border p-3 text-sm ${r.is_admin ? 'bg-primary/5' : 'bg-muted/30'}`}>
                <div className="text-xs text-muted-foreground mb-1">
                  {r.is_admin ? 'Admin' : 'You'} · {new Date(r.created_at).toLocaleString('id-ID')}
                </div>
                <p className="whitespace-pre-wrap">{r.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {ticket.status !== 'CLOSED' && (
        <Card>
          <CardHeader><CardTitle>Reply</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reply} onChange={e => setReply(e.target.value)} />
            {error && <Toast type="error" message={error} />}
            {info && <Toast type="success" message={info} />}
            <Button onClick={sendReply} disabled={loading}>{loading ? 'Sending...' : 'Send Reply'}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}