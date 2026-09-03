'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { postForm } from '@/lib/admin-client';

const PER_PAGE = 20;
const STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR'];

export function RefillListClient({ refills, total, page, status }: any) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const totalPages = Math.ceil(total / PER_PAGE);

  const setStatus = async (id: number, s: string) => {
    try {
      await postForm('/api/admin/order/refill', { id, status: s });
      router.refresh();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Refills</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <Select value={st} onChange={e => { setSt(e.target.value); router.push(`/admin/order/refill/list${e.target.value ? `?status=${e.target.value}` : ''}`); }} className="max-w-40">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <TableHead>Order</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refills.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.user.username}</TableCell>
                  <TableCell>
                    <a href={`/admin/order/detail/${r.order_id}`} className="text-primary hover:underline">#{r.order_id}</a>
                    <span className="text-muted-foreground text-xs"> {r.order.service_name}</span>
                  </TableCell>
                  <TableCell className="max-w-32 truncate">{r.target}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{new Intl.NumberFormat('id-ID').format(Number(r.price))}</TableCell>
                  <TableCell>
                    <Select value={r.status} onChange={e => setStatus(r.id, e.target.value)} className="text-xs max-w-32">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {refills.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/order/refill/list?page=${p}${st ? `&status=${st}` : ''}`)} />
    </div>
  );
}
