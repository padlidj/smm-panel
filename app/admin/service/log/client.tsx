'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

export function ServiceLogClient({ logs, total, page, totalPages, filters }: any) {
  const router = useRouter();
  const qp = new URLSearchParams(Object.entries(filters || {}).filter(([k, v]) => k !== 'page' && v).map(([k, v]) => [k, String(v)])).toString();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Service Log</h1>
      <Card>
        <CardContent className="p-3">
          <form className="flex flex-wrap items-center gap-2" action="/admin/service/log" method="get">
            <Input name="search" defaultValue={filters?.search || ''} placeholder="Cari ID / log / user / layanan / provider" className="h-10 w-64" />
            <Input name="filter_user" defaultValue={filters?.filter_user || ''} placeholder="User" className="h-10 w-32" />
            <Input name="filter_service" defaultValue={filters?.filter_service || ''} placeholder="Layanan" className="h-10 w-40" />
            <Input name="filter_provider" defaultValue={filters?.filter_provider || ''} placeholder="Provider" className="h-10 w-40" />
            <Input type="date" name="filter_start_date" defaultValue={filters?.filter_start_date || ''} className="h-10 w-40" />
            <Input type="date" name="filter_end_date" defaultValue={filters?.filter_end_date || ''} className="h-10 w-40" />
            <Button type="submit" size="sm">Filter</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => router.push('/admin/service/log')}>Reset</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Log</TableHead>
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l.service_id ? <Link className="underline" href={`/admin/order/list?service_id=${l.service_id}`}>{l.service?.name || '-'}</Link> : (l.service?.name || '-')}</TableCell>
                  <TableCell>{l.provider?.name || '-'}</TableCell>
                  <TableCell>{l.user?.username || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate" title={l.logs}>{l.logs}</TableCell>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {!logs.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/service/log?page=${p}${qp ? '&' + qp : ''}`)} />
      </Card>
    </div>
  );
}
