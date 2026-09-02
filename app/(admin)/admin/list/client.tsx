'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { postForm } from '@/lib/admin-client';

export function AdminListClient({ admins }: any) {
  const router = useRouter();
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const toggle = async (a: any) => {
    await postForm('/api/admin/admin', { id: a.id, username: a.username, email: a.email, level: a.level, status: !a.status });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admins</h1>
        <Link href="/admin/admin/form/0"><Button>New Admin</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.id}</TableCell>
                  <TableCell>{a.username}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell><Badge variant={a.level === 'SUPERADMIN' ? 'default' : 'secondary'}>{a.level}</Badge></TableCell>
                  <TableCell><Badge variant={a.status ? 'success' : 'destructive'}>{a.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/admin/admin/form/${a.id}`}><Button variant="secondary" size="sm">Edit</Button></Link>
                    <Button variant="secondary" size="sm" onClick={() => toggle(a)}>Toggle</Button>
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No admins</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {!isSuperadmin && <p className="text-sm text-muted-foreground">Only SUPERADMIN can create or edit admin accounts.</p>}
    </div>
  );
}