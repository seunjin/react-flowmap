import { type NextRequest, NextResponse } from 'next/server';
import { openInEditor } from 'react-flowmap/next';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const line = parseInt(searchParams.get('line') ?? '1', 10) || 1;
  const editor = process.env['NEXT_EDITOR'] ?? process.env['EDITOR'] ?? 'code';

  if (!file) {
    return NextResponse.json({ ok: false, error: 'missing file' }, { status: 400 });
  }

  const { resolve } = await import('node:path');
  const absPath = resolve(process.cwd(), file);
  openInEditor(absPath, line, editor);

  return NextResponse.json({ ok: true, file: absPath, line, editor });
}
