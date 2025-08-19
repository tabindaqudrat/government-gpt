import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema/documents';
import { embeddings } from '@/lib/db/schema/embeddings';
import { documentUploads } from '@/lib/db/schema/document-uploads';
import { eq } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting document with ID: ${documentId}`);

    // Step 1: Delete from document_uploads table (foreign key constraint)
    console.log('Deleting from document_uploads table...');
    const deletedUploads = await db
      .delete(documentUploads)
      .where(eq(documentUploads.documentId, documentId));
    
    console.log('✅ Deleted document_uploads records');

    // Step 2: Delete all embeddings associated with this document
    console.log('Deleting associated embeddings...');
    const deletedEmbeddings = await db
      .delete(embeddings)
      .where(eq(embeddings.resourceId, documentId));
    
    console.log('✅ Deleted embeddings');

    // Step 3: Finally delete the document itself
    console.log('Deleting document...');
    const deletedDocument = await db
      .delete(documents)
      .where(eq(documents.id, documentId))
      .returning();

    if (deletedDocument.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('✅ Document deleted successfully');

    return NextResponse.json({
      success: true,
      message: `Document "${deletedDocument[0].title}" deleted successfully`,
      deletedDocument: deletedDocument[0]
    });

  } catch (error) {
    console.error('❌ Error deleting document:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete document: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}
