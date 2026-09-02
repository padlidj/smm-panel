'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function UserTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const username = session?.user?.name || 'User';
  const balance = (session?.user as any)?.balance ?? 0;

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">User Panel</span>
        <Link href="/dashboard/deposit/new" className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent">
          <Wallet className="h-4 w-4" />
          <span>Rp {Number(balance).toLocaleString('id-ID')}</span>
        </Link>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent text-sm"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </span>
          <span className="font-medium">{username}</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-card shadow-lg p-2 space-y-1">
              <div className="px-3 py-2 border-b">
                <div className="font-medium text-sm">{username}</div>
                <div className="text-xs text-muted-foreground">{session?.user?.email}</div>
              </div>
              <Link
                href="/dashboard/account/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}