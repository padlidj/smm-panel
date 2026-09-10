import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { requireAdmin } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

// Laravel PageController::hof: default this month, start_date/end_date override (Y-m-d)
function rangeFrom(s?: string, e?: string) {
  const now = new Date();
  const d = (v: string | undefined, fallback: Date, end = false) => {
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + (end ? 'T23:59:59' : 'T00:00:00'));
    return fallback;
  };
  const defStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: d(s, defStart), end: d(e, defEnd, true) };
}

export default async function HofPage({ searchParams }: { searchParams: { start_date?: string; end_date?: string } }) {
  await requireAdmin();
  const { start, end } = rangeFrom(searchParams.start_date, searchParams.end_date);
  const created = { gte: start, lte: end };
  const orderStatus = { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SUCCESS] };

  const [byUser, byDeposit, byService] = await Promise.all([
    prisma.order.groupBy({ by: ['user_id'], where: { status: orderStatus, created_at: created }, _sum: { price: true }, _count: { id: true }, orderBy: { _sum: { price: 'desc' } }, take: 10 }),
    prisma.deposit.groupBy({ by: ['user_id'], where: { status: 'SUCCESS', created_at: created }, _sum: { amount: true }, _count: { id: true }, orderBy: { _sum: { amount: 'desc' } }, take: 10 }),
    prisma.order.groupBy({ by: ['service_id'], where: { status: orderStatus, created_at: created }, _sum: { price: true }, _count: { id: true }, orderBy: { _sum: { price: 'desc' } }, take: 10 }),
  ]);

  const [users, services] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...new Set([...byUser.map(r => r.user_id), ...byDeposit.map(r => r.user_id)])] } }, select: { id: true, username: true, full_name: true } }),
    prisma.service.findMany({ where: { id: { in: byService.map(r => r.service_id) } }, select: { id: true, name: true } }),
  ]);
  const uName = (id: number) => { const u = users.find(x => x.id === id); return u ? `${u.username}${u.full_name ? ` (${u.full_name})` : ''}` : `#${id}`; };
  const sName = (id: number) => services.find(x => x.id === id)?.name || `#${id}`;
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const board = (title: string, rows: { label: string; amount: number; total: number }[]) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nama</TableHead><TableHead>Total</TableHead><TableHead>Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell>{r.label}</TableCell><TableCell>{r.total}</TableCell><TableCell>{rp(r.amount)}</TableCell></TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Top Terbaik (Hall of Fame)</h1>
      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Dari</label><Input type="date" name="start_date" defaultValue={searchParams.start_date || fmt(start)} className="w-44" /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Sampai</label><Input type="date" name="end_date" defaultValue={searchParams.end_date || fmt(end)} className="w-44" /></div>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {board('Top Order (per user)', byUser.map(r => ({ label: uName(r.user_id), amount: Number(r._sum.price || 0), total: r._count.id })))}
        {board('Top Deposit', byDeposit.map(r => ({ label: uName(r.user_id), amount: Number(r._sum.amount || 0), total: r._count.id })))}
        {board('Top Layanan', byService.map(r => ({ label: sName(r.service_id), amount: Number(r._sum.price || 0), total: r._count.id })))}
      </div>
    </div>
  );
}
