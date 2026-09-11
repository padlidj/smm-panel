import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// Laravel parity: WebsitePageController@postForm — create/update + title/slug unique + protected slugs.
const PROTECTED_SLUGS = ['pertanyaan-umum', 'kontak-kami', 'ketentuan-layanan'];

export async function POST(req: Request) {
  await requireAdmin();
  try {
    const { id, title, slug, content } = await req.json();
    if (!title || !content) return NextResponse.json({ error: 'Judul dan konten wajib diisi.' }, { status: 400 });
    if (!slug) return NextResponse.json({ error: 'Slug wajib diisi.' }, { status: 400 });
    if (String(title).length > 30) return NextResponse.json({ error: 'Judul maksimal 30 karakter.' }, { status: 400 });
    if (String(slug).length > 40) return NextResponse.json({ error: 'Slug maksimal 40 karakter.' }, { status: 400 });

    const num = id ? parseInt(id) : null;
    if (num) {
      const target = await prisma.websitePage.findUnique({ where: { id: num } });
      if (!target) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
      if (target.slug !== slug && PROTECTED_SLUGS.includes(target.slug))
        return NextResponse.json({ error: 'Slug halaman ini tidak boleh diubah.' }, { status: 400 });
      if (title !== target.title && await prisma.websitePage.findFirst({ where: { title } }))
        return NextResponse.json({ error: 'Judul sudah dipakai halaman lain.' }, { status: 400 });
      if (slug !== target.slug && await prisma.websitePage.findFirst({ where: { slug } }))
        return NextResponse.json({ error: 'Slug sudah dipakai halaman lain.' }, { status: 400 });
      await prisma.websitePage.update({ where: { id: num }, data: { title, slug, content } });
      return NextResponse.json({ message: 'Halaman berhasil diperbarui.' });
    }

    if (await prisma.websitePage.findFirst({ where: { OR: [{ title }, { slug }] } }))
      return NextResponse.json({ error: 'Judul/slug sudah dipakai.' }, { status: 400 });
    await prisma.websitePage.create({ data: { title, slug, content, status: true } });
    return NextResponse.json({ message: 'Halaman berhasil ditambahkan.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
