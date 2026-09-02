import { prisma } from './prisma';

export async function debitBalance(userId: number, amount: number, action: string, description?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.balance) < amount) throw new Error('Saldo tidak mencukupi');

    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore - amount;

    await tx.user.update({ where: { id: userId }, data: { balance: balanceAfter } });
    await tx.balanceLog.create({
      data: {
        user_id: userId, type: 'MINUS', action, amount,
        balance_before: balanceBefore, balance_after: balanceAfter, description,
      },
    });

    return { balanceBefore, balanceAfter };
  });
}

export async function creditBalance(userId: number, amount: number, action: string, description?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');

    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore + amount;

    await tx.user.update({ where: { id: userId }, data: { balance: balanceAfter } });
    await tx.balanceLog.create({
      data: {
        user_id: userId, type: 'PLUS', action, amount,
        balance_before: balanceBefore, balance_after: balanceAfter, description,
      },
    });

    return { balanceBefore, balanceAfter };
  });
}