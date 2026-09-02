import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SitePage({ params }: { params: { slug: string } }) {
  const page = await prisma.websitePage.findUnique({ where: { slug: params.slug } });
  if (!page || !page.status) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">SMM Panel</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/service">Layanan</Link>
            <Link href="/auth/login">Masuk</Link>
            <Link href="/auth/register">Daftar</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader><CardTitle>{page.title}</CardTitle></CardHeader>
          <CardContent><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} /></CardContent>
        </Card>
      </main>
    </div>
  );
}