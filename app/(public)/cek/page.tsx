import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function CekPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = parseInt(searchParams.id || '');
  const order = Number.isInteger(id) && id > 0
    ? await prisma.order.findUnique({
        where: { id },
        select: { id: true, service_name: true, quantity: true, remains: true, status: true, created_at: true },
      })
    : null;

  const statusColor: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive', PARTIAL: 'outline' };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Cek Pesanan</CardTitle>
        <CardDescription>Masukkan ID pesanan untuk melihat status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex gap-2">
          <Input type="number" name="id" placeholder="ID pesanan" defaultValue={id || ''} required />
          <Button type="submit">Cek</Button>
        </form>
        {searchParams.id && !order && <p className="text-center text-sm text-destructive">Pesanan tidak ditemukan.</p>}
        {order && (
          <div className="rounded-md border divide-y text-sm">
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">ID</span><span className="font-medium">#{order.id}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Layanan</span><span className="font-medium max-w-48 truncate">{order.service_name}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Jumlah</span><span>{order.quantity}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Sisa</span><span>{order.remains}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Status</span><Badge variant={statusColor[order.status] as any}>{order.status}</Badge></div>
            <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Tanggal</span><span>{new Date(order.created_at).toLocaleString('id-ID')}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
