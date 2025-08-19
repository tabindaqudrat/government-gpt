const OpenAI = require('openai');
require('dotenv').config();

async function quickTest() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log('Testing API key...');
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "test",
    });
    console.log('✅ API KEY WORKS!');
    console.log('Embedding dimensions:', response.data[0].embedding.length);
  } catch (error) {
    console.log('❌ API key failed:', error.message);
  }
}

quickTest();
