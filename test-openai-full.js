const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIKey() {
  console.log('🔑 Testing OpenAI API Key...');
  console.log('Key format:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}...` : 'Not set');
  
  try {
    // Test 1: Embeddings
    console.log('\n📊 Testing Embeddings (text-embedding-ada-002)...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "This is a test document about government policies.",
    });

    console.log('✅ Embeddings working!');
    console.log(`   - Dimensions: ${embeddingResponse.data[0].embedding.length}`);
    console.log(`   - Usage: ${embeddingResponse.usage.total_tokens} tokens`);

    // Test 2: Chat Completion
    console.log('\n💬 Testing Chat Completion (gpt-4o-mini)...');
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond briefly."
        },
        {
          role: "user",
          content: "Hello, can you help me with government documents?"
        }
      ],
      max_tokens: 50
    });

    console.log('✅ Chat completion working!');
    console.log(`   - Response: "${chatResponse.choices[0].message.content}"`);
    console.log(`   - Usage: ${chatResponse.usage.total_tokens} tokens`);

    console.log('\n🎉 SUCCESS: Both embeddings and chat are working perfectly!');
    console.log('🚀 Your RAG system is ready to go!');
    
    return true;
  } catch (error) {
    console.log('\n❌ API Key test failed:');
    console.log('Error:', error.message);
    if (error.status) {
      console.log('Status:', error.status);
    }
    if (error.code) {
      console.log('Code:', error.code);
    }
    return false;
  }
}

testOpenAIKey();
