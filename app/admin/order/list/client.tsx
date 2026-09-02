'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function OrderListClient({ orders, total, page, status, username, from, to }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [un, setUn] = useState(username);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const totalPages = Math.ceil(total / PER_PAGE);

  const filter = () => {
    const params = new URLSearchParams();
    if (st) params.set('status', st);
    if (un) params.set('username', un);
    if (f) params.set('from', f);
    if (t) params.set('to', t);
    router.push(`/admin/order/list?${params}`);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={st} onChange={e => setSt(e.target.value)} className="max-w-40">
              <option value="">All Status</option>
              {['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input placeholder="Username..." value={un} onChange={e => setUn(e.target.value)} className="max-w-40" />
            <Input type="date" value={f} onChange={e => setF(e.target.value)} className="max-w-40" />
            <Input type="date" value={t} onChange={e => setT(e.target.value)} className="max-w-40" />
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
                <TableHead>Service</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Remains</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.user.username}</TableCell>
                  <TableCell className="max-w-40 truncate">{o.service_name}</TableCell>
                  <TableCell className="max-w-32 truncate">{o.target}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>Rp {Number(o.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{o.remains}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Link href={`/admin/order/detail/${o.id}`}><Button variant="secondary" size="sm">View</Button></Link></TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No orders found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/order/list?page=${p}${st ? `&status=${st}` : ''}${un ? `&username=${un}` : ''}${f ? `&from=${f}` : ''}${t ? `&to=${t}` : ''}`)} />
      </Card>
    </div>
  );
}