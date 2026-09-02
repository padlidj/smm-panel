import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: parseInt(params.id) }, include: { user: { select: { username: true, email: true } }, order_refills: true } });
  if (!order) return <div className="text-center text-muted-foreground">Order not found</div>;

  const rows = [
    ['ID', String(order.id)],
    ['User', `${order.user.username} (${order.user.email})`],
    ['Service', order.service_name],
    ['Provider ID', String(order.provider_id)],
    ['Target', order.target],
    ['Quantity', String(order.quantity)],
    ['Price', `Rp ${Number(order.price).toLocaleString('id-ID')}`],
    ['Profit', `Rp ${Number(order.profit).toLocaleString('id-ID')}`],
    ['Remains', String(order.remains)],
    ['Start Count', String(order.start_count)],
    ['Status', order.status],
    ['Refund', order.is_refund ? 'Yes' : 'No'],
    ['Provider Order ID', order.provider_order_id || '-'],
    ['Created', new Date(order.created_at).toLocaleString('id-ID')],
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Order #{order.id}</h1>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={k === 'Status' ? '' : 'font-medium'}>{k === 'Status' ? <Badge>{v}</Badge> : v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {order.order_refills.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Refills</CardTitle></CardHeader>
          <CardContent>
            {order.order_refills.map(r => (
              <div key={r.id} className="flex justify-between border-b py-2 text-sm">
                <span>#{r.id} - {r.target} x{r.quantity} ({r.status})</span>
                <span>{new Date(r.created_at).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}