'use client';

export async function postForm(url: string, data: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan');
  return json;
}

export function fmtMoney(n: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(n));
}
