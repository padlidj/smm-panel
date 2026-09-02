import { prisma } from '../lib/prisma';
import { checkProviderStatus } from '../lib/provider';

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    include: { service_provider: true },
    take: 150,
    orderBy: { id: 'desc' },
  });

  if (orders.length === 0) {
    console.log('Tidak ada pesanan yang harus diperbarui.');
    return;
  }

  for (const order of orders) {
    if (!order.service_provider || order.service_provider.name === 'MANUAL') continue;

    const result = await checkProviderStatus(order.service_provider, order);
    if (!result) continue;

    const updateData: any = {
      provider_status_log: JSON.stringify(result.raw),
      updated_at: new Date(),
    };

    if (result.status) updateData.status = result.status;
    if (result.start_count !== null) updateData.start_count = result.start_count;
    if (result.remains !== null) updateData.remains = result.remains;

    await prisma.order.update({ where: { id: order.id }, data: updateData });

    console.log(`Berhasil, ID: ${order.id} | Status: ${result.status || order.status}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);