import { embed, embedMany, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import { documents } from '../db/schema/documents';
import { nanoid } from '@/lib/utils'

const embeddingModel = openai.embedding('text-embedding-3-small');

// Helper function to preprocess queries
const preprocessQuery = (query: string): string => {
  // Expand common abbreviations for better matching
  const expansions = {
    'KP': 'Khyber Pakhtunkhwa',
    'Govt': 'Government',
    'Dept': 'Department',
    'Admin': 'Administration',
    'Sec': 'Section',
    'Art': 'Article',
    'Para': 'Paragraph',
    'Ch': 'Chapter',
    'Sched': 'Schedule',
    'Sub-sec': 'Sub-section',
    'Min': 'Minister Ministry',
    'DC': 'Deputy Commissioner',
    'AC': 'Assistant Commissioner',
    'Tehsil': 'Tehsil Administrative',
  };
  
  let processed = query;
  Object.entries(expansions).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    processed = processed.replace(regex, `${abbr} ${full}`);
  });
  
  return processed;
};

export const generateEmbeddings = async (
  chunk: { pageContent: string; metadata: { pageNumber: number } }
): Promise<Array<{ embedding: number[]; content: string; metadata: any }>> => {
  const { embedding } = await embed({
    model: embeddingModel,
    value: chunk.pageContent,
  });
  
  return [{
    content: chunk.pageContent,
    embedding,
    metadata: chunk.metadata
  }];
};

export const findRelevantContent = async (userQuery: string) => {
  // Preprocess the query for better matching
  const processedQuery = preprocessQuery(userQuery);
  
  const userQueryEmbedded = await generateEmbeddings({
    pageContent: processedQuery,
    metadata: { pageNumber: 1 }
  });
  
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded[0].embedding,
  )})`;
  
  // Join with documents table to get document context
  const similarContent = await db
    .select({ 
      content: embeddings.content,
      similarity,
      documentTitle: documents.title,
      documentType: documents.type,
      metadata: embeddings.metadata,
      // Add page number and section info if available
      pageNumber: sql<number>`(${embeddings.metadata}->>'pageNumber')::int`,
      section: sql<string>`${embeddings.metadata}->>'section'`,
    })
    .from(embeddings)
    .leftJoin(documents, eq(embeddings.resourceId, documents.id))
    .where(gt(similarity, 0.3)) // Lower initial threshold for broader search
    .orderBy(desc(similarity))
    .limit(10); // Get more results for filtering

  // Apply adaptive threshold based on top result (adjusted for existing embeddings)
  const topSimilarity = similarContent[0]?.similarity || 0;
  const adaptiveThreshold = Math.max(0.5, topSimilarity - 0.1); // Lowered for existing data
  
  // Filter with adaptive threshold and limit to top 4
  const filteredContent = similarContent
    .filter(c => c.similarity >= adaptiveThreshold)
    .slice(0, 4);

  // Debug log
  console.log('Found relevant content:', {
    originalQuery: userQuery,
    processedQuery,
    totalMatches: similarContent.length,
    filteredMatches: filteredContent.length,
    topSimilarity: similarContent[0]?.similarity,
    adaptiveThreshold,
    documents: filteredContent.map(c => ({
      title: c.documentTitle,
      similarity: c.similarity,
      contentPreview: c.content?.substring(0, 100) + '...'
    }))
  });

  return filteredContent;
};

export async function answerWithContext(userQuery: string): Promise<string> {
  const contextChunks = await findRelevantContent(userQuery);

  const context = contextChunks.map(chunk =>
    `Source: ${chunk.documentTitle} (Page ${chunk.pageNumber})\nSection: ${chunk.section || "N/A"}\nContent:\n${chunk.content}`
  ).join('\n\n---\n\n');

  const { text: answer } = await generateText({
    model: openai('gpt-4o'),
    system: `You are an expert AI assistant trained on official documents from the Government of Khyber Pakhtunkhwa (KP). Use only the provided content to answer citizen and official queries clearly, accurately, and concisely. If the information is not available in the context, respond with: "I'm sorry, this information is not available in the current documents."`,
    messages: [
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${userQuery}`
      }
    ],
    temperature: 0.3,
    maxTokens: 1000
  });

  return answer;
}
