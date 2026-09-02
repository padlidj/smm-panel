import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FavoriteButton } from '@/components/service/favorite-button';
import { Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FavoriteServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');
  const userId = Number((session.user as any).id);

  const favorites = await prisma.serviceFavorite.findMany({
    where: { user_id: userId },
    include: { service: { include: { category: true } } },
    orderBy: { created_at: 'desc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-yellow-500 fill-yellow-500" /> Layanan Favorit</h1>
      {favorites.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p>Belum ada layanan favorit.</p>
          <p className="text-sm mt-1">Klik ikon bintang di daftar layanan untuk menyimpan.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map(({ service: s }) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium line-clamp-2">{s.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline">{s.category.name}</Badge>
                    <FavoriteButton serviceId={s.id} initial />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Rp {Number(s.price).toLocaleString('id-ID')} / 1000</p>
                <p className="text-xs text-muted-foreground">Min {s.min} · Max {s.max}</p>
                <Link href={`/dashboard/order/new?service_id=${s.id}`}>
                  <Button size="sm" className="w-full">Order</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}