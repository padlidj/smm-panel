import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ApiDocPage() {
  const configs = await prisma.websiteConfig.findMany({ where: { key: { in: ['site_name', 'site_desc'] } } });
  const cfg: Record<string, string> = {};
  for (const c of configs) cfg[c.key] = String(c.value ?? '');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">{cfg.site_name || 'SMM Panel'}</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/service">Layanan</Link>
            <Link href="/auth/login">Masuk</Link>
            <Link href="/auth/register">Daftar</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Dokumentasi API</h1>

        <section className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Autentikasi</CardTitle><CardDescription>Semua request API memerlukan API key yang dikirim sebagai header.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><code className="bg-muted px-2 py-1 rounded text-xs">X-API-Key: {`{your_api_key}`}</code></div>
              <p className="text-muted-foreground">API key bisa didapatkan di halaman <Link href="/dashboard/account" className="text-primary">Akun</Link> setelah login.</p>
              <h4 className="font-semibold">Base URL</h4>
              <code className="bg-muted px-2 py-1 rounded text-xs">https://kuygas.my.id/api/reseller</code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Mendapatkan informasi profile dan saldo.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>GET</Badge><code>/api/reseller/profile</code></div>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, data: { full_name: 'Jhon Delton', username: 'jhondelton', balance: 10000 } }, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Daftar Layanan</CardTitle><CardDescription>Mendapatkan semua layanan yang tersedia.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>GET</Badge><code>/api/reseller/services</code></div>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, data: [{ id: 1, category: 'Instagram Followers', name: 'Instagram Followers Server 1', price: 10000, min: 100, max: 500, description: 'Instan\nCepat', status: 1, refill_support: 1, type: '' }] }, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Buat Pesanan</CardTitle><CardDescription>Membuat pesanan baru.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>POST</Badge><code>/api/reseller/order</code></div>
              <p className="text-muted-foreground">Body:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ service_id: 1, target: 'https://instagram.com/username', quantity: 100 }, null, 2)}</pre>
              <p className="text-muted-foreground">Response:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, order_id: 123, quantity: 100, price: 1000 }, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status Pesanan</CardTitle><CardDescription>Cek status pesanan.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>POST</Badge><code>/api/reseller/status</code></div>
              <p className="text-muted-foreground">Body:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ order_id: 123 }, null, 2)}</pre>
              <p className="text-muted-foreground">Response:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, data: { status: 'SUCCESS', target: 'https://instagram.com/username', quantity: 100, price: 1000, start_count: 50, remains: 50 } }, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Refill</CardTitle><CardDescription>Membuat refill untuk pesanan yang sudah SUCCESS.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>POST</Badge><code>/api/reseller/refill</code></div>
              <p className="text-muted-foreground">Body:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ order_id: 123, quantity: 100 }, null, 2)}</pre>
              <p className="text-muted-foreground">Response:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, refill_id: 456, order_id: 123, quantity: 100, price: 1000 }, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status Refill</CardTitle><CardDescription>Cek status refill.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Badge>POST</Badge><code>/api/reseller/refill_status</code></div>
              <p className="text-muted-foreground">Body:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ id: 456 }, null, 2)}</pre>
              <p className="text-muted-foreground">Response:</p>
              <pre className="bg-muted p-3 rounded text-xs">{JSON.stringify({ status: true, data: { status: 'PENDING' } }, null, 2)}</pre>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}