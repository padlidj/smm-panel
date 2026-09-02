import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function HofPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [topOrders, topDeposits, topServices] = await Promise.all([
    prisma.order.groupBy({
      by: ['user_id'],
      where: { created_at: { gte: monthStart }, status: 'SUCCESS' },
      _sum: { price: true },
      _count: { id: true },
      orderBy: { _sum: { price: 'desc' } },
      take: 10,
    }),
    prisma.deposit.groupBy({
      by: ['user_id'],
      where: { created_at: { gte: monthStart }, status: 'SUCCESS' },
      _sum: { net: true },
      orderBy: { _sum: { net: 'desc' } },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ['service_id', 'service_name'],
      where: { created_at: { gte: monthStart }, status: 'SUCCESS' },
      _count: { id: true },
      _sum: { quantity: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const orderUsers = topOrders.length ? await prisma.user.findMany({ where: { id: { in: topOrders.map(o => o.user_id) } }, select: { id: true, username: true } }) : [];
  const depositUsers = topDeposits.length ? await prisma.user.findMany({ where: { id: { in: topDeposits.map(d => d.user_id) } }, select: { id: true, username: true } }) : [];

  const userMap = (u: { id: number; username: string }[]) => Object.fromEntries(u.map(x => [x.id, x.username]));

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  const section = (title: string, rows: any[], key: string, cols: string[]) => (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {cols.map(c => <TableHead key={c}>{c}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={cols.length + 1} className="text-center text-muted-foreground py-8">Belum ada data bulan ini</TableCell></TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-lg">{medal(i)}</TableCell>
                {key === 'order' ? (
                  <>
                    <TableCell className="font-medium">{userMap(orderUsers)[r.user_id] || `User #${r.user_id}`}</TableCell>
                    <TableCell>Rp {Number(r._sum?.price || 0).toLocaleString('id-ID')}</TableCell>
                    <TableCell>{r._count?.id || 0}x</TableCell>
                  </>
                ) : key === 'deposit' ? (
                  <>
                    <TableCell className="font-medium">{userMap(depositUsers)[r.user_id] || `User #${r.user_id}`}</TableCell>
                    <TableCell>Rp {Number(r._sum?.net || 0).toLocaleString('id-ID')}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium max-w-[250px] truncate">{r.service_name}</TableCell>
                    <TableCell>{r._count?.id || 0}x</TableCell>
                    <TableCell>{(r._sum?.quantity || 0).toLocaleString('id-ID')}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏆 Hall of Fame</h1>
        <p className="text-sm text-muted-foreground">Top 10 bulan {now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {section('Top 10 Pengeluaran Order', topOrders, 'order', ['User', 'Total', 'Order'])}
        {section('Top 10 Deposit', topDeposits, 'deposit', ['User', 'Total'])}
      </div>
      {section('Top 10 Layanan Populer', topServices, 'service', ['Layanan', 'Order', 'Total Qty'])}
    </div>
  );
}