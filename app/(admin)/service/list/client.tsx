'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { postForm } from '@/lib/admin-client';

const PER_PAGE = 20;

export function ServiceListClient({ services, total, page }: any) {
  const router = useRouter();

  const toggle = async (s: any) => {
    await postForm('/api/admin/service', {
      id: s.id, category_id: s.category_id, provider_id: s.provider_id, name: s.name, type: s.type,
      price: s.price, profit: s.profit, min: s.min, max: s.max, status: !s.status,
      provider_service_id: s.provider_service_id, refill_provider_service_id: s.refill_provider_service_id,
    });
    router.refresh();
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <Link href="/admin/service/form/0"><Button>New Service</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell className="max-w-48 truncate">{s.name}</TableCell>
                  <TableCell>{s.category.name}</TableCell>
                  <TableCell>{s.provider.name}</TableCell>
                  <TableCell>Rp {s.price.toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {s.profit.toLocaleString('id-ID')}</TableCell>
                  <TableCell>{s.min}/{s.max}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell><Badge variant={s.status ? 'success' : 'destructive'}>{s.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/admin/service/form/${s.id}`}><Button variant="secondary" size="sm">Edit</Button></Link>
                    <Button variant="secondary" size="sm" onClick={() => toggle(s)}>Toggle</Button>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No services</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/service/list?page=${p}`)} />
      </Card>
    </div>
  );
}