import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  
  // Seed admin
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@smm.local', password: adminPass, level: 'SUPERADMIN' },
  });

  // Seed default configs
  const defaults = [
    { key: 'main', value: { website_name: 'SMM Panel', website_url: 'https://smm.kuygas.my.id', is_register_enabled: true, is_reset_password_enabled: false, is_maintenance: false, logo: '' } },
    { key: 'notification', value: { email: '', order: '1', deposit: '1', ticket: '1' } },
  ];
  for (const config of defaults) {
    await prisma.websiteConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: { key: config.key, value: config.value },
    });
  }

  // Seed deposit methods
  const methods = [
    { payment: 'Bank Transfer', method: 'BCA', type: 'AUTO' as const, min: 10000, max: 10000000, fee_percent: 0 },
    { payment: 'Bank Transfer', method: 'Mandiri', type: 'AUTO' as const, min: 10000, max: 10000000, fee_percent: 0 },
    { payment: 'E-Wallet', method: 'GoPay', type: 'AUTO' as const, min: 5000, max: 5000000, fee_percent: 0 },
    { payment: 'E-Wallet', method: 'OVO', type: 'AUTO' as const, min: 5000, max: 5000000, fee_percent: 0 },
  ];
  for (const method of methods) {
    await prisma.depositMethod.upsert({
      where: { id: 0 }, // force create
      update: {},
      create: method,
    });
  }

  console.log('Seed completed');
}

main().catch(console.error).finally(() => prisma.$disconnect());
