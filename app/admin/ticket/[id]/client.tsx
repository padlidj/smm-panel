'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { postForm } from '@/lib/admin-client';

export function TicketDetailClient({ ticket }: any) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [closing, setClosing] = useState(ticket.status === 'CLOSED');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusColor = (s: string) => {
    const map: Record<string, string> = { OPEN: 'destructive', REPLIED: 'default', CLOSED: 'secondary' };
    return map[s] || 'outline';
  };

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!message.trim()) return;
    try {
      await postForm('/api/admin/ticket/reply', { ticket_id: ticket.id, message, user_id: null });
      setSuccess('Reply sent');
      setMessage('');
      if (closing) {
        await fetch('/api/admin/ticket/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ticket.id }) });
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Ticket #{ticket.id}</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{ticket.subject}</CardTitle>
            <Badge variant={statusColor(ticket.status) as any}>{ticket.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {ticket.user.username} ({ticket.user.email}) · {new Date(ticket.created_at).toLocaleString('id-ID')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ticket.replies.map((r: any) => (
              <div key={r.id} className={`rounded-lg border p-4 ${r.is_admin ? 'bg-primary/5 border-primary/20' : 'bg-muted/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{r.is_admin ? 'Admin' : ticket.user.username}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('id-ID')}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.message}</p>
              </div>
            ))}
            {ticket.replies.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No replies yet</p>}
          </div>
          <form onSubmit={reply} className="mt-4 space-y-3">
            <textarea
              className="flex w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Write admin reply..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={ticket.status === 'CLOSED'}>Send Reply</Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={closing} onChange={e => setClosing(e.target.checked)} disabled={ticket.status === 'CLOSED'} />
                Close ticket
              </label>
            </div>
            {error && <Toast type="error" message={error} />}
            {success && <Toast type="success" message={success} />}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}