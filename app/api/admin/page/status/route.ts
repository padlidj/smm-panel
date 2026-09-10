import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  await requireAdmin();
  try {
    const { id, action, target } = await req.json();
    const num = parseInt(id);
    if (!num) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    // Laravel: website_information + website_page both have list/form/delete
    const model: any = target === 'information' ? prisma.websiteInformation : prisma.websitePage;
    if (action === 'delete') {
      await model.delete({ where: { id: num } }).catch(() => { throw new Error('NOT_FOUND'); });
      return NextResponse.json({ message: 'Data berhasil dihapus.' });
    }
    if (action === 'toggle') {
      const page = await model.findUnique({ where: { id: num }, select: { status: true } });
      if (!page) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
      await model.update({ where: { id: num }, data: { status: !page.status } });
      return NextResponse.json({ message: 'Status diperbarui' });
    }
    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND' || e?.code === 'P2025') return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
