import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const id = Number(params.id);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true, deposits: true, tickets: true, balance_logs: true } },
      orders: { orderBy: { created_at: 'desc' }, take: 10 },
      deposits: { orderBy: { created_at: 'desc' }, take: 10 },
    },
  });

  if (!user) return <div className="text-center py-16 text-muted-foreground">User tidak ditemukan</div>;

  const statusColor = (s: string) => {
    const map: Record<string, string> = { ACTIVE: 'success', BANNED: 'destructive', UNVERIFIED: 'secondary', SUCCESS: 'success', PENDING: 'secondary', PROCESSING: 'default', ERROR: 'destructive', PARTIAL: 'outline', EXPIRED: 'outline', FAILED: 'destructive' };
    return map[s] || 'outline';
  };

  const info = [
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Nama Lengkap', value: user.full_name || '-' },
    { label: 'Saldo', value: `Rp ${Number(user.balance).toLocaleString('id-ID')}` },
    { label: 'Status', value: user.status },
    { label: 'Role', value: user.role },
    { label: 'API Key', value: user.api_key ? 'Ada' : '-' },
    { label: 'Terdaftar', value: new Date(user.created_at).toLocaleString('id-ID') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detail User: {user.username}</h1>
          <p className="text-sm text-muted-foreground">ID #{user.id}</p>
        </div>
        <Link href={`/admin/user/form/${user.id}`}><Button variant="secondary">Edit</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Order', value: user._count.orders },
          { label: 'Total Deposit', value: user._count.deposits },
          { label: 'Total Ticket', value: user._count.tickets },
          { label: 'Total Balance Log', value: user._count.balance_logs },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {info.map(i => (
              <div key={i.label} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="text-sm font-medium">{i.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Terbaru</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{o.service_name}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{o.target}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>Rp {Number(o.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {user.orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada order</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Deposit Terbaru</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.deposits.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.method}</TableCell>
                  <TableCell>Rp {Number(d.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.net).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(d.status) as any}>{d.status}</Badge></TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {user.deposits.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Belum ada deposit</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}