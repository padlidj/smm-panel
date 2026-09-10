'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { postForm, confirmDelete } from '@/lib/admin-client';

const PER_PAGE = 20;

export function ServiceListClient({ services, total, page, per = PER_PAGE, filters, categories, providers }: any) {
  const router = useRouter();

  const qp = new URLSearchParams(Object.entries(filters || {}).filter(([k, v]) => k !== 'page' && v).map(([k, v]) => [k, String(v)])).toString();

  const toggle = async (s: any) => {
    await postForm('/api/admin/service', {
      id: s.id, category_id: s.category_id, provider_id: s.provider_id, name: s.name, type: s.type,
      price: s.price, profit: s.profit, min: s.min, max: s.max, status: !s.status,
      provider_service_id: s.provider_service_id, refill_provider_service_id: s.refill_provider_service_id,
    });
    router.refresh();
  };

  const totalPages = Math.ceil(total / per);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <Link href="/admin/service/form/0"><Button>New Service</Button></Link>
      </div>
      <Card>
        {/* Laravel filter.blade parity: search, category, provider, status, type, refill_support */}
        <CardContent className="p-3">
          <form className="flex flex-wrap items-center gap-2" action="/admin/service/list" method="get">
            <Input name="search" defaultValue={filters?.search || ''} placeholder="Search name or ID..." className="w-48" />
            <select name="filter_category" defaultValue={filters?.filter_category || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All Categories</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="filter_provider" defaultValue={filters?.filter_provider || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All Providers</option>
              {providers?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="filter_status" defaultValue={filters?.filter_status || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All Status</option><option value="1">Active</option><option value="0">Inactive</option>
            </select>
            <select name="filter_type" defaultValue={filters?.filter_type || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All Types</option>
              {['DEFAULT', 'COMMENT_LIKES', 'CUSTOM_COMMENTS', 'SUBSCRIPTIONS'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="refill_support" defaultValue={filters?.refill_support || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Refill: All</option><option value="1">Refill</option><option value="0">No Refill</option>
            </select>
            <select name="filter_row" defaultValue={filters?.filter_row || ''} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">20/row</option>{[10, 30, 50, 100].map(n => <option key={n} value={n}>{n}/row</option>)}
            </select>
            <Button type="submit" size="sm">Filter</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell className="max-w-48 truncate">{s.name}</TableCell>
                  <TableCell>{s.category.name}</TableCell>
                  <TableCell>{s.provider.name}</TableCell>
                  <TableCell>Rp {s.price.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {s.profit.toLocaleString('id-ID')}</TableCell>
                  <TableCell>{s.min}/{s.max}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell><Badge variant={s.status ? 'success' : 'destructive'}>{s.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/admin/service/form/${s.id}`}><Button variant="secondary" size="sm">Edit</Button></Link>
                    <Link href={`/admin/order/list?service_id=${s.id}`}><Button variant="secondary" size="sm">Orders</Button></Link>
                    <Button variant="secondary" size="sm" onClick={() => toggle(s)}>Toggle</Button>
                    <Button variant="destructive" size="sm" onClick={confirmDelete('/api/admin/service/delete', s.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No services</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/service/list?page=${p}${qp ? '&' + qp : ''}`)} />
      </Card>
    </div>
  );
}