'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';

const areaCls = 'flex w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm';

export function NotificationClient({ notifications, pages }: any) {
  const router = useRouter();
  const [infoId, setInfoId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pageId, setPageId] = useState<number | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const say = (ok: string, err?: string) => { setError(err || ''); setSuccess(err ? '' : ok); };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/page/notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: infoId, title, content }) });
    const json = await res.json();
    if (!res.ok) return say('', json.error);
    say(infoId ? 'Notification updated' : 'Notification saved');
    setInfoId(null); setTitle(''); setContent('');
    router.refresh();
  };

  const savePage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/page/hof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: pageTitle, slug: pageSlug, content: pageContent }) });
    const json = await res.json();
    if (!res.ok) return say('', json.error);
    say('Page saved');
    setPageId(null); setPageTitle(''); setPageSlug(''); setPageContent('');
    router.refresh();
  };

  const act = async (target: 'page' | 'information', id: number, action: 'delete' | 'toggle') => {
    if (action === 'delete' && !confirm('Hapus data ini?')) return;
    const res = await fetch('/api/admin/page/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, id, action }) });
    const json = await res.json();
    if (!res.ok) return say('', json.error);
    say(json.message);
    router.refresh();
  };

  const rowBtns = (target: 'page' | 'information', r: any) => (
    <TableCell className="space-x-1">
      <Button size="sm" variant="outline" onClick={() => {
        if (target === 'information') { setInfoId(r.id); setTitle(r.title); setContent(r.content); }
        else { setPageId(r.id); setPageTitle(r.title); setPageSlug(r.slug); setPageContent(r.content); }
      }}>Edit</Button>
      <Button size="sm" variant="outline" onClick={() => act(target, r.id, 'toggle')}>{r.status ? 'Nonaktif' : 'Aktifkan'}</Button>
      <Button size="sm" variant="destructive" onClick={() => act(target, r.id, 'delete')}>Hapus</Button>
    </TableCell>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pages Management</h1>
      {error && <Toast type="error" message={error} />}
      {success && <Toast type="success" message={success} />}

      <Card>
        <CardHeader><CardTitle>{infoId ? `Edit Notification #${infoId}` : 'Add Notification / Information'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveInfo} className="space-y-3">
            <Input placeholder="Title (e.g. Promo, Notice)" value={title} onChange={e => setTitle(e.target.value)} required />
            <textarea className={areaCls} placeholder="Content" value={content} onChange={e => setContent(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit">{infoId ? 'Update Notification' : 'Save Notification'}</Button>
              {infoId && <Button type="button" variant="outline" onClick={() => { setInfoId(null); setTitle(''); setContent(''); }}>Batal</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Notifications</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell>{n.id}</TableCell>
                  <TableCell className="max-w-64 truncate">{n.title}</TableCell>
                  <TableCell><Badge variant={n.status ? 'success' : 'destructive'}>{n.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>{new Date(n.created_at).toLocaleDateString('id-ID')}</TableCell>
                  {rowBtns('information', n)}
                </TableRow>
              ))}
              {notifications.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{pageId ? `Edit Static Page #${pageId}` : 'Add Static Page (HOF, terms, etc)'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePage} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Title" value={pageTitle} onChange={e => setPageTitle(e.target.value)} required />
              {/* upsert keyed by slug — slug frozen while editing */}
              <Input placeholder="Slug (e.g. hall-of-fame)" value={pageSlug} onChange={e => setPageSlug(e.target.value)} required readOnly={pageId !== null} className={pageId !== null ? 'opacity-60' : ''} />
            </div>
            <textarea className={areaCls} placeholder="Page content" value={pageContent} onChange={e => setPageContent(e.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit">Save Page</Button>
              {pageId && <Button type="button" variant="outline" onClick={() => { setPageId(null); setPageTitle(''); setPageSlug(''); setPageContent(''); }}>Batal</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Pages</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.slug}</TableCell>
                  <TableCell><Badge variant={p.status ? 'success' : 'destructive'}>{p.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  {rowBtns('page', p)}
                </TableRow>
              ))}
              {pages.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
