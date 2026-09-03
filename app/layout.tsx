import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import SessionProvider from '@/components/layout/session-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMainConfig } from '@/lib/config';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getMainConfig();
  const name = cfg.website_name || 'KuyGas';
  return {
    title: { default: name, template: `%s | ${name}` },
    description: 'Social Media Marketing Panel',
    icons: cfg.logo ? { icon: cfg.logo } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cfg, session] = await Promise.all([
    getMainConfig(),
    getServerSession(authOptions),
  ]);

  // Maintenance mode: everyone except admins sees the maintenance page
  if (cfg.is_maintenance && (session?.user as any)?.role !== 'admin') {
    return (
      <html lang="id" suppressHydrationWarning>
        <body className={`${inter.className} bg-background flex min-h-screen items-center justify-center`}>
          <div className="text-center space-y-4 p-6">
            <div className="text-6xl">🛠️</div>
            <h1 className="text-2xl font-bold">{cfg.website_name || 'KuyGas'} dalam Pemeliharaan</h1>
            <p className="text-muted-foreground max-w-md">
              Kami sedang melakukan pemeliharaan terjadwal. Silakan coba lagi beberapa saat lagi.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}