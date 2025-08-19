import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { govDocuments } from '@/lib/db/schema/govdocs';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  try {
    const allDocs = await db.query.govDocuments.findMany({
      orderBy: [desc(govDocuments.createdAt)],
    });
    return NextResponse.json(allDocs);
  } catch (error) {
    console.error('Failed to fetch gov documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
