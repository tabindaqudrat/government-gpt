import { db } from '@/lib/db';
import { govDocuments } from '@/lib/db/schema/govdocs';
import { desc, eq } from 'drizzle-orm';
import { NewGovDocument } from '@/lib/db/schema/govdocs';

// Get all documents, ordered by newest first
export async function getAllGovDocuments() {
  return await db
    .select({
      id: govDocuments.id,
      title: govDocuments.title,
      category: govDocuments.category,
      documentType: govDocuments.documentType,
      fileUrl: govDocuments.fileUrl,
      summary: govDocuments.summary,
      createdAt: govDocuments.createdAt,
    })
    .from(govDocuments)
    .orderBy(desc(govDocuments.createdAt));
}

// Get a single document by ID
export async function getGovDocument(id: string) {
  const results = await db
    .select()
    .from(govDocuments)
    .where(eq(govDocuments.id, id))
    .limit(1);

  return results[0] || null;
}

// Insert a new document (if needed)
export async function createGovDocument(data: NewGovDocument) {
  const [result] = await db
    .insert(govDocuments)
    .values(data)
    .returning();

  return result;
}
