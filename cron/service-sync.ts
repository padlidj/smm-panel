import { prisma } from '../lib/prisma';
import { syncProviderServices } from '../lib/provider';

async function main() {
  const providers = await prisma.serviceProvider.findMany({
    where: { status: true, name: { not: 'MANUAL' } },
  });

  if (providers.length === 0) {
    console.log('Tidak ada provider aktif yang perlu disinkronisasi.');
    return;
  }

  for (const provider of providers) {
    const result = await syncProviderServices(provider);
    if (result) {
      console.log(`Sinkronisasi ${provider.name}: ${result.count} layanan (${result.category})`);
    } else {
      console.log(`Gagal sinkronisasi ${provider.name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);