'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';

export function UserTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const username = session?.user?.name || 'User';
  const balance = (session?.user as any)?.balance ?? 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const menu = ref.current.querySelector<HTMLElement>('a, button');
    menu?.focus();
  }, [open]);

  return (
    <header className="flex items-center justify-between h-16 pl-16 lg:pl-6 pr-3 sm:pr-6 border-b bg-card relative">
      <div className="flex items-center gap-3 text-sm min-w-0">
        <span className="text-muted-foreground hidden sm:inline">User Panel</span>
        <Link href="/dashboard/deposit/new" className="flex items-center gap-1.5 rounded-md border px-2 sm:px-3 py-1.5 text-sm font-medium hover:bg-accent truncate">
          <Wallet className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-32 sm:max-w-none">Rp {Number(balance).toLocaleString('id-ID')}</span>
        </Link>
      </div>
      <div className="flex items-center gap-2" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent text-sm"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </span>
          <span className="font-medium hidden sm:inline">{username}</span>
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} aria-hidden="true" />
          <div className="absolute right-3 sm:right-6 top-full z-30 mt-2 w-56 rounded-md border bg-card shadow-lg p-2 space-y-1 overflow-hidden" role="menu">
            <div className="px-3 py-2 border-b min-w-0">
              <div className="font-medium text-sm truncate">{username}</div>
              <div className="text-xs text-muted-foreground truncate">{session?.user?.email}</div>
            </div>
            <Link
              href="/dashboard/account/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
              role="menuitem"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}
    </header>
  );
}