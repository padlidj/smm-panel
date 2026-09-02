'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 15;

export function RefillHistoryClient({ refills, total, page }: any) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PER_PAGE);

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: 'secondary', PROCESSING: 'default', SUCCESS: 'success', ERROR: 'destructive' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Refill History</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refills.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>#{r.order_id}</TableCell>
                  <TableCell className="max-w-48 truncate">{r.order.service_name}</TableCell>
                  <TableCell className="max-w-32 truncate">{r.target || r.order.target}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell><Badge variant={statusColor(r.status) as any}>{r.status}</Badge></TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {refills.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No refills found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/dashboard/order/refill/history?page=${p}`)} />
      </Card>
    </div>
  );
}