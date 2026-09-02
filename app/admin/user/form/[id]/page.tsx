import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserFormClient } from './client';

export default async function UserFormPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') redirect('/auth/login');

  const user = await prisma.user.findUnique({ where: { id: parseInt(params.id) } });
  if (!user) redirect('/admin/user/list');

  return <UserFormClient user={user} />;
}