import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InformationPage() {
  const info = await prisma.websiteInformation.findMany({ where: { status: true }, orderBy: { id: 'desc' } });

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
        <h1 className="text-2xl font-bold mb-6">Informasi</h1>
        {info.length === 0 ? (
          <p className="text-muted-foreground">Belum ada informasi.</p>
        ) : (
          <div className="space-y-4">
            {info.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <CardTitle className="text-base">{i.title}</CardTitle>
                  <CardDescription>{new Date(i.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                </CardHeader>
                <CardContent><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: i.content }} /></CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}