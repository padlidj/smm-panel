import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicServiceList() {
  const categories = await prisma.serviceCategory.findMany({
    where: { status: true },
    include: {
      services: { where: { status: true }, orderBy: { id: 'asc' }, take: 20 },
    },
    orderBy: { id: 'asc' },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">SMM Panel</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/service" className="text-primary font-medium">Layanan</Link>
            <Link href="/auth/login">Masuk</Link>
            <Link href="/auth/register">Daftar</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Daftar Layanan</h1>
        {categories.map((cat) => (
          <div key={cat.id} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{cat.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.services.map((s) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Harga</span>
                      <span className="font-medium">Rp {s.price.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Min / Max</span>
                      <span>{s.min} / {s.max}</span>
                    </div>
                    <Badge variant="secondary">{s.type.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}