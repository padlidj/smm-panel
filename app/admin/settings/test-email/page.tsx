'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';

export default function TestEmailPage() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Test Email from SMM Panel');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async () => {
    setMsg(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body }) });
      const d = await res.json();
      setMsg(res.ok ? `✅ ${d.message}` : `❌ ${d.error}`);
    } catch { setMsg('❌ Request failed'); }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Test Email</h1>
      <Card>
        <CardHeader><CardTitle>Send Test Email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">To</label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="admin@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body (HTML, optional)</label>
            <textarea className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={body} onChange={e => setBody(e.target.value)} placeholder="<p>Hello!</p>" />
          </div>
          {msg && <Toast type={msg.startsWith('✅') ? 'success' : 'error'} message={msg} />}
          <Button onClick={send} disabled={loading || !to}>{loading ? 'Sending...' : 'Send'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}