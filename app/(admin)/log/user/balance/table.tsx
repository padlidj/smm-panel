'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function BalanceLogTable({ logs, total, page, filters }: any) {
  const router = useRouter();
  const [tp, setTp] = useState(filters?.type || '');
  const [un, setUn] = useState(filters?.username || '');
  const totalPages = Math.ceil(total / PER_PAGE);

  const filter = () => {
    const params = new URLSearchParams();
    if (tp) params.set('type', tp);
    if (un) params.set('username', un);
    router.push(`/admin/log/user/balance?${params}`);
  };

  const paginate = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (filters?.type) params.set('type', filters.type);
    if (filters?.username) params.set('username', filters.username);
    router.push(`/admin/log/user/balance?${params}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Balance Logs</h1>
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={tp} onChange={e => setTp(e.target.value)} className="max-w-40">
              <option value="">All Types</option>
              <option value="PLUS">Plus</option>
              <option value="MINUS">Minus</option>
            </Select>
            <Input placeholder="Username..." value={un} onChange={e => setUn(e.target.value)} className="max-w-40" />
            <Button onClick={filter}>Filter</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l.user.username}</TableCell>
                  <TableCell><Badge variant={l.type === 'PLUS' ? 'success' : 'destructive'}>{l.type}</Badge></TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>Rp {Number(l.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(l.balance_after).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="max-w-48 truncate">{l.description || '-'}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No logs</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={paginate} />
      </Card>
    </div>
  );
}