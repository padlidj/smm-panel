'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function RegisterLogTable({ users, total, page, filters }: any) {
  const router = useRouter();
  const [un, setUn] = useState(filters?.username || '');
  const totalPages = Math.ceil(total / PER_PAGE);

  const filter = () => {
    const params = new URLSearchParams();
    if (un) params.set('username', un);
    router.push(`/admin/log/user/register?${params}`);
  };

  const paginate = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (filters?.username) params.set('username', filters.username);
    router.push(`/admin/log/user/register?${params}`);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { ACTIVE: 'success', BANNED: 'destructive', UNVERIFIED: 'secondary' };
    return map[s] || 'outline';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Registration Logs</h1>
      <Card>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Search username/email..." value={un} onChange={e => setUn(e.target.value)} className="max-w-60" />
            <Button onClick={filter}>Filter</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant={statusColor(u.status) as any}>{u.status}</Badge></TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No registrations</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={paginate} />
      </Card>
    </div>
  );
}