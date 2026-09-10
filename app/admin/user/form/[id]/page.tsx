import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { UserFormClient } from './client';

// Laravel user/form/{id?} parity: 'new' = create.
export default async function UserFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  if (params.id === 'new') return <UserFormClient user={null} />;
  const user = await prisma.user.findUnique({ where: { id: parseInt(params.id) } });
  if (!user) redirect('/admin/user/list');
  const plain = JSON.parse(JSON.stringify({ ...user, balance: Number(user.balance) }));
  delete plain.password;
  return <UserFormClient user={plain} />;
}
