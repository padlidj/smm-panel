import { prisma } from './prisma';

// ponytail: 60s in-process cache; invalidate via bump() on settings save if staleness matters
let cache: { value: any; at: number } | null = null;

export async function getMainConfig(): Promise<any> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const row = await prisma.websiteConfig.findUnique({ where: { key: 'main' } });
  cache = { value: (row?.value as any) || {}, at: Date.now() };
  return cache.value;
}

export function bumpMainConfig() { cache = null; }