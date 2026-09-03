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

export async function deleteJson(url: string, data: unknown) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan');
  return json;
}

// Confirm → DELETE → reload; alert server message on refusal (FK guards)
export function confirmDelete(url: string, id: number) {
  return async () => {
    if (!confirm('Yakin hapus? Tidak bisa dibatalkan.')) return;
    try { await deleteJson(url, { id }); window.location.reload(); } catch (e: any) { alert(e.message); }
  };
}

export function fmtMoney(n: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(n));
}
