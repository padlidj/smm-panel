import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function OrderReportPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  if (!session || !userId) redirect('/auth/login');

  const from = searchParams.from ? new Date(searchParams.from + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = searchParams.to ? new Date(searchParams.to + 'T23:59:59') : new Date();

  const orders = await prisma.order.findMany({
    where: { user_id: userId, created_at: { gte: from, lte: to } },
    orderBy: { created_at: 'desc' },
    select: { id: true, service_name: true, quantity: true, price: true, profit: true, status: true, created_at: true },
  });

  const total = orders.reduce((a, o) => a + Number(o.price), 0);
  const totalProfit = orders.reduce((a, o) => a + Number(o.profit), 0);
  const totalQty = orders.reduce((a, o) => a + o.quantity, 0);

  const byDay = new Map<string, { count: number; qty: number; total: number; profit: number }>();
  orders.forEach(o => {
    const d = new Date(o.created_at).toISOString().slice(0, 10);
    const cur = byDay.get(d) || { count: 0, qty: 0, total: 0, profit: 0 };
    cur.count++; cur.qty += o.quantity; cur.total += Number(o.price); cur.profit += Number(o.profit);
    byDay.set(d, cur);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Order</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filter Tanggal</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dari</label>
              <Input type="date" name="from" defaultValue={searchParams.from || from.toISOString().slice(0, 10)} className="w-44" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sampai</label>
              <Input type="date" name="to" defaultValue={searchParams.to || new Date().toISOString().slice(0, 10)} className="w-44" />
            </div>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Order', value: String(orders.length) },
          { label: 'Total Kuantitas', value: totalQty.toLocaleString('id-ID') },
          { label: 'Total Pengeluaran', value: `Rp ${total.toLocaleString('id-ID')}` },
          { label: 'Total Profit', value: `Rp ${totalProfit.toLocaleString('id-ID')}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Rekap Harian</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Kuantitas</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([d, v]) => (
                <TableRow key={d}>
                  <TableCell>{new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                  <TableCell>{v.count}</TableCell>
                  <TableCell>{v.qty.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {v.total.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {v.profit.toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {byDay.size === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tidak ada data pada rentang tanggal ini</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}