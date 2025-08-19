import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema/documents';
import { embeddings } from '@/lib/db/schema/embeddings';
import { eq, count, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all documents with their embedding counts
    const documentsWithStats = await db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        originalFileName: documents.originalFileName,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        embeddingCount: count(embeddings.id)
      })
      .from(documents)
      .leftJoin(embeddings, eq(documents.id, embeddings.resourceId))
      .groupBy(
        documents.id,
        documents.title,
        documents.type,
        documents.originalFileName,
        documents.createdAt,
        documents.updatedAt
      )
      .orderBy(desc(documents.createdAt));

    return NextResponse.json(documentsWithStats);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
