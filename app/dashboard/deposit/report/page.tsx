import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function DepositReportPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  if (!session || !userId) redirect('/auth/login');

  const from = searchParams.from ? new Date(searchParams.from + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = searchParams.to ? new Date(searchParams.to + 'T23:59:59') : new Date();

  const deposits = await prisma.deposit.findMany({
    where: { user_id: userId, created_at: { gte: from, lte: to } },
    orderBy: { created_at: 'desc' },
    select: { id: true, method: true, amount: true, fee: true, net: true, status: true, created_at: true },
  });

  const total = deposits.reduce((a, d) => a + Number(d.amount), 0);
  const totalNet = deposits.reduce((a, d) => a + Number(d.net), 0);
  const success = deposits.filter(d => d.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Deposit</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filter Tanggal</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dari</label>
              <Input type="date" name="from" defaultValue={searchParams.from || from.toISOString().slice(0, 10)} className="w-44" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sampai</label>
              <Input type="date" name="to" defaultValue={searchParams.to || new Date().toISOString().slice(0, 10)} className="w-44" />
            </div>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Deposit', value: String(deposits.length) },
          { label: 'Berhasil', value: String(success) },
          { label: 'Total Nominal', value: `Rp ${total.toLocaleString('id-ID')}` },
          { label: 'Total Net', value: `Rp ${totalNet.toLocaleString('id-ID')}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Riwayat Deposit</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.method}</TableCell>
                  <TableCell>Rp {Number(d.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.fee).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.net).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {deposits.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data pada rentang tanggal ini</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}