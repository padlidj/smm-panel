'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DepositDetailClient({ deposit, user }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const act = async (action: 'approve' | 'cancel') => {
    setLoading(true);
    const res = await fetch(`/api/admin/deposit/${action}`, {
      method: action === 'approve' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deposit.id }),
    });
    if (res.ok) router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex gap-2">
      {deposit.status === 'PENDING' && (
        <>
          <Button onClick={() => act('approve')} disabled={loading}>Approve</Button>
          <Button variant="destructive" onClick={() => act('cancel')} disabled={loading}>Batalkan</Button>
        </>
      )}
    </div>
  );
}