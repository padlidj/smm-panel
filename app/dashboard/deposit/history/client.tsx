'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 15;

export function DepositHistoryClient({ deposits, total, page }: any) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PER_PAGE);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', SUCCESS: 'success', FAILED: 'destructive', EXPIRED: 'outline' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Deposit History</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.method}</TableCell>
                  <TableCell>Rp {Number(d.amount).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.fee).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(d.net).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(d.status) as any}>{d.status}</Badge></TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/deposit/detail/${d.id}`} className="text-sm text-primary hover:underline">Detail</Link>
                  </TableCell>
                </TableRow>
              ))}
              {deposits.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No deposits found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/dashboard/deposit/history?page=${p}`)} />
      </Card>
    </div>
  );
}