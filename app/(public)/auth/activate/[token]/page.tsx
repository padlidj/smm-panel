import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ActivatePage({ params }: { params: { token: string } }) {
  const user = await prisma.user.findFirst({ where: { activate_token: params.token } });
  let ok = false;
  if (user && user.status === 'UNVERIFIED') {
    // Conditional claim: concurrent clicks activate once
    const done = await prisma.user.updateMany({
      where: { id: user.id, status: 'UNVERIFIED' },
      data: { status: 'ACTIVE', activate_token: null },
    });
    ok = done.count === 1;
  }
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center"><CardTitle>Aktivasi Akun</CardTitle></CardHeader>
      <CardContent className="text-center space-y-4">
        <p>{ok ? 'Akun berhasil diaktivasi. Silakan login.' : user ? 'Akun sudah aktif.' : 'Token tidak valid.'}</p>
        <a href="/auth/login" className="text-primary hover:underline">Ke halaman login</a>
      </CardContent>
    </Card>
  );
}
