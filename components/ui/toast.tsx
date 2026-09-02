'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface ToastProps {
  type?: 'success' | 'error';
  message: ReactNode;
}

export function Toast({ type = 'success', message }: ToastProps) {
  const Icon = type === 'success' ? CheckCircle2 : XCircle;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-card px-4 py-3 shadow-lg">
      <Icon className={`h-5 w-5 ${type === 'success' ? 'text-emerald-500' : 'text-destructive'}`} />
      <span className="text-sm">{message}</span>
    </div>
  );
}
