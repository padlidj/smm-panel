import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: Number((session?.user as any)?.id) },
    include: { _count: { select: { orders: true, tickets: true } } },
  });
  if (!user) redirect('/auth/login');

  const [totalOrder, successOrder, totalSpend, recentOrders] = await Promise.all([
    prisma.order.count({ where: { user_id: user.id } }),
    prisma.order.count({ where: { user_id: user.id, status: 'SUCCESS' } }),
    prisma.order.aggregate({ where: { user_id: user.id }, _sum: { price: true } }),
    prisma.order.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'desc' }, take: 5 }),
  ]);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  const stats = [
    { label: 'Balance', value: `Rp ${Number(user.balance).toLocaleString('id-ID')}`, href: '/dashboard/deposit/new' },
    { label: 'Total Orders', value: String(totalOrder), href: '/dashboard/order/history' },
    { label: 'Success Orders', value: String(successOrder), href: '/dashboard/order/history' },
    { label: 'Total Spent', value: `Rp ${Number(totalSpend._sum?.price || 0).toLocaleString('id-ID')}`, href: '/dashboard/order/history' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.username}</h1>
          <p className="text-sm text-muted-foreground">Manage your orders and account.</p>
        </div>
        <Link href="/dashboard/order/new"><Button>New Order</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardHeader><CardTitle className="text-sm text-muted-foreground font-medium">{s.label}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No orders yet.</p>
              <Link href="/dashboard/order/new" className="inline-block mt-2"><Button variant="secondary">Create your first order</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <Link key={o.id} href={`/dashboard/order/detail/${o.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#{o.id} - {o.service_name}</div>
                    <div className="text-xs text-muted-foreground">{o.target} × {o.quantity} · {new Date(o.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium">Rp {Number(o.price).toLocaleString('id-ID')}</span>
                    <Badge variant={statusColor(o.status) as any}>{o.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}