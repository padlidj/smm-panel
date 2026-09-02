'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 15;

export function OrderHistoryClient({ orders, total, page, status }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const totalPages = Math.ceil(total / PER_PAGE);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order History</h1>
        <Link href="/dashboard/order/new"><Button size="sm">New Order</Button></Link>
      </div>
      <div className="flex items-center gap-3">
        <Select value={st} onChange={e => { setSt(e.target.value); router.push(`/dashboard/order/history${e.target.value ? `?status=${e.target.value}` : ''}`); }} className="max-w-44">
          <option value="">All Status</option>
          {['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell className="max-w-48 truncate">{o.service_name}</TableCell>
                  <TableCell className="max-w-32 truncate">{o.target}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>Rp {Number(o.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Link href={`/dashboard/order/detail/${o.id}`}><Button variant="secondary" size="sm">View</Button></Link></TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No orders found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/dashboard/order/history?page=${p}${st ? `&status=${st}` : ''}`)} />
      </Card>
    </div>
  );
}