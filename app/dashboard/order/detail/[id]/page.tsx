import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  const order = await prisma.order.findUnique({ where: { id: parseInt(params.id) } });
  if (!order || order.user_id !== userId) return <div className="text-center text-muted-foreground">Order not found</div>;

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  const rows = [
    ['ID', String(order.id)],
    ['Service', order.service_name],
    ['Target', order.target],
    ['Quantity', String(order.quantity)],
    ['Price', `Rp ${Number(order.price).toLocaleString('id-ID')}`],
    ['Remains', String(order.remains)],
    ['Start Count', String(order.start_count)],
    ['Status', order.status],
    ['Created', new Date(order.created_at).toLocaleString('id-ID')],
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/order/history"><Button variant="ghost" size="sm">&larr; Back</Button></Link>
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={k === 'Status' ? '' : 'font-medium'}>{k === 'Status' ? <Badge variant={statusColor(v) as any}>{v}</Badge> : v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {order.status === 'SUCCESS' && (
        <Link href={`/dashboard/order/refill/new/${order.id}`}><Button variant="secondary">Request Refill</Button></Link>
      )}
    </div>
  );
}