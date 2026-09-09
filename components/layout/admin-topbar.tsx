'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

export function AdminTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const username = session?.user?.name || 'Admin';
  const level = (session?.user as any)?.level || 'ADMIN';

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
      <div className="text-sm text-muted-foreground hidden sm:inline">Administrator Panel</div>
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
              <div className="text-xs text-muted-foreground truncate">{level}</div>
            </div>
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