import { Loader2 } from 'lucide-react';

export function Loading({ label = 'Memuat...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loading />
    </div>
  );
}
