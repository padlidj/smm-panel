import { prisma } from '../lib/prisma';
import { checkProviderStatus } from '../lib/provider';
import { notifyUser } from '../lib/notify';

// Bounded keyset pagination: fixed upper-id snapshot, advancing cursor even on failure.
// Isolates row failures so next rows proceed; prevents starvation under backlog.
async function processBatch(batchSize: number = 500): Promise<number> {
  const maxRows = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] }, provider_order_id: { not: null }, service_provider: { name: { not: 'MANUAL' } } },
    orderBy: { id: 'desc' },
    take: 1,
    select: { id: true },
  });
  if (maxRows.length === 0) return 0;
  const maxId = maxRows[0].id;

  let processed = 0;
  let lastId = 0;
  while (lastId < maxId) {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] }, provider_order_id: { not: null }, service_provider: { name: { not: 'MANUAL' } }, id: { gt: lastId, lte: maxId } },
      include: { service_provider: true },
      take: batchSize,
      orderBy: { id: 'asc' },
    });
    if (orders.length === 0) break;

    for (const order of orders) {
      if (!order.service_provider || order.service_provider.name === 'MANUAL') { lastId = order.id; continue; }
      try {
        const result = await checkProviderStatus(order.service_provider, order);
        if (!result) { lastId = order.id; continue; }

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
      } catch (e) {
        console.error(`Gagal ID: ${order.id} | ${e}`);
      }
      lastId = order.id;
      processed++;
    }
  }
  return processed;
}

async function main() {
  const processed = await processBatch();
  if (processed === 0) {
    console.log('Tidak ada pesanan yang harus diperbarui.');
  }
  await prisma.$disconnect();
}

main().catch(console.error);