'use server';

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { documents, insertDocumentSchema } from '@/lib/db/schema/documents';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';
import { nanoid } from 'nanoid';

// Helper function to detect section headers
function detectSection(content: string): string | null {
  // Enhanced section header patterns for government documents
  const sectionPatterns = [
    /^#{1,6}\s+(.+)$/m,              // Markdown headers
    /^Article\s+\d+[:\s](.+)/im,     // Article 25: Title
    /^Sub-article\s+\d+[:\s](.+)/im, // Sub-article 2: Title
    /^Section\s+\d+[:\s](.+)/im,     // Section 3: Title
    /^Rule\s+\d+[:\s](.+)/im,        // Rule 12: Title
    /^Chapter\s+[A-Z]+[:\s](.+)/im,  // Chapter II: Title
    /^Part\s+[A-Z]+[:\s](.+)/im,     // Part IV: Title
    /^Clause\s+\d+[:\s](.+)/im,      // Clause 3: Title
    /^Para\s+\d+[:\s](.+)/im,        // Para 4: Title
    /^Schedule\s+[A-Z]+[:\s](.+)/im, // Schedule I: Title
    /^([A-Z][A-Za-z\s]{2,}:)/m,      // Capitalized words followed by colon
    /^(\d+\.\d*\s+[A-Z][A-Za-z\s]{2,})/m, // Numbered sections
    /^([A-Z][A-Za-z\s]{2,})$/m,      // All-caps or Title Case lines
  ];

  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// Helper function to detect timestamps or dates
function detectTimestamp(content: string): string | null {
  // Common date/time patterns
  const datePatterns = [
    // ISO dates: 2024-03-21
    /\b(\d{4}-\d{2}-\d{2})\b/,
    // Common date formats: 21/03/2024, 03/21/2024
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
    // Written dates: March 21, 2024
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/,
    // Times: 14:30:00, 2:30 PM
    /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\b/
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface ChunkMetadata {
  pageNumber: number;
  section: string | null;
  timestamp: string | null;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const blob = new Blob([await file.arrayBuffer()]);
  const loader = new PDFLoader(blob, {
    splitPages: true,
    parsedItemSeparator: '\n',
  });
  
  const docs = await loader.load();
  return docs.map(d => d.pageContent).join('\n');
}

async function createDocument({ title, type, content, originalFileName }: {
  title: string;
  type: string;
  content: string;
  originalFileName: string;
}) {
  // Store the full document
  const [document] = await db
    .insert(documents)
    .values({
      title,
      type,
      content,
      originalFileName,
    })
    .returning();

  // Split content into chunks with improved strategy
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200, // Smaller chunks for more focused content
    chunkOverlap: 200, // Reduced overlap for efficiency
    separators: [
      "\n\n", "\n", 
      "Article ", "Section ", "Rule ", "Chapter ", // Government-specific separators
      "Sub-article ", "Clause ", "Para ", "Schedule ",
      ".", "!", "?", ";", 
      ",", " ", ""
    ],
    keepSeparator: true,
  });

  const chunks = await splitter.createDocuments([content]);

  // Process chunks in smaller batches to avoid rate limits with new model
  const batchSize = 3; // Reduced batch size for better rate limiting
  const embeddingsArray = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(chunks.length / batchSize)}`);
    
    const batchEmbeddings = await Promise.all(
      batch.map(chunk => generateEmbeddings({
        pageContent: chunk.pageContent,
        metadata: {
          pageNumber: chunk.metadata.pageNumber || 1,
          section: detectSection(chunk.pageContent),
          timestamp: detectTimestamp(chunk.pageContent),
        } as ChunkMetadata
      }))
    );
    
    embeddingsArray.push(...batchEmbeddings);
    
    // Add a delay between batches to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay
    }
  }

  // Store embeddings with metadata
  await db.insert(embeddingsTable).values(
    embeddingsArray.flat().map(({ embedding, content, metadata }) => ({
      id: nanoid(),
      resourceId: document.id,
      embedding,
      content,
      metadata
    }))
  );

  return document;
}

export const uploadDocument = async (
  formData: FormData
): Promise<{ success: boolean; message: string; document?: any }> => {
  try {
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const bulletinDate = formData.get('date') as string;
    
    console.log('Starting document upload:', { title, type, fileName: file.name });
    
    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const text = await extractTextFromPDF(file);
    console.log('Text extraction complete');

    // Create document first
    console.log('Creating document record...');
    const document = await createDocument({
      title,
      type,
      content: text,
      originalFileName: file.name,
    });
    console.log('Document record created:', document.id);

    // Handle different document types
    if (type === 'policies') {
      console.log('Processing policies document — no extra action needed.');
    } else if (type === 'services') {
      console.log('Processing services document — no extra action needed.');
    } else if (type === 'rules_policy') {
      console.log('Processing rules and policy document (legacy) — no extra action needed.');
    } else if (type === 'citizen_services') {
      console.log('Processing citizen service document (legacy) — no extra action needed.');
    } else if (type === 'amendment') {
      console.log('Processing amendment document (legacy) — no extra action needed.');
    } else {
      console.warn(`Unhandled document type: ${type} — skipping additional processing.`);
    }

    return {
      success: true,
      message: 'Document uploaded successfully',
      document
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    return {
      success: false,
      message: 'Error uploading document: ' + (error as Error).message
    };
  }
};

