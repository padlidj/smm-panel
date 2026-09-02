import { prisma } from '../lib/prisma';
import { checkRefillStatus } from '../lib/provider';

async function main() {
  const refills = await prisma.orderRefill.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    include: { order: { include: { service_provider: true } } },
    take: 50,
    orderBy: { id: 'desc' },
  });

  if (refills.length === 0) {
    console.log('Tidak ada refill yang harus diperbarui.');
    await prisma.$disconnect();
    return;
  }

  for (const refill of refills) {
    const provider = refill.order?.service_provider;
    if (!provider || provider.name === 'MANUAL') continue;

    const result = await checkRefillStatus(provider, refill);
    if (!result) continue;

    const updateData: any = { updated_at: new Date() };
    if (result.status) updateData.status = result.status;

    await prisma.orderRefill.update({ where: { id: refill.id }, data: updateData });
    console.log(`Refill ID: ${refill.id} | Status: ${result.status || refill.status}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });