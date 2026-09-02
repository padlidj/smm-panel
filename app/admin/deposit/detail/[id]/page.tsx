import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DepositDetailClient } from './client';

export const dynamic = 'force-dynamic';

export default async function DepositDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const id = Number(params.id);
  const deposit = await prisma.deposit.findUnique({ where: { id }, include: { user: { select: { username: true, email: true } } } });
  if (!deposit) return <div className="text-center py-16 text-muted-foreground">Deposit tidak ditemukan</div>;

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', SUCCESS: 'success', FAILED: 'destructive', EXPIRED: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detail Deposit #{deposit.id}</h1>
          <p className="text-sm text-muted-foreground">Info lengkap transaksi deposit</p>
        </div>
        <div className="flex gap-2">
          <DepositDetailClient deposit={deposit} user={deposit.user} />
          <Link href="/admin/deposit/list"><Button variant="secondary">Kembali</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informasi Deposit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'ID', value: `#${deposit.id}` },
              { label: 'Metode', value: deposit.method },
              { label: 'Jumlah', value: `Rp ${Number(deposit.amount).toLocaleString('id-ID')}` },
              { label: 'Fee', value: `Rp ${Number(deposit.fee).toLocaleString('id-ID')}` },
              { label: 'Net', value: `Rp ${Number(deposit.net).toLocaleString('id-ID')}` },
              { label: 'Status', value: deposit.status },
              { label: 'IP Address', value: deposit.ip_address || '-' },
              { label: 'Dibuat', value: new Date(deposit.created_at).toLocaleString('id-ID') },
              { label: 'Diupdate', value: new Date(deposit.updated_at).toLocaleString('id-ID') },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="text-sm font-medium">{i.label === 'Status' ? <Badge variant={statusColor(i.value) as any}>{i.value}</Badge> : i.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Informasi User</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Username', value: deposit.user.username },
              { label: 'Email', value: deposit.user.email },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="text-sm font-medium">{i.value}</span>
              </div>
            ))}
            <Link href={`/admin/user/detail/${deposit.user_id}`}><Button variant="outline" size="sm">Lihat User</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}