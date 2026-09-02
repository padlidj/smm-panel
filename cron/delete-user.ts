import { prisma } from '../lib/prisma';

async function main() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { status: 'UNVERIFIED', created_at: { lt: cutoff } },
    select: { id: true, username: true, email: true },
  });

  if (users.length === 0) {
    console.log('Tidak ada pengguna yang harus dihapus.');
    return;
  }

  // Delete related records first (cascade manually where needed)
  const userIds = users.map((u) => u.id);
  await prisma.serviceLog.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.balanceLog.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.customPrice.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.serviceFavorite.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.orderRefill.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.ticketReply.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.ticket.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.deposit.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.order.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.loginLog.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`Berhasil, ${users.length} pengguna dihapus.`);
  await prisma.$disconnect();
}

main().catch(console.error);