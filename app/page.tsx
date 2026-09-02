import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Flame, Globe, Shield, Sparkles, TrendingUp, Users, Zap, ChevronRight, BadgeCheck, Rocket, LifeBuoy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const [serviceCount, userCount, categoryCount] = await Promise.all([
    prisma.service.count({ where: { status: true } }),
    prisma.user.count(),
    prisma.serviceCategory.count({ where: { status: true } }),
  ]);

  const categories = await prisma.serviceCategory.findMany({ where: { status: true }, orderBy: { name: 'asc' }, take: 12 });
  const popular = await prisma.service.findMany({
    where: { status: true },
    include: { category: { select: { name: true } } },
    orderBy: { id: 'asc' }, take: 8,
  });

  const features = [
    { icon: Zap, title: 'Proses Cepat', desc: 'Order diproses otomatis dalam hitungan detik setelah pembayaran' },
    { icon: Shield, title: 'Aman & Terpercaya', desc: 'Sistem terenkripsi, riwayat transparan, anti penipuan' },
    { icon: BarChart3, title: 'Harga Terjangkau', desc: 'Harga bersaing dengan kualitas layanan terbaik' },
    { icon: LifeBuoy, title: 'Support 24/7', desc: 'Tim support siap membantu kapan pun Anda butuh' },
  ];

  const stats = [
    { value: `${serviceCount.toLocaleString('id-ID')}+`, label: 'Layanan Aktif' },
    { value: `${userCount.toLocaleString('id-ID')}+`, label: 'Member Terdaftar' },
    { value: '24/7', label: 'Support Online' },
    { value: '100%', label: 'Garansi Order' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/25">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight leading-none">KuyGas</span>
              <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-widest">SMM Panel</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#layanan" className="hover:text-foreground transition-colors">Layanan</a>
            <a href="#keunggulan" className="hover:text-foreground transition-colors">Keunggulan</a>
            <a href="/service" className="hover:text-foreground transition-colors">Harga Layanan</a>
            <a href="/api_doc" className="hover:text-foreground transition-colors">API</a>
            <a href="/information" className="hover:text-foreground transition-colors">Informasi</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Masuk
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="rounded-lg shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all">
                Daftar Gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-primary/5 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Platform Social Media Marketing No. 1 Indonesia
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            Tingkatkan <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">Social Media</span> Anda Secara Otomatis
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Layanan followers, likes, views, dan engagement untuk semua platform —
            diproses otomatis, aman, dan dengan harga termurah di kelasnya.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="rounded-xl px-8 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all group">
                Mulai Sekarang
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/service">
              <Button variant="outline" size="lg" className="rounded-xl px-8">
                Lihat Layanan
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-2xl border bg-card/60 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t bg-muted/20 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kategori Layanan</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pilih platform yang ingin Anda kembangkan</p>
            </div>
            <Link href="/service" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Semua Layanan <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((c, i) => {
              const icons = [Globe, Users, TrendingUp, Zap, Sparkles, Flame, Shield, Rocket];
              const Icon = icons[i % icons.length];
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/service/${c.id}`}
                  className="group rounded-xl border bg-card p-5 text-center transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
                >
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium line-clamp-1">{c.name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="keunggulan" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Kenapa Pilih KuyGas?</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Kami menggabungkan teknologi otomatisasi dengan layanan terbaik untuk hasil maksimal
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <div key={f.title} className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES */}
      <section id="layanan" className="border-t bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Layanan Populer</h2>
            <p className="mt-3 text-muted-foreground">Mulai dari Rp {Math.min(...popular.map(s => s.price)).toLocaleString('id-ID')}/1K</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map(s => (
              <div key={s.id} className="group flex flex-col rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{s.category?.name || 'Layanan'}</span>
                  <BadgeCheck className="h-4 w-4 text-success" />
                </div>
                <h3 className="mb-1 line-clamp-2 font-medium text-sm min-h-10">{s.name}</h3>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Harga / 1K</div>
                    <div className="font-bold text-primary">Rp {s.price.toLocaleString('id-ID')}</div>
                  </div>
                  <Link href="/auth/login">
                    <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                      Order <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Cara Kerja</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Hanya 4 langkah mudah untuk memulai</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'Daftar Akun', d: 'Buat akun gratis dalam 1 menit, tanpa ribet' },
              { n: '02', t: 'Isi Saldo', d: 'Deposit mudah via bank, e-wallet, atau QRIS' },
              { n: '03', t: 'Pesan Layanan', d: 'Pilih layanan, masukkan target, dan submit' },
              { n: '04', t: 'Proses Otomatis', d: 'Order diproses sistem, pantau real-time' },
            ].map(s => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-bold text-primary/15">{s.n}</div>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 py-14 text-center shadow-2xl shadow-primary/25">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Siap Mengembangkan Social Media Anda?</h2>
              <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
                Bergabung dengan ribuan member yang sudah merasakan layanan kami
              </p>
              <Link href="/auth/register">
                <Button size="lg" className="mt-8 rounded-xl bg-white text-primary hover:bg-white/90 shadow-xl px-10">
                  Daftar Sekarang <Rocket className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/50">
                  <Flame className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">KuyGas</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Platform social media marketing terpercaya di Indonesia.</p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Layanan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/service" className="hover:text-primary">Harga Layanan</a></li>
                <li><a href="/auth/register" className="hover:text-primary">Daftar Member</a></li>
                <li><a href="/api_doc" className="hover:text-primary">API Reseller</a></li>
                <li><a href="/hof" className="hover:text-primary">Hall of Fame</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Bantuan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/information" className="hover:text-primary">Informasi</a></li>
                <li><a href="/auth/login" className="hover:text-primary">Status Pesanan</a></li>
                <li><a href="/auth/forgot" className="hover:text-primary">Lupa Password</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Hubungi Kami</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Telegram: @kuygas</li>
                <li>Email: support@kuygas.my.id</li>
                <li>Jam Operasional: 24/7</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} KuyGas Panel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}