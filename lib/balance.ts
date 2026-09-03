import { prisma } from './prisma';

// Atomic conditional UPDATE — no read-then-write window, so concurrent requests
// cannot both pass the balance check. Use this inside any tx that moves money out.
export async function debitGuard(tx: any, userId: number, amount: number) {
  const changed = await tx.$executeRaw`
    UPDATE users SET balance = balance - ${amount}, updated_at = NOW()
    WHERE id = ${userId} AND balance >= ${amount}`;
  if (changed === 0) throw new Error('Saldo tidak mencukupi');
  const after = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
  return { balanceAfter: Number(after!.balance), balanceBefore: Number(after!.balance) + amount };
}

export async function debitBalance(userId: number, amount: number, action: string, description?: string) {
  return prisma.$transaction(async (tx) => {
    const { balanceBefore, balanceAfter } = await debitGuard(tx, userId, amount);
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
    const changed = await tx.$executeRaw`
      UPDATE users SET balance = balance + ${amount}, updated_at = NOW()
      WHERE id = ${userId}`;
    if (changed === 0) throw new Error('User tidak ditemukan');
    const after = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    const balanceAfter = Number(after!.balance);
    const balanceBefore = balanceAfter - amount;
    await tx.balanceLog.create({
      data: {
        user_id: userId, type: 'PLUS', action, amount,
        balance_before: balanceBefore, balance_after: balanceAfter, description,
      },
    });
    return { balanceBefore, balanceAfter };
  });
}