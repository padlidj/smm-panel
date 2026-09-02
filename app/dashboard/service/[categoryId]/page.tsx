import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ServiceCategoryPage({ params }: { params: { categoryId: string } }) {
  const category = await prisma.serviceCategory.findUnique({ where: { id: parseInt(params.categoryId) } });
  if (!category) return <div className="text-center text-muted-foreground">Category not found</div>;

  const services = await prisma.service.findMany({
    where: { category_id: category.id, status: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{category.name}</h1>
      {services.length === 0 ? (
        <p className="text-muted-foreground">No services in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium line-clamp-2">{s.name}</h3>
                  <Badge variant={s.type !== 'DEFAULT' ? 'secondary' : 'outline'}>{s.type}</Badge>
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