import { prisma } from '../lib/prisma';

async function main() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const deposits = await prisma.deposit.findMany({
    where: { status: 'PENDING', created_at: { lt: cutoff } },
  });

  if (deposits.length === 0) {
    console.log('Tidak ada deposit yang kedaluwarsa.');
    return;
  }

  await prisma.deposit.updateMany({
    where: { id: { in: deposits.map((d) => d.id) } },
    data: { status: 'EXPIRED' },
  });

  console.log(`Berhasil, ${deposits.length} deposit kedaluwarsa.`);
  await prisma.$disconnect();
}

main().catch(console.error);