'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';

export function GetServiceClient({ providers }: any) {
  const router = useRouter();
  const [result, setResult] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<number | null>(null);

  const syncAll = async () => {
    setLoading(0);
    for (const p of providers) {
      try {
        const res = await fetch(`/api/admin/provider/sync/${p.id}`, { method: 'POST' });
        const json = await res.json();
        setResult(prev => ({ ...prev, [p.id]: res.ok ? `✅ ${json.count} layanan` : `❌ ${json.error}` }));
      } catch {
        setResult(prev => ({ ...prev, [p.id]: '❌ Gagal' }));
      }
    }
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ambil Service dari Provider</h1>
        <Button onClick={syncAll} disabled={loading !== null || providers.length === 0}>
          {loading !== null ? 'Menyinkronkan...' : 'Sync Semua Provider'}
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Provider Aktif</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {providers.length === 0 && <p className="text-sm text-muted-foreground">Belum ada provider aktif.</p>}
          {providers.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p._count.services} layanan tersimpan</div>
              </div>
              {result[p.id] && <Badge variant={result[p.id].startsWith('✅') ? 'success' : 'destructive'}>{result[p.id]}</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}