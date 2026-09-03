'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';
import { postForm, confirmDelete } from '@/lib/admin-client';

export function ProviderListClient({ providers }: any) {
  const [balance, setBalance] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const toggle = async (p: any) => {
    await postForm('/api/admin/provider', { id: p.id, name: p.name, provider_id: p.provider_id, provider_key: p.provider_key, provider_secret: p.provider_secret, status: !p.status, is_refill_support: p.is_refill_support, currency: p.currency });
    window.location.reload();
  };

  const checkBalance = async (p: any) => {
    setError('');
    try {
      const res = await fetch(`/api/admin/provider/check-balance/${p.id}`, { method: 'POST' });
      const json = await res.json();
      setBalance(prev => ({ ...prev, [p.id]: res.ok ? `Balance: ${json.balance}` : json.error }));
    } catch (e: any) {
      setBalance(prev => ({ ...prev, [p.id]: 'Error checking balance' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Providers</h1>
        <Link href="/admin/service/provider/form/0"><Button>New Provider</Button></Link>
      </div>
      {error && <Toast type="error" message={error} />}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Provider ID</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Refill</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.provider_id}</TableCell>
                  <TableCell>{p._count.services}</TableCell>
                  <TableCell>{p.is_refill_support ? 'Yes' : 'No'}</TableCell>
                  <TableCell><Badge variant={p.status ? 'success' : 'destructive'}>{p.status ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    {balance[p.id] ? <span className="text-sm">{balance[p.id]}</span> : <Button variant="secondary" size="sm" onClick={() => checkBalance(p)}>Check Balance</Button>}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/admin/service/provider/form/${p.id}`}><Button variant="secondary" size="sm">Edit</Button></Link>
                    <Button variant="secondary" size="sm" onClick={() => toggle(p)}>Toggle</Button>
                    <Button variant="secondary" size="sm" onClick={async () => {
                      const res = await fetch(`/api/admin/provider/sync/${p.id}`, { method: 'POST' });
                      const json = await res.json();
                      setBalance(prev => ({ ...prev, [p.id]: res.ok ? `Synced ${json.count} services` : json.error }));
                    }}>Sync</Button>
                    <Button variant="destructive" size="sm" onClick={confirmDelete('/api/admin/provider/delete', p.id)}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
              {providers.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No providers</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}