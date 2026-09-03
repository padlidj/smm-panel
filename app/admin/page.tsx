import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, ShoppingCart, CreditCard, Wallet } from 'lucide-react';
import { RevenueChart } from '@/components/dashboard/revenue-chart';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') redirect('/auth/login');

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [totalUsers, ordersThisMonth, pendingDeposits, totalBalance, monthOrders, recentOrders] = await Promise.all([
    prisma.user.count(),
    prisma.order.count({ where: { created_at: { gte: startOfMonth } } }),
    prisma.deposit.count({ where: { status: 'PENDING' } }),
    prisma.user.aggregate({ _sum: { balance: true } }),
    prisma.order.findMany({ where: { created_at: { gte: startOfMonth } }, select: { price: true, created_at: true } }),
    prisma.order.findMany({ orderBy: { created_at: 'desc' }, take: 10, include: { user: { select: { username: true } } } }),
  ]);

  // Revenue last 14 days
  const revenueMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    revenueMap.set(d.toLocaleDateString('en-CA'), 0);
  }
  for (const o of monthOrders) {
    const d = new Date(o.created_at).toLocaleDateString('en-CA');
    if (revenueMap.has(d)) revenueMap.set(d, (revenueMap.get(d) || 0) + Number(o.price));
  }
  const chartData = [...revenueMap.entries()].map(([date, total]) => ({ date: date.slice(8) + '/' + date.slice(5, 7), total }));

  const stats = [
    { label: 'Total Users', value: totalUsers.toLocaleString('id-ID'), icon: Users, color: 'text-blue-500' },
    { label: 'Orders (Month)', value: ordersThisMonth.toLocaleString('id-ID'), icon: ShoppingCart, color: 'text-emerald-500' },
    { label: 'Pending Deposits', value: pendingDeposits.toLocaleString('id-ID'), icon: CreditCard, color: 'text-amber-500' },
    { label: 'Total Balance', value: `Rp ${Number(totalBalance._sum.balance || 0).toLocaleString('id-ID')}`, icon: Wallet, color: 'text-violet-500' },
  ];

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue (14 Hari)</CardTitle></CardHeader>
        <CardContent><RevenueChart data={chartData} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Orders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.user.username}</TableCell>
                  <TableCell className="max-w-40 truncate">{o.service_name}</TableCell>
                  <TableCell className="max-w-32 truncate">{o.target}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>Rp {Number(o.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                </TableRow>
              ))}
              {recentOrders.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No orders yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}