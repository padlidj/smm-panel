'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Toast } from '@/components/ui/toast';
import { Plus, Trash2, Search } from 'lucide-react';

export function CustomPriceListClient({ items, total, page, totalPages, search, users, services }: any) {
  const router = useRouter();
  const [s, setS] = useState(search);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', service_id: '', price: '', profit: '0' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const searchFn = () => {
    const p = new URLSearchParams();
    if (s) p.set('search', s);
    router.push(`/admin/service/custom-price/list?${p}`);
  };

  const save = async () => {
    setError('');
    if (!form.user_id || !form.service_id || !form.price) return setError('Lengkapi data');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/custom-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.status) return setError(d.message || 'Gagal');
      setShowForm(false);
      setForm({ user_id: '', service_id: '', price: '', profit: '0' });
      router.refresh();
    } catch { setError('Kesalahan server'); }
    finally { setLoading(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Hapus harga khusus ini?')) return;
    const res = await fetch(`/api/admin/custom-price?id=${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.status) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Harga Khusus</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Tambah</Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Cari username..."
          value={s}
          onChange={e => setS(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchFn()}
          className="max-w-xs"
        />
        <Button variant="secondary" onClick={searchFn}><Search className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Harga Khusus ({total})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Harga/1K</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
              ) : items.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.user.username}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{i.service.name}</TableCell>
                  <TableCell>Rp {Number(i.price).toLocaleString('id-ID')}</TableCell>
                  <TableCell>Rp {Number(i.profit).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} onChange={p => router.push(`/admin/service/custom-price/list?page=${p}${search ? `&search=${search}` : ''}`)} />
        </CardContent>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tambah / Edit Harga Khusus">
        <div className="space-y-3">
          <Select value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}>
            <option value="">Pilih User</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </Select>
          <Select value={form.service_id} onChange={e => setForm(p => ({ ...p, service_id: e.target.value }))}>
            <option value="">Pilih Layanan</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input type="number" placeholder="Harga / 1K" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
          <Input type="number" placeholder="Profit" value={form.profit} onChange={e => setForm(p => ({ ...p, profit: e.target.value }))} />
          {error && <Toast type="error" message={error} />}
          <Button onClick={save} disabled={loading} className="w-full">{loading ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </Modal>
    </div>
  );
}