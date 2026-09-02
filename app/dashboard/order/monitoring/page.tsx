import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: { service?: string; date?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const date = searchParams.date || new Date().toISOString().slice(0, 10);
  const serviceName = searchParams.service?.trim() || '';

  const dayStart = new Date(`${date}T00:00:00+07:00`);
  const dayEnd = new Date(`${date}T23:59:59.999+07:00`);

  const services = await prisma.order.findMany({
    where: { status: 'SUCCESS', created_at: { gte: dayStart, lte: dayEnd } },
    orderBy: { created_at: 'asc' },
    select: { service_id: true, service_name: true },
    distinct: ['service_id'],
  });

  const orders = await prisma.order.findMany({
    where: {
      status: 'SUCCESS',
      created_at: { gte: dayStart, lte: dayEnd },
      ...(serviceName ? { service_name: { contains: serviceName, mode: 'insensitive' } } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  const totalQty = orders.reduce((sum, o) => sum + o.quantity, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Monitoring Layanan</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-1">
          <label className="text-sm font-medium">Layanan</label>
          <select name="service" className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-64">
            <option value="">Semua layanan</option>
            {services.map((s) => (
              <option key={s.service_id} value={s.service_name} selected={serviceName === s.service_name}>
                {s.service_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Tanggal</label>
          <input type="date" name="date" defaultValue={date} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Filter</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Sukses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Kuantitas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalQty.toLocaleString('id-ID')}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Order Sukses — {new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada order sukses pada tanggal ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">ID</th>
                    <th className="py-2 pr-4 font-medium">Layanan</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 pr-4 font-medium text-right">Qty</th>
                    <th className="py-2 pr-4 font-medium text-right">Harga</th>
                    <th className="py-2 font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 pr-4"><Link href={`/dashboard/order/detail/${o.id}`} className="text-primary">#{o.id}</Link></td>
                      <td className="py-2 pr-4 max-w-64 truncate">{o.service_name}</td>
                      <td className="py-2 pr-4 max-w-48 truncate">{o.target}</td>
                      <td className="py-2 pr-4 text-right">{o.quantity.toLocaleString('id-ID')}</td>
                      <td className="py-2 pr-4 text-right">Rp {Number(o.price).toLocaleString('id-ID')}</td>
                      <td className="py-2">{new Date(o.created_at).toLocaleTimeString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}