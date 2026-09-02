import { prisma } from '../lib/prisma';

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
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: order.user_id } });
        if (!user) throw new Error('User not found');
        const balanceBefore = Number(user.balance);
        const balanceAfter = balanceBefore + amountRefund;
        await tx.user.update({ where: { id: order.user_id }, data: { balance: balanceAfter } });
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
      console.log(`Berhasil, ID: ${order.id} | Jumlah: Rp ${amountRefund}`);
    } catch (e) {
      console.error(`Gagal refund ID: ${order.id} | ${e}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);