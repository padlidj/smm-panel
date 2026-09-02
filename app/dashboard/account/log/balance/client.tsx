'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function BalanceLogClient({ logs, total, page }: any) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Balance Log</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell><Badge variant={l.type === 'PLUS' ? 'success' : 'destructive'}>{l.type}</Badge></TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>Rp {Number(l.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(l.balance_before).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(l.balance_after).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="max-w-48 truncate">{l.description || '-'}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No logs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/dashboard/account/log/balance?page=${p}`)} />
      </Card>
    </div>
  );
}