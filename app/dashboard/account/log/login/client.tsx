'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function LoginLogClient({ logs, total, page }: any) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Login Log</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.ip_address}</TableCell>
                  <TableCell className="max-w-64 truncate text-xs">{l.user_agent || '-'}</TableCell>
                  <TableCell><Badge variant={l.status === 'SUCCESS' ? 'success' : 'destructive'}>{l.status}</Badge></TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No logs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/dashboard/account/log/login?page=${p}`)} />
      </Card>
    </div>
  );
}