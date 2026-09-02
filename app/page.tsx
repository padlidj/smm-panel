import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Globe, Shield, TrendingUp, Users } from 'lucide-react';

const services = [
  { icon: Globe, title: 'Media Sosial', desc: 'Instagram, TikTok, YouTube, Facebook, Twitter — semua platform utama' },
  { icon: Users, title: 'Followers & Likes', desc: 'Tingkatkan engagement akun Anda dengan layanan followers dan likes' },
  { icon: TrendingUp, title: 'Views & Traffic', desc: 'Tingkatkan visibilitas konten Anda dengan views organik' },
  { icon: Shield, title: 'Aman & Terpercaya', desc: 'Proses aman, harga transparan, tanpa risiko shadowban' },
];

const steps = [
  { step: '1', title: 'Daftar Akun', desc: 'Buat akun gratis dalam 1 menit' },
  { step: '2', title: 'Isi Saldo', desc: 'Deposit via berbagai metode pembayaran' },
  { step: '3', title: 'Pesan Layanan', desc: 'Pilih layanan, masukkan target, dan pesan' },
  { step: '4', title: 'Hasil Otomatis', desc: 'Proses berjalan otomatis, pantau di dashboard' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <div className="text-xl font-bold">SMM Panel</div>
        <div className="flex items-center gap-4">
          <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            Masuk
          </a>
          <a href="/auth/register">
            <Button size="sm">Daftar</Button>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Tingkatkan <span className="text-primary">Social Media</span> Anda
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Platform SMM termurah dan terpercaya untuk meningkatkan followers, likes, views, dan engagement media sosial Anda secara otomatis.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/auth/register">
            <Button size="lg">
              Mulai Sekarang <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
          <a href="/auth/login">
            <Button variant="secondary" size="lg">
              Masuk
            </Button>
          </a>
        </div>
      </section>

      {/* LAYANAN */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Layanan Kami</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <div key={i} className="rounded-lg border bg-card p-6 transition-colors hover:border-primary/50">
                <s.icon className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Cara Kerja</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-t py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Pelanggan Aktif</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="mt-1 text-sm text-muted-foreground">Layanan</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1M+</div>
              <div className="mt-1 text-sm text-muted-foreground">Pesanan Sukses</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SMM Panel. Hak cipta dilindungi.</p>
          <p className="mt-2">Platform social media marketing terpercaya di Indonesia.</p>
        </div>
      </footer>
    </div>
  );
}