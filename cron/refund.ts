import { prisma } from '../lib/prisma';
import { notifyUser } from '../lib/notify';
import { creditGuard } from '../lib/balance';

// Bounded keyset pagination: fixed upper-id snapshot, advancing cursor even on failure.
// Isolates row failures so next rows proceed; prevents starvation under backlog.
async function processBatch(batchSize: number = 500): Promise<number> {
  const maxRows = await prisma.order.findMany({
    where: { status: { in: ['ERROR', 'PARTIAL'] }, is_refund: false },
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
      where: { status: { in: ['ERROR', 'PARTIAL'] }, is_refund: false, id: { gt: lastId, lte: maxId } },
      take: batchSize,
      orderBy: { id: 'asc' },
    });
    if (orders.length === 0) break;

    for (const order of orders) {
      try {
        // Laravel refund() parity: per-unit of remains, except remains=0 (ERROR: full; PARTIAL: nothing delivered-partial -> 0) or remains>=qty.
        let amountRefund = Number(order.price);
        if (order.remains > 0 && order.remains < order.quantity) {
          amountRefund = Math.ceil((Number(order.price) / order.quantity) * order.remains);
        } else if (order.remains === 0 && order.status === 'PARTIAL') {
          amountRefund = 0;
        }

        let balanceAfter = 0;
        await prisma.$transaction(async (tx) => {
          if (!Number.isFinite(amountRefund) || amountRefund < 0 || !Number.isFinite(Number(order.profit)) ||
              order.quantity <= 0 || order.remains < 0 || order.remains > order.quantity) throw new Error('Invalid refund');
          const claimed = await tx.order.updateMany({
            where: { id: order.id, is_refund: false, status: order.status,
              price: order.price, profit: order.profit, remains: order.remains, quantity: order.quantity },
            data: { is_refund: true },
          });
          if (claimed.count === 0) throw new Error('ALREADY_PROCESSED');
          const credited = await creditGuard(tx, order.user_id, amountRefund);
          const balanceBefore = credited.balanceBefore;
          balanceAfter = credited.balanceAfter;
          await tx.balanceLog.create({
            data: { user_id: order.user_id, type: 'PLUS', action: 'Refund', amount: amountRefund, balance_before: balanceBefore, balance_after: balanceAfter, description: `Pengembalian Dana Pesanan #${order.id}` },
          });
          await tx.order.update({
            where: { id: order.id },
            data: {
              is_refund: true,
              profit: order.remains > 0
                ? Math.ceil((Number(order.profit) / order.quantity) * (order.quantity - order.remains))
                : 0,
            },
          });
        });
        void notifyUser(order.user_id, 'order', `Refund pesanan #${order.id}`,
          `<p>Pesanan <b>#${order.id}</b> direfund Rp ${amountRefund.toLocaleString('id-ID')}. Saldo baru: Rp ${balanceAfter.toLocaleString('id-ID')}.</p>`);
        console.log(`Berhasil, ID: ${order.id} | Jumlah: Rp ${amountRefund}`);
      } catch (e) {
        console.error(`Gagal refund ID: ${order.id} | ${e}`);
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
    console.log('Tidak ada pesanan yang gagal.');
  }
  await prisma.$disconnect();
}

main().catch(console.error);