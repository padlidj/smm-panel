'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function LogTable({ logs, total, page, title, basePath, filters }: any) {
  const router = useRouter();
  const [st, setSt] = useState(filters?.status || '');
  const [search, setSearch] = useState(filters?.search || '');
  const [user, setUser] = useState(filters?.filter_user || '');
  const [from, setFrom] = useState(filters?.filter_start_date || '');
  const [to, setTo] = useState(filters?.filter_end_date || '');
  const totalPages = Math.ceil(total / PER_PAGE);

  const q = (p: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries({ status: st, search, filter_user: user, filter_start_date: from, filter_end_date: to, ...p }).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`${basePath}?${params}`);
  };
  const paginate = (p: number) => q({ page: String(p) });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={st} onChange={e => setSt(e.target.value)} className="max-w-40">
              <option value="">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </Select>
            <Input placeholder="Search (ID, username, IP)..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-52" />
            <Input placeholder="Filter username..." value={user} onChange={e => setUser(e.target.value)} className="max-w-40" />
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="max-w-40" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="max-w-40" />
            <Button onClick={() => q({})}>Filter</Button>
            <Button variant="outline" onClick={() => router.push(basePath)}>Reset</Button>
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
                <TableHead>IP</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l.username}</TableCell>
                  <TableCell>{l.ip_address}</TableCell>
                  <TableCell className="max-w-48 truncate" title={l.user_agent || ''}>{l.user_agent || '-'}</TableCell>
                  <TableCell><Badge variant={l.status === 'SUCCESS' ? 'success' : 'destructive'}>{l.status}</Badge></TableCell>
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
