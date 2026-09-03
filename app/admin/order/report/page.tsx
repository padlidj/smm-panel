import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminOrderReportPage({ searchParams }: { searchParams: { from?: string; to?: string; username?: string; status?: string } }) {
  await requireAdmin();
  const from = searchParams.from ? new Date(searchParams.from + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = searchParams.to ? new Date(searchParams.to + 'T23:59:59') : new Date();

  const where: any = { created_at: { gte: from, lte: to } };
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.username) where.user = { username: { contains: searchParams.username } };

  const orders = await prisma.order.findMany({
    where, orderBy: { created_at: 'desc' }, take: 1000,
    select: { id: true, service_name: true, quantity: true, price: true, profit: true, status: true, created_at: true, user: { select: { username: true } } },
  });

  const total = orders.reduce((a, o) => a + Number(o.price), 0);
  const totalProfit = orders.reduce((a, o) => a + Number(o.profit), 0);
  const success = orders.filter(o => o.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Order</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filter</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Dari</label>
              <Input type="date" name="from" defaultValue={searchParams.from || from.toISOString().slice(0, 10)} className="w-44" /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Sampai</label>
              <Input type="date" name="to" defaultValue={searchParams.to || new Date().toISOString().slice(0, 10)} className="w-44" /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Username</label>
              <Input name="username" defaultValue={searchParams.username || ''} className="w-40" placeholder="semua user" /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
              <Select name="status" defaultValue={searchParams.status || ''} className="w-40">
                <option value="">Semua</option>
                {['PENDING', 'PROCESSING', 'SUCCESS', 'ERROR', 'PARTIAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select></div>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Order', value: String(orders.length) },
          { label: 'Success', value: String(success) },
          { label: 'Omzet', value: `Rp ${total.toLocaleString('id-ID')}` },
          { label: 'Profit', value: `Rp ${totalProfit.toLocaleString('id-ID')}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Detail Order</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>User</TableHead><TableHead>Service</TableHead>
                <TableHead>Qty</TableHead><TableHead>Harga</TableHead><TableHead>Profit</TableHead>
                <TableHead>Status</TableHead><TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.user.username}</TableCell>
                  <TableCell className="max-w-48 truncate">{o.service_name}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>Rp {Number(o.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(o.profit).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data pada rentang ini</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
