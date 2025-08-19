import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { findRelevantContent } from "@/lib/ai/embedding";

export const maxDuration = 30;

const GREETING_REGEX =
  /^(hi|hello|hey|salam|salaam|assalamualaikum|as-salamu alaykum|hi there|hello there)\b/i;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // 1) Handle greetings up front
  if (GREETING_REGEX.test((lastMessage?.content || "").trim())) {
    const result = streamText({
      model: openai("gpt-4o-mini"),
      temperature: 0,
      system:
        "Reply with exactly this single sentence and nothing else: Hi, how can I assist you about KP government policies and services.",
      messages: [{ role: "user", content: lastMessage.content }],
    });
    return result.toDataStreamResponse();
  }

  // 2) Normal RAG flow
  const relevantContent = await findRelevantContent(lastMessage.content);

  const contextString = relevantContent
    .map((content) => {
      // Improved content cleaning - more aggressive whitespace removal
      const cleanedContent = content.content
        .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with just 2
        .replace(/\s{2,}/g, " ") // Replace 2+ spaces with single space
        .replace(/\n\s+/g, "\n") // Remove spaces after newlines
        .replace(/\s+\n/g, "\n") // Remove spaces before newlines
        .trim();
      
      return `Document: ${content.documentTitle}
Type: ${content.documentType}
Content: ${cleanedContent}
---`;
    })
    .join("\n\n");

  console.log("Context being sent to AI:", {
    relevantContentCount: relevantContent.length,
    contextLength: contextString.length,
    firstContent: relevantContent[0]?.content?.substring(0, 200) + "...",
    documentTitles: relevantContent.map((c) => c.documentTitle),
  });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: `You are Government GPT, an AI assistant that provides concise, accurate answers about KP Government documents.

Here is relevant information from official KP documents:

${contextString}

CRITICAL INSTRUCTION: If no relevant information is provided above (empty context), you MUST respond with: "I don't have information about this specific topic in the provided documents. Please try rephrasing your question or contact the relevant department directly."

IMPORTANT FORMATTING RULES:
- Keep responses under 100 words maximum
- Use minimal spacing - single spaces between words only
- No double line breaks except before source citation
- Avoid bullet points unless absolutely necessary
- Always end with "Source: [Document Name]"
- Be extremely concise and direct

Core Instructions:
1. ONLY provide answers using the provided information above. If the context is empty or irrelevant, say you don't have the information.
2. Never guess or include information that is not part of the provided sources.
3. Structure your responses in a single paragraph format with minimal spacing.
4. For questions about services: mention service name, requirements, and where to apply in one flowing sentence.
5. For rules/policies: briefly explain what the rule means in simple terms.
6. If no relevant information exists, say: "I don't have information about this specific topic in the provided documents."
7. Keep tone formal but conversational, no excessive spacing or formatting.`,
  });

  return result.toDataStreamResponse();
}