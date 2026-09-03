'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';
import { postForm, confirmDelete } from '@/lib/admin-client';

export function CategoryListClient({ categories }: any) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/category', editing ? { id: editing.id, name, status: editing.status } : { name, status: true });
      setSuccess('Category saved');
      setName('');
      setEditing(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggle = async (cat: any) => {
    await postForm('/api/admin/category', { id: cat.id, name: cat.name, status: !cat.status });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Categories</h1>
        <Button variant="secondary" onClick={() => { setEditing(null); setName(''); }}>New Category</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>{editing ? `Edit: ${editing.name}` : 'Add Category'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex gap-3">
            <Input placeholder="Category name" value={name} onChange={e => setName(e.target.value)} required />
            <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
          </form>
          {error && <div className="mt-3"><Toast type="error" message={error} /></div>}
          {success && <div className="mt-3"><Toast type="success" message={success} /></div>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell><Badge variant={c.status ? 'success' : 'destructive'}>{c.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setEditing(c); setName(c.name); }}>Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => toggle(c)}>Toggle</Button>
                    <Button variant="destructive" size="sm" onClick={confirmDelete('/api/admin/category/delete', c.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No categories</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}