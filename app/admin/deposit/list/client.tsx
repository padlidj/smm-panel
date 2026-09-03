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
import { Toast } from '@/components/ui/toast';
import { confirmDelete } from '@/lib/admin-client';

const PER_PAGE = 20;

export function DepositListClient({ deposits, total, page, status }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [error, setError] = useState('');
  const totalPages = Math.ceil(total / PER_PAGE);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', SUCCESS: 'success', FAILED: 'destructive', EXPIRED: 'outline' };
    return map[s] || 'outline';
  };

  const approve = async (d: any) => {
    setError('');
    const res = await fetch('/api/admin/deposit/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <Link href="/admin/deposit/method/list"><Button variant="secondary">Methods</Button></Link>
      </div>
      {error && <Toast type="error" message={error} />}
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <Select value={st} onChange={e => { setSt(e.target.value); router.push(`/admin/deposit/list${e.target.value ? `?status=${e.target.value}` : ''}`); }} className="max-w-40">
            <option value="">All Status</option>
            {['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'].map(s => <option key={s} value={s}>{s}</option>)}
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
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.user.username}</TableCell>
                  <TableCell>{d.method}</TableCell>
                  <TableCell>Rp {Number(d.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.fee).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.net).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(d.status) as any}>{d.status}</Badge></TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    {d.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => approve(d)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          const r = await fetch('/api/admin/deposit/cancel', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id }) });
                          if (r.ok) router.refresh();
                        }}>Cancel</Button>
                        <Link href={`/admin/deposit/detail/${d.id}`}><Button variant="outline" size="sm">Detail</Button></Link>
                      </div>
                    )}
                    {d.status !== 'PENDING' && <Link href={`/admin/deposit/detail/${d.id}`}><Button variant="outline" size="sm">Detail</Button></Link>}
                    {d.status !== 'PENDING' && d.status !== 'SUCCESS' && <Button variant="destructive" size="sm" className="ml-1" onClick={confirmDelete('/api/admin/deposit/delete', d.id)}>Hapus</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {deposits.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No deposits</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/deposit/list?page=${p}${status ? `&status=${status}` : ''}`)} />
      </Card>
    </div>
  );
}