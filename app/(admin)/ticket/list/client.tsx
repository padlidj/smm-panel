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

const PER_PAGE = 20;

export function TicketListClient({ tickets, total, page, status }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const totalPages = Math.ceil(total / PER_PAGE);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { OPEN: 'destructive', REPLIED: 'default', CLOSED: 'secondary' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tickets</h1>
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
                  <TableCell><Link href={`/admin/ticket/${t.id}`}><Button variant="secondary" size="sm">View & Reply</Button></Link></TableCell>
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