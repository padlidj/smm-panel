// Seed demo account + realistic catalog. Idempotent: re-run safe.
// Usage: npx tsx prisma/seed-demo.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATALOG: Record<string, { name: string; price: number; min: number; max: number; desc: string }[]> = {
  Instagram: [
    { name: 'Instagram Followers [Real Quality]', price: 45000, min: 100, max: 50000, desc: 'Followers real, garansi 30 hari refill.' },
    { name: 'Instagram Likes [Instant]', price: 12000, min: 50, max: 100000, desc: 'Likes cepat mulai <5 menit.' },
    { name: 'Instagram Views Reels', price: 5000, min: 1000, max: 1000000, desc: 'Views reels murah meriah.' },
    { name: 'Instagram Story Views', price: 8000, min: 100, max: 20000, desc: 'Views story auto-rotate.' },
  ],
  TikTok: [
    { name: 'TikTok Followers [Fast]', price: 55000, min: 100, max: 100000, desc: 'Followers tiktok drop cepat.' },
    { name: 'TikTok Likes', price: 15000, min: 50, max: 200000, desc: 'Likes video tiktok.' },
    { name: 'TikTok Views', price: 2000, min: 1000, max: 5000000, desc: 'Views per 1K sangat murah.' },
  ],
  YouTube: [
    { name: 'YouTube Subscribers [Non-Drop]', price: 120000, min: 10, max: 10000, desc: 'Subs tahan lama, garansi 60 hari.' },
    { name: 'YouTube Watch Hours', price: 90000, min: 100, max: 4000, desc: 'Watch hours aman monetisasi.' },
    { name: 'YouTube Views', price: 25000, min: 500, max: 100000, desc: 'Views organik.' },
  ],
  Facebook: [
    { name: 'Facebook Page Followers', price: 40000, min: 100, max: 50000, desc: 'Followers halaman fb.' },
    { name: 'Facebook Post Likes', price: 18000, min: 50, max: 20000, desc: 'Likes postingan.' },
  ],
  Telegram: [
    { name: 'Telegram Group Members', price: 60000, min: 100, max: 30000, desc: 'Member grup telegram.' },
    { name: 'Telegram Post Views', price: 4000, min: 500, max: 500000, desc: 'Views postingan channel.' },
  ],
  Shopee: [
    { name: 'Shopee Product Followers', price: 35000, min: 100, max: 20000, desc: 'Toko shopee followers.' },
    { name: 'Shopee Product Reviews [5 Star]', price: 80000, min: 10, max: 1000, desc: 'Review bintang 5 + teks.' },
  ],
};

async function main() {
  // 1. Provider (MANUAL usually exists from base seed)
  let provider = await prisma.serviceProvider.findFirst({ where: { name: 'MANUAL' } });
  if (!provider) {
    provider = await prisma.serviceProvider.create({
      data: { name: 'MANUAL', provider_id: 'MANUAL', provider_key: 'none', status: true, is_refill_support: false, currency: 'IDR' },
    });
  }

  // 2. Categories + services
  let svcCount = 0;
  const firstSvcIds: number[] = [];
  for (const [catName, svcs] of Object.entries(CATALOG)) {
    let cat = await prisma.serviceCategory.findFirst({ where: { name: catName } });
    if (!cat) cat = await prisma.serviceCategory.create({ data: { name: catName } });
    for (const s of svcs) {
      const existing = await prisma.service.findFirst({ where: { name: s.name, category_id: cat.id } });
      if (existing) { firstSvcIds.push(existing.id); continue; }
      const created = await prisma.service.create({
        data: { category_id: cat.id, provider_id: provider.id, name: s.name, price: s.price, profit: Math.floor(s.price * 0.6), min: s.min, max: s.max, description: s.desc, status: true },
      });
      firstSvcIds.push(created.id);
      svcCount++;
    }
  }
  console.log(`Services: +${svcCount} created, total ${firstSvcIds.length} in catalog`);

  // 3. Demo user
  const pass = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: { username: 'demo', email: 'demo@kuygas.my.id', password: pass, balance: 750000, role: 'USER', status: 'ACTIVE' },
  });
  console.log(`Demo user id=${user.id} (demo/demo123)`);

  // already seeded?
  const existingOrders = await prisma.order.count({ where: { user_id: user.id } });
  if (existingOrders > 0) { console.log(`Orders already exist (${existingOrders}), skipping history seed`); return; }

  // 4. Order history spread over last 14 days
  const allSvcs = await prisma.service.findMany({ where: { id: { in: firstSvcIds } } });
  const statuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'PROCESSING', 'PENDING', 'ERROR'] as const;
  const targets = ['https://instagram.com/kuygas.demo', 'https://vt.tiktok.com/demo123', 'https://youtube.com/watch?v=demo', 'kuygas_toko', 'https://t.me/kuygasdemo'];
  let i = 0;
  for (const svc of allSvcs.concat(allSvcs.slice(0, 6))) {
    const daysAgo = Math.floor(i / 1.5);
    const created = new Date(Date.now() - daysAgo * 86_400_000 - i * 3_600_000);
    const qty = Math.min(svc.max, Math.max(svc.min, 1000 + i * 500));
    const price = Math.ceil((svc.price / 1000) * qty);
    const status = statuses[i % statuses.length];
    await prisma.order.create({
      data: {
        user_id: user.id, service_id: svc.id, provider_id: svc.provider_id,
        service_name: svc.name, target: targets[i % targets.length], quantity: qty,
        price, profit: Math.floor(price * 0.6), status,
        start_count: status === 'SUCCESS' ? qty : 0, remains: status === 'SUCCESS' ? 0 : qty,
        is_refund: status === 'ERROR',
        created_at: created, updated_at: created,
      },
    });
    i++;
  }
  console.log(`Orders: ${i} created`);

  // 5. Deposits
  const dep1 = new Date(Date.now() - 12 * 86_400_000);
  const dep2 = new Date(Date.now() - 5 * 86_400_000);
  await prisma.deposit.createMany({ data: [
    { user_id: user.id, amount: 500000, fee: 0, net: 500000, method: 'qris', status: 'SUCCESS', created_at: dep1, updated_at: dep1 },
    { user_id: user.id, amount: 300000, fee: 0, net: 300000, method: 'qris', status: 'SUCCESS', created_at: dep2, updated_at: dep2 },
  ] });

  // 6. Balance logs
  await prisma.balanceLog.createMany({ data: [
    { user_id: user.id, type: 'PLUS', action: 'Deposit', amount: 500000, balance_before: 0, balance_after: 500000, description: 'Deposit via qris' },
    { user_id: user.id, type: 'MINUS', action: 'Order', amount: 45000, balance_before: 500000, balance_after: 455000, description: 'Order Instagram Followers' },
    { user_id: user.id, type: 'PLUS', action: 'Deposit', amount: 300000, balance_before: 455000, balance_after: 755000, description: 'Deposit via qris' },
  ] });

  // 7. Ticket + admin reply
  const t = await prisma.ticket.create({
    data: { user_id: user.id, subject: 'Cara klaim garansi refill?', message: 'Halo, followers saya turun 10%, bagaimana cara klaim garansi refill?', status: 'REPLIED' },
  });
  await prisma.ticketReply.create({
    data: { ticket_id: t.id, user_id: null, message: 'Halo kak, silakan order refill dari riwayat pesanan maksimal 7 hari setelah order sukses. Saldo refill gratis ya.', is_admin: true },
  });

  // 8. Favorites
  for (const sid of firstSvcIds.slice(0, 3)) {
    await prisma.serviceFavorite.upsert({
      where: { user_id_service_id: { user_id: user.id, service_id: sid } },
      update: {}, create: { user_id: user.id, service_id: sid },
    });
  }

  console.log('Demo seed complete: demo/demo123, balance 750k, ~25 orders, 2 deposits, 1 ticket, 3 favorites');
}

main().catch(console.error).finally(() => prisma.$disconnect());
