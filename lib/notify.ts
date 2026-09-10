import { prisma } from './prisma';
import { sendEmail } from './email';

// Fire-and-forget user email respecting per-user notification prefs.
// type keys match users.notification JSON: order | ticket | deposit
export async function notifyUser(userId: number, type: string, subject: string, html: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, notification: true } });
    if (!user) return;
    const notif = (user.notification as any) || {};
    if (notif[type] !== '1') return; // Laravel parity: opt-in only (json ...->ticket == '1')
    await sendEmail(user.email, subject, html);
  } catch (e) {
    console.error(`notifyUser(${userId}, ${type}) failed:`, e);
  }
}