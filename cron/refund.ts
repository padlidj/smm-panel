import { prisma } from '../lib/prisma';
import { creditBalance } from '../lib/balance';

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['ERROR', 'PARTIAL'] }, is_refund: false },
    take: 50,
    orderBy: { id: 'desc' },
  });

  if (orders.length === 0) {
    console.log('Tidak ada pesanan yang gagal.');
    return;
  }

  for (const order of orders) {
    let amountRefund = Number(order.price);
    if (order.remains > 0 && order.remains <= order.quantity) {
      amountRefund = Math.ceil((Number(order.price) / order.quantity) * order.remains);
    }

    try {
      await creditBalance(order.user_id, amountRefund, 'Refund', `Pengembalian Dana Pesanan #${order.id}`);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          is_refund: true,
          profit: order.remains > 0
            ? Math.ceil((Number(order.profit) / order.quantity) * (order.quantity - order.remains))
            : 0,
        },
      });
      console.log(`Berhasil, ID: ${order.id} | Jumlah: Rp ${amountRefund}`);
    } catch (e) {
      console.error(`Gagal refund ID: ${order.id} | ${e}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);