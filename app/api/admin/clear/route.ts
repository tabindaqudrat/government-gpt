import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { embeddings } from '@/lib/db/schema/embeddings';
import { documents } from '@/lib/db/schema/documents';

export async function POST(req: NextRequest) {
  try {
    console.log('🗑️ Clearing existing embeddings...');
    const deletedEmbeddings = await db.delete(embeddings);
    console.log('✅ Cleared embeddings table');

    console.log('🗑️ Clearing existing documents...');
    const deletedDocuments = await db.delete(documents);
    console.log('✅ Cleared documents table');

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully! Ready for re-upload with new configuration.',
      clearedTables: ['embeddings', 'documents']
    });
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    return NextResponse.json({
      success: false,
      message: 'Error clearing database: ' + (error as Error).message
    }, { status: 500 });
  }
}
