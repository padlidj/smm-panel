import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function RefillDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  if (!session || !userId) redirect('/auth/login');

  const refill = await prisma.orderRefill.findUnique({
    where: { id: Number(params.id) },
    include: { order: { select: { id: true, service_name: true, target: true, quantity: true, status: true } } },
  });
  if (!refill || refill.user_id !== userId) return <div className="text-center py-16 text-muted-foreground">Refill tidak ditemukan</div>;

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Detail Refill #{refill.id}</h1>
        <p className="text-sm text-muted-foreground">Riwayat refill pesanan</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Informasi Refill</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Order ID', value: `#${refill.order_id}` },
            { label: 'Layanan', value: refill.order.service_name },
            { label: 'Target', value: refill.target },
            { label: 'Jumlah', value: String(refill.quantity) },
            { label: 'Harga', value: `Rp ${Number(refill.price).toLocaleString('id-ID')}` },
            { label: 'Status', value: refill.status },
            { label: 'Provider Refill ID', value: refill.provider_refill_id || '-' },
            { label: 'Tanggal', value: new Date(refill.created_at).toLocaleString('id-ID') },
          ].map(i => (
            <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span className="text-sm text-muted-foreground">{i.label}</span>
              <span className="text-sm font-medium">
                {i.label === 'Status' ? <Badge variant={statusColor(i.value) as any}>{i.value}</Badge> : i.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}