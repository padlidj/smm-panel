import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminBalanceReportPage({ searchParams }: { searchParams: { from?: string; to?: string; search?: string; user?: string; type?: string; action?: string } }) {
  await requireAdmin();

  const from = searchParams.from ? new Date(searchParams.from + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = searchParams.to ? new Date(searchParams.to + 'T23:59:59') : new Date();

  const where: any = { created_at: { gte: from, lte: to } };
  if (searchParams.user) where.user = { username: { contains: searchParams.user } };
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.action) where.action = { contains: searchParams.action };
  if (searchParams.search) {
    const n = parseInt(searchParams.search, 10);
    where.OR = [
      ...(String(n) === searchParams.search.trim() ? [{ id: n }] : []),
      { type: { contains: searchParams.search, mode: 'insensitive' } },
      { action: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { user: { username: { contains: searchParams.search, mode: 'insensitive' } } },
    ];
  }

  const logs = await prisma.balanceLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 200,
    include: { user: { select: { username: true } } },
  });

  // Laravel sums over the WHOLE filtered set, not the 200-row sample
  const [plus, minus] = await Promise.all([
    prisma.balanceLog.aggregate({ where: { ...where, type: 'PLUS' }, _sum: { amount: true } }),
    prisma.balanceLog.aggregate({ where: { ...where, type: 'MINUS' }, _sum: { amount: true } }),
  ]);
  const totalIn = Number(plus._sum.amount || 0);
  const totalOut = Number(minus._sum.amount || 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Mutasi Saldo User</h1>

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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">User</label>
              <Input name="user" placeholder="username" defaultValue={searchParams.user || ''} className="w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipe</label>
              <select name="type" defaultValue={searchParams.type || ''} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                <option value="">All</option>
                <option value="PLUS">Plus</option>
                <option value="MINUS">Minus</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Aksi</label>
              <Input name="action" placeholder="e.g. ORDER" defaultValue={searchParams.action || ''} className="w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input name="search" placeholder="ID/desc/amount" defaultValue={searchParams.search || ''} className="w-44" />
            </div>
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Masuk', value: `Rp ${totalIn.toLocaleString('id-ID')}`, cls: 'text-success' },
          { label: 'Total Keluar', value: `Rp ${totalOut.toLocaleString('id-ID')}`, cls: 'text-destructive' },
          { label: 'Selisih', value: `Rp ${(totalIn - totalOut).toLocaleString('id-ID')}`, cls: '' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Riwayat Mutasi (max 200)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Saldo Awal</TableHead>
                <TableHead>Saldo Akhir</TableHead>
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l.user.username}</TableCell>
                  <TableCell className={l.type === 'PLUS' ? 'text-success font-medium' : 'text-destructive font-medium'}>{l.type}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>Rp {Number(l.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(l.balance_before).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(l.balance_after).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}