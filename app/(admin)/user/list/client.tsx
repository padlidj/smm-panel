'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 20;

export function UserListClient({ users, total, page, search, status }: any) {
  const router = useRouter();
  const [s, setS] = useState(search);
  const [st, setSt] = useState(status);
  const totalPages = Math.ceil(total / PER_PAGE);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (st) params.set('status', st);
    router.push(`/admin/user/list?${params}`);
  };

  const statusColor = (st: string) => {
    const map: Record<string, string> = { ACTIVE: 'success', BANNED: 'destructive', UNVERIFIED: 'secondary' };
    return map[st] || 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Search username/email..." value={s} onChange={e => setS(e.target.value)} className="max-w-xs" />
            <Select value={st} onChange={e => setSt(e.target.value)} className="max-w-40">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="BANNED">Banned</option>
              <option value="UNVERIFIED">Unverified</option>
            </Select>
            <Button onClick={handleSearch}>Search</Button>
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
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>Rp {Number(u.balance).toLocaleString('id-ID')}</TableCell>
                  <TableCell><Badge variant={statusColor(u.status) as any}>{u.status}</Badge></TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <Link href={`/admin/user/form/${u.id}`}>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No users found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/user/list?page=${p}${search ? `&search=${search}` : ''}${status ? `&status=${status}` : ''}`)} />
      </Card>
    </div>
  );
}