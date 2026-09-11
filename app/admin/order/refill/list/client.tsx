'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { postForm, confirmDelete } from '@/lib/admin-client';

const PER_PAGE = 20;
const STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR'];

export function RefillListClient({ refills, total, page, query }: any) {
  const router = useRouter();
  const q = query || {};
  const [form, setForm] = useState({ status: q.status || '', user: q.user || '', service: q.service || '', search: q.search || '', start_date: q.start_date || '', end_date: q.end_date || '' });
  const totalPages = Math.ceil(total / PER_PAGE);

  const qs = (extra: Record<string, string> = {}) => {
    const merged = { ...form, ...extra };
    const p = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]);
    return p.toString() ? `?${p}` : '';
  };

  const setStatus = async (id: number, s: string) => {
    try {
      await postForm('/api/admin/order/refill', { id, status: s });
      router.refresh();
    } catch (e: any) { alert(e.message); }
  };

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Refills</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); router.push(`/admin/order/refill/list${qs()}`); }}>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onChange={e => set('status', e.target.value)} className="max-w-36">
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">User</label>
              <Input className="max-w-36" placeholder="username" value={form.user} onChange={e => set('user', e.target.value)} />
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Layanan</label>
              <Input className="max-w-36" placeholder="service name" value={form.service} onChange={e => set('service', e.target.value)} />
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Cari</label>
              <Input className="max-w-36" placeholder="ID / target / order" value={form.search} onChange={e => set('search', e.target.value)} />
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Dari</label>
              <Input type="date" className="max-w-36" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Sampai</label>
              <Input type="date" className="max-w-36" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <Button type="submit">Cari</Button>
            <Button type="button" variant="outline" onClick={() => { const empty = { status: '', user: '', service: '', search: '', start_date: '', end_date: '' }; setForm(empty); router.push('/admin/order/refill/list'); }}>Reset</Button>
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
                <TableHead>Order</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
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
                  <TableCell><Button variant="destructive" size="sm" onClick={confirmDelete('/api/admin/order/refill/delete', r.id)}>Hapus</Button></TableCell>
                </TableRow>
              ))}
              {refills.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/order/refill/list${qs({ page: String(p) })}`)} />
    </div>
  );
}
