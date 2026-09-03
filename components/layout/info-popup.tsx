'use client';

import { useEffect, useState } from 'react';

export function InfoPopup() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/information/latest')
      .then(r => r.json())
      .then(d => {
        const latest = d.data;
        if (latest && localStorage.getItem('information_popup') !== String(latest.id)) setInfo(latest);
      })
      .catch(() => {});
  }, []);

  if (!info) return null;
  const close = () => { localStorage.setItem('information_popup', String(info.id)); setInfo(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={close}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{info.title}</h2>
        <div className="prose prose-sm dark:prose-invert max-h-64 overflow-auto max-w-none" dangerouslySetInnerHTML={{ __html: info.content }} />
        <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" onClick={close}>Tutup</button>
      </div>
    </div>
  );
}
