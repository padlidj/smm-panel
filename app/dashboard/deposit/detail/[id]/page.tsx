import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DepositDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  if (!session || !userId) redirect('/auth/login');

  const deposit = await prisma.deposit.findUnique({ where: { id: Number(params.id) } });
  if (!deposit || deposit.user_id !== userId) return <div className="text-center py-16 text-muted-foreground">Deposit tidak ditemukan</div>;

  const method = await prisma.depositMethod.findFirst({ where: { method: deposit.method, status: true } });

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', SUCCESS: 'success', FAILED: 'destructive', EXPIRED: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Detail Deposit #{deposit.id}</h1>
        <p className="text-sm text-muted-foreground">Transaksi deposit Anda</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Informasi Deposit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Metode', value: deposit.method },
            { label: 'Jumlah', value: `Rp ${Number(deposit.amount).toLocaleString('id-ID')}` },
            { label: 'Fee', value: `Rp ${Number(deposit.fee).toLocaleString('id-ID')}` },
            { label: 'Net', value: `Rp ${Number(deposit.net).toLocaleString('id-ID')}` },
            { label: 'Status', value: deposit.status },
            { label: 'Tanggal', value: new Date(deposit.created_at).toLocaleString('id-ID') },
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
      {method && deposit.status === 'PENDING' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="text-primary">Instruksi Pembayaran</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Transfer ke rekening <strong>{method.payment}</strong> dengan nominal <strong>Rp {Number(deposit.amount).toLocaleString('id-ID')}</strong>.</p>
            {Number(method.min) > 0 && <p>Minimal deposit: Rp {Number(method.min).toLocaleString('id-ID')}</p>}
            <p className="text-muted-foreground">Deposit akan diproses otomatis setelah pembayaran terverifikasi. Hubungi admin jika ada kendala.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}