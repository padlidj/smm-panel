'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Laravel ref: website_page (Halaman) + website_information (Informasi) — list + filter + modal form.
const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

function inRange(d: string, from: string, to: string) {
  const t = new Date(d).getTime();
  if (from && t < new Date(from + 'T00:00:00').getTime()) return false;
  if (to && t > new Date(to + 'T23:59:59').getTime()) return false;
  return true;
}

export function NotificationClient({ notifications, pages }: any) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  // modal state: kind = 'page' | 'information'
  const [modal, setModal] = useState<null | { kind: 'page' | 'information'; id: number | null }>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const say = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 4000); };

  const openAdd = (kind: 'page' | 'information') => { setModal({ kind, id: null }); setTitle(''); setSlug(''); setContent(''); };
  const openEdit = (kind: 'page' | 'information', r: any) => { setModal({ kind, id: r.id }); setTitle(r.title); setSlug(r.slug || ''); setContent(r.content); };

  const save = async () => {
    if (!modal) return;
    if (!title.trim() || !content.trim()) return say(false, 'Judul dan konten wajib diisi.');
    setSaving(true);
    try {
      const url = modal.kind === 'page' ? '/api/admin/page/hof' : '/api/admin/page/notification';
      const body: any = modal.kind === 'page'
        ? { id: modal.id, title, slug: slug || slugify(title), content }
        : { id: modal.id, title, content };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) return say(false, json.error || 'Gagal menyimpan.');
      say(true, json.message);
      setModal(null);
      router.refresh();
    } finally { setSaving(false); }
  };

  const act = async (target: 'page' | 'information', id: number, action: 'delete' | 'toggle') => {
    if (action === 'delete' && !confirm('Hapus data ini?')) return;
    const res = await fetch('/api/admin/page/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, id, action }) });
    const json = await res.json();
    if (!res.ok) return say(false, json.error);
    say(true, json.message);
    router.refresh();
  };

  // ponytail: client-side filter — dataset halaman/informasi kecil; pindah ke server filter kalau sudah ribuan row.
  const filter = (rows: any[]) => rows.filter(r =>
    (!q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.slug || '').includes(q.toLowerCase())) &&
    inRange(r.created_at, from, to));
  const fPages = useMemo(() => filter(pages), [pages, q, from, to]);
  const fInfo = useMemo(() => filter(notifications), [notifications, q, from, to]);

  const date = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const section = (kind: 'page' | 'information', rows: any[], label: string, withSlug: boolean) => (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{label} <span className="ml-1 text-sm font-normal text-muted-foreground">({rows.length})</span></CardTitle>
        <Button size="sm" onClick={() => openAdd(kind)}><Plus className="h-4 w-4" /> Tambah</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead><TableHead>Judul</TableHead>
              {withSlug && <TableHead>Slug</TableHead>}
              <TableHead>Status</TableHead><TableHead>Tanggal</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{r.id}</TableCell>
                <TableCell className="max-w-72 truncate font-medium">{r.title}</TableCell>
                {withSlug && <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.slug}</code></TableCell>}
                <TableCell><Badge variant={r.status ? 'success' : 'destructive'}>{r.status ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{date(r.created_at)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(kind, r)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => act(kind, r.id, 'toggle')}>{r.status ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                  <Button size="sm" variant="destructive" onClick={() => act(kind, r.id, 'delete')}>Hapus</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={withSlug ? 6 : 5} className="py-8 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Halaman &amp; Informasi Website</h1>
          <p className="text-sm text-muted-foreground">Kelola halaman statis dan informasi yang tampil di publik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari judul/slug..." value={q} onChange={e => setQ(e.target.value)} className="h-9 w-48 pl-8" />
          </div>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-40" aria-label="Dari tanggal" />
          <span className="text-muted-foreground">-</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-40" aria-label="Sampai tanggal" />
          {(q || from || to) && <Button size="sm" variant="ghost" onClick={() => { setQ(''); setFrom(''); setTo(''); }}><X className="h-4 w-4" /> Reset</Button>}
        </div>
      </div>

      {flash && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${flash.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
          {flash.msg}
        </div>
      )}

      {section('page', fPages, 'Halaman Website', true)}
      {section('information', fInfo, 'Informasi / Notifikasi', false)}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.kind === 'page' ? (modal.id ? 'Edit Halaman' : 'Tambah Halaman') : modal?.id ? 'Edit Informasi' : 'Tambah Informasi'}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Judul <span className="text-destructive">*</span></label>
            <Input value={title} onChange={e => { setTitle(e.target.value); if (modal?.kind === 'page' && !modal.id) setSlug(slugify(e.target.value)); }} autoFocus />
          </div>
          {modal?.kind === 'page' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug <span className="text-destructive">*</span></label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} readOnly={!!modal?.id} className={modal?.id ? 'opacity-60' : ''} />
              <p className="text-xs text-muted-foreground">Dibuat otomatis dari judul. Tampil di /site/{slug || '...'}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Konten <span className="text-destructive">*</span></label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={10} className="font-mono text-xs" placeholder="HTML atau teks..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModal(null)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
