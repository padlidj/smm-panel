'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { useState } from 'react';

export function ServiceLogClient({ logs, total, page, totalPages, filterProvider, providers }: any) {
  const router = useRouter();
  const [sel, setSel] = useState(filterProvider ? String(filterProvider) : '');

  const go = (p: number) => {
    const q = new URLSearchParams();
    if (sel) q.set('provider_id', sel);
    if (p > 1) q.set('page', String(p));
    router.push(`/admin/service/log?${q}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Service Log</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Filter Provider</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={sel} onChange={e => setSel(e.target.value)} className="max-w-60">
              <option value="">Semua Provider</option>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => go(1)}>Filter</Button>
          </div>
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
                  <TableCell>{l.service.name}</TableCell>
                  <TableCell>{l.provider.name}</TableCell>
                  <TableCell>{l.user?.username || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.logs}</TableCell>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada log</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={go} />
      </Card>
    </div>
  );
}