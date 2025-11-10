import OpenAI from 'openai';
import '../config/loadEnv.js';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

let openaiClient = null;

/**
 * Service for generating embeddings
 */
class EmbeddingService {
  constructor() {
    if (EMBEDDING_PROVIDER === 'openai' && OPENROUTER_API_KEY) {
      // Use OpenRouter for OpenAI embeddings
      openaiClient = new OpenAI({
        apiKey: OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
      });
    } else if (process.env.OPENAI_API_KEY) {
      // Use direct OpenAI
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Generate embedding for text
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized. Set OPENROUTER_API_KEY or OPENAI_API_KEY');
    }

    try {
      const response = await openaiClient.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim()
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {Array<string>} texts - Array of texts to embed
   * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await openaiClient.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts.map(t => t.trim())
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
}

export const embeddingService = new EmbeddingService();

