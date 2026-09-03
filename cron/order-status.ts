import { prisma } from '../lib/prisma';
import { checkProviderStatus } from '../lib/provider';
import { notifyUser } from '../lib/notify';

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

    if (result.status && result.status !== order.status && ['SUCCESS', 'ERROR', 'PARTIAL'].includes(result.status)) {
      void notifyUser(order.user_id, 'order', `Pesanan #${order.id} ${result.status}`,
        `<p>Pesanan <b>#${order.id}</b> (${order.service_name}) status berubah: <b>${result.status}</b>.</p><p>Target: ${order.target} · Jumlah: ${order.quantity}</p>`);
    }

    console.log(`Berhasil, ID: ${order.id} | Status: ${result.status || order.status}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);