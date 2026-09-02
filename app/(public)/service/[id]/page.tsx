import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicServiceDetail({ params }: { params: { id: string } }) {
  const service = await prisma.service.findFirst({
    where: { id: Number(params.id), status: true },
    include: { category: true, provider: { select: { name: true, currency: true } } },
  });
  if (!service) notFound();

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
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/service" className="text-sm text-muted-foreground hover:text-primary">← Kembali ke daftar</Link>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{service.name}</CardTitle>
            <Badge variant="secondary" className="w-fit">{service.category.name}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Harga</span><span>Rp {service.price.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Min / Max</span><span>{service.min} / {service.max}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipe</span><span className="capitalize">{service.type.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{service.provider.name}</span></div>
            {service.description && <p className="pt-2 text-muted-foreground">{service.description}</p>}
            <Link href="/auth/login"><Badge className="mt-2">Login untuk pesan</Badge></Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}