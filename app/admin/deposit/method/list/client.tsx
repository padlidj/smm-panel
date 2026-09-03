'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';
import { postForm, confirmDelete } from '@/lib/admin-client';

export function MethodListClient({ methods }: any) {
  const router = useRouter();
  const [form, setForm] = useState<any>({ id: null, payment: '', method: '', type: 'AUTO', min: '', max: '', fee_percent: '0', status: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const edit = (m: any) => setForm({ id: m.id, payment: m.payment, method: m.method, type: m.type, min: String(m.min), max: String(m.max), fee_percent: String(m.fee_percent), status: m.status });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await postForm('/api/admin/deposit-method', form);
      setSuccess('Method saved');
      setForm({ id: null, payment: '', method: '', type: 'AUTO', min: '', max: '', fee_percent: '0', status: true });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggle = async (m: any) => {
    await postForm('/api/admin/deposit-method', { ...m, status: !m.status });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Deposit Methods</h1>
      <Card>
        <CardHeader><CardTitle>{form.id ? `Edit: ${form.method}` : 'Add Method'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Payment (e.g. Bank Transfer)" value={form.payment} onChange={e => set('payment', e.target.value)} required />
            <Input placeholder="Method (e.g. BCA)" value={form.method} onChange={e => set('method', e.target.value)} required />
            <Select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="AUTO">Auto</option>
              <option value="MANUAL">Manual</option>
            </Select>
            <Input type="number" placeholder="Min" value={form.min} onChange={e => set('min', e.target.value)} required />
            <Input type="number" placeholder="Max" value={form.max} onChange={e => set('max', e.target.value)} required />
            <Input type="number" step="0.01" placeholder="Fee %" value={form.fee_percent} onChange={e => set('fee_percent', e.target.value)} />
            <Select value={String(form.status)} onChange={e => set('status', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <div className="flex gap-2">
              <Button type="submit">{form.id ? 'Update' : 'Add'}</Button>
              {form.id && <Button type="button" variant="secondary" onClick={() => setForm({ id: null, payment: '', method: '', type: 'AUTO', min: '', max: '', fee_percent: '0', status: true })}>Cancel</Button>}
            </div>
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
                <TableHead>Payment</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>{m.payment}</TableCell>
                  <TableCell>{m.method}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>{Number(m.min).toLocaleString('id-ID')} - {Number(m.max).toLocaleString('id-ID')}</TableCell>
                  <TableCell>{m.fee_percent}</TableCell>
                  <TableCell><Badge variant={m.status ? 'success' : 'destructive'}>{m.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => edit(m)}>Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => toggle(m)}>Toggle</Button>
                    <Button variant="destructive" size="sm" onClick={confirmDelete('/api/admin/deposit-method/delete', m.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {methods.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No methods</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}