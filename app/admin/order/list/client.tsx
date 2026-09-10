'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { confirmDelete } from '@/lib/admin-client';

const PER_PAGE = 20;

export function OrderListClient({ orders, total, page, filters, service_id }: any) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PER_PAGE);
  const f = filters || {};
  const qp = new URLSearchParams(Object.entries(f).filter(([k, v]) => k !== 'page' && v).map(([k, v]) => [k, String(v)])).toString();

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <Card>
        <CardContent className="p-3">
          {/* Laravel OrderDataTable filter parity */}
          <form className="flex flex-wrap items-center gap-2" action="/admin/order/list" method="get">
            {service_id ? <input type="hidden" name="service_id" value={service_id} /> : null}
            <Input name="search" defaultValue={f.search || ''} placeholder="Cari ID / target / provider order / user / service" className="h-10 w-72" />
            <select name="filter_status" defaultValue={f.filter_status || f.status || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Status: All</option>
              {['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input name="filter_user" defaultValue={f.filter_user || f.username || ''} placeholder="User" className="h-10 w-32" />
            <Input name="filter_service" defaultValue={f.filter_service || ''} placeholder="Layanan" className="h-10 w-40" />
            <Input name="filter_service_provider" defaultValue={f.filter_service_provider || ''} placeholder="Provider" className="h-10 w-36" />
            <select name="filter_is_api" defaultValue={f.filter_is_api || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Sumber: All</option><option value="1">API</option><option value="0">WEB</option>
            </select>
            <Input type="date" name="filter_start_date" defaultValue={f.filter_start_date || f.from || ''} className="h-10 w-40" />
            <Input type="date" name="filter_end_date" defaultValue={f.filter_end_date || f.to || ''} className="h-10 w-40" />
            <Button type="submit" size="sm">Filter</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => router.push('/admin/order/list')}>Reset</Button>
          </form>
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
                  <TableCell><Link href={`/admin/order/detail/${o.id}`}><Button variant="secondary" size="sm">View</Button></Link><Button variant="destructive" size="sm" className="ml-1" onClick={confirmDelete('/api/admin/order/delete', o.id)}>Hapus</Button></TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No orders found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/order/list?page=${p}${qp ? '&' + qp : ''}`)} />
      </Card>
    </div>
  );
}
