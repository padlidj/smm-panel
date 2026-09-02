import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-20 left-10 h-56 w-56 rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 shadow-xl shadow-primary/30">
            <Flame className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight leading-none">KuyGas</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">SMM Panel</div>
          </div>
        </div>
        <div className="glass-dark rounded-2xl shadow-2xl animate-slide-up">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} KuyGas Panel — Social Media Marketing Platform
        </p>
      </div>
    </div>
  );
}