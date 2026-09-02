'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { useState } from 'react';

export function AdminTopbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const username = session?.user?.name || 'Admin';
  const level = (session?.user as any)?.level || 'ADMIN';

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card">
      <div className="text-sm text-muted-foreground">Administrator Panel</div>
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
                <div className="text-xs text-muted-foreground">{level}</div>
              </div>
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