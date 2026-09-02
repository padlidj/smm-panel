'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';

export function NotificationClient({ notifications, pages }: any) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/admin/page/notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setSuccess('Notification saved');
    setTitle('');
    setContent('');
    router.refresh();
  };

  const savePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/admin/page/hof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: pageTitle, slug: pageSlug, content: pageContent }) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setSuccess('Page saved');
    setPageTitle('');
    setPageSlug('');
    setPageContent('');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pages Management</h1>
      {error && <Toast type="error" message={error} />}
      {success && <Toast type="success" message={success} />}

      <Card>
        <CardHeader><CardTitle>Add Notification / Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveInfo} className="space-y-3">
            <Input placeholder="Title (e.g. Promo, Notice)" value={title} onChange={e => setTitle(e.target.value)} required />
            <textarea className="flex w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Content" value={content} onChange={e => setContent(e.target.value)} required />
            <Button type="submit">Save Notification</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Notifications</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell>{n.id}</TableCell>
                  <TableCell className="max-w-64 truncate">{n.title}</TableCell>
                  <TableCell><Badge variant={n.status ? 'success' : 'destructive'}>{n.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>{new Date(n.created_at).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
              {notifications.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">None</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add Static Page (HOF, terms, etc)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePage} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Title" value={pageTitle} onChange={e => setPageTitle(e.target.value)} required />
              <Input placeholder="Slug (e.g. hall-of-fame)" value={pageSlug} onChange={e => setPageSlug(e.target.value)} required />
            </div>
            <textarea className="flex w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Page content" value={pageContent} onChange={e => setPageContent(e.target.value)} required />
            <Button type="submit">Save Page</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Pages</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.slug}</TableCell>
                  <TableCell><Badge variant={p.status ? 'success' : 'destructive'}>{p.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {pages.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">None</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}