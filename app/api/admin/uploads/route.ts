import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentUploads } from '@/lib/db/schema/document-uploads';
import { eq } from 'drizzle-orm';
import { uploadDocument } from '@/lib/actions/documents';
// Supabase client import
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const uploads = await db.select().from(documentUploads).orderBy(documentUploads.createdAt);
    return NextResponse.json(uploads);
  } catch (error) {
    console.error('Failed to fetch uploads:', error);
    return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;

    if (!file || !title || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert file to buffer and upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;

    // Upload file to Supabase bucket (bucket name = "s3")
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('s3')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('s3')
      .getPublicUrl(fileName);

    const fileUrl = publicUrlData.publicUrl;

    // Create upload record
    const [upload] = await db.insert(documentUploads).values({
      originalFileName: file.name,
      fileSize: file.size,
      fileUrl,
      status: 'pending',
      metadata: {
        title,
        type,
        ...Object.fromEntries(formData.entries()),
      },
    }).returning();

    // Process document immediately since QStash is not configured
    console.log('Processing document synchronously');
    try {
      // Create FormData for the uploadDocument function
      const processingFormData = new FormData();
      processingFormData.append('file', file);
      processingFormData.append('title', title);
      processingFormData.append('type', type);
      
      // Process the document immediately
      const result = await uploadDocument(processingFormData);
      
      // Update the upload status to completed
      await db.update(documentUploads)
        .set({ 
          status: 'completed',
          processingProgress: 100,
          uploadProgress: 100
        })
        .where(eq(documentUploads.id, upload.id));
      
      console.log('Document processed successfully:', result);
    } catch (processingError) {
      console.error('Error processing document:', processingError);
      // Update status to failed
      await db.update(documentUploads)
        .set({ 
          status: 'failed',
          error: processingError instanceof Error ? processingError.message : 'Processing failed'
        })
        .where(eq(documentUploads.id, upload.id));
    }

    return NextResponse.json(upload);
  } catch (error) {
    console.error('Failed to create upload:', error);
    return NextResponse.json(
      { error: 'Failed to create upload' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, error, uploadProgress, processingProgress } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing upload ID' },
        { status: 400 }
      );
    }

    const [upload] = await db
      .update(documentUploads)
      .set({
        status,
        error,
        uploadProgress,
        processingProgress,
        updatedAt: new Date(),
      })
      .where(eq(documentUploads.id, id))
      .returning();

    return NextResponse.json(upload);
  } catch (error) {
    console.error('Failed to update upload:', error);
    return NextResponse.json(
      { error: 'Failed to update upload' },
      { status: 500 }
    );
  }
}