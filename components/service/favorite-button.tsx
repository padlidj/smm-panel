'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export function FavoriteButton({ serviceId, initial }: { serviceId: number; initial: boolean }) {
  const [favorited, setFavorited] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/service/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: serviceId }),
      });
      const data = await res.json();
      if (data.status) setFavorited(data.favorited);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={favorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}
      className={`p-1 rounded-md transition-colors ${favorited ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
    >
      <Star className={`h-4 w-4 ${favorited ? 'fill-yellow-500' : ''}`} />
    </button>
  );
}