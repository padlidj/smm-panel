'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function RegisterLogTable({ logs, total, page, filters }: any) {
  const router = useRouter();
  const [search, setSearch] = useState(filters?.search || '');
  const [user, setUser] = useState(filters?.filter_user || '');
  const [from, setFrom] = useState(filters?.filter_start_date || '');
  const [to, setTo] = useState(filters?.filter_end_date || '');
  const totalPages = Math.ceil(total / PER_PAGE);

  const q = (p: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries({ search, filter_user: user, filter_start_date: from, filter_end_date: to, ...p }).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`/admin/log/user/register?${params}`);
  };
  const paginate = (p: number) => q({ page: String(p) });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Registration Logs</h1>
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Search (ID, username, email, IP)..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-56" />
            <Input placeholder="Filter username..." value={user} onChange={e => setUser(e.target.value)} className="max-w-40" />
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="max-w-40" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="max-w-40" />
            <Button onClick={() => q({})}>Filter</Button>
            <Button variant="outline" onClick={() => { setSearch(''); setUser(''); setFrom(''); setTo(''); router.push('/admin/log/user/register'); }}>Reset</Button>
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
                <TableHead>IP</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l.username}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.ip_address}</TableCell>
                  <TableCell className="max-w-64 truncate" title={l.user_agent || ''}>{l.user_agent || '-'}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No logs</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={paginate} />
      </Card>
    </div>
  );
}
