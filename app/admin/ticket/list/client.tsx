'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';
import { confirmDelete, postForm } from '@/lib/admin-client';

const PER_PAGE = 20;

export function TicketListClient({ tickets, total, page, status, users }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ user_id: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const totalPages = Math.ceil(total / PER_PAGE);

  const send = async () => {
    if (!form.user_id || !form.subject || !form.message) return setSendErr('Semua field wajib diisi.');
    setSendErr(''); setSending(true);
    try {
      await postForm('/api/admin/ticket/send', form);
      setForm({ user_id: '', subject: '', message: '' });
      setShowSend(false);
      router.refresh();
    } catch (e: any) { setSendErr(e.message); }
    setSending(false);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { OPEN: 'destructive', REPLIED: 'default', CLOSED: 'secondary' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Button onClick={() => setShowSend(v => !v)}>{showSend ? 'Tutup' : 'Buka Ticket ke User'}</Button>
      </div>
      {showSend && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Buka Ticket Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">Pilih user...</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </Select>
            <Input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            <textarea className="w-full rounded-md border bg-transparent p-3 text-sm min-h-24" placeholder="Pesan..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            {sendErr && <Toast type="error" message={sendErr} />}
            <Button onClick={send} disabled={sending}>{sending ? 'Mengirim...' : 'Kirim'}</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <Select value={st} onChange={e => { setSt(e.target.value); router.push(`/admin/ticket/list${e.target.value ? `?status=${e.target.value}` : ''}`); }} className="max-w-40">
            <option value="">All Status</option>
            {['OPEN', 'REPLIED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell>{t.user.username}</TableCell>
                  <TableCell className="max-w-64 truncate">{t.subject}</TableCell>
                  <TableCell>{t._count.replies}</TableCell>
                  <TableCell><Badge variant={statusColor(t.status) as any}>{t.status}</Badge></TableCell>
                  <TableCell>{new Date(t.updated_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Link href={`/admin/ticket/${t.id}`}><Button variant="secondary" size="sm">View & Reply</Button></Link><Button variant="destructive" size="sm" className="ml-1" onClick={confirmDelete('/api/admin/ticket/delete', t.id)}>Hapus</Button></TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No tickets</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/ticket/list?page=${p}${status ? `&status=${status}` : ''}`)} />
      </Card>
    </div>
  );
}