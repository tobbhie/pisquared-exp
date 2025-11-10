import OpenAI from 'openai';
import '../config/loadEnv.js';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openrouter'; // 'openrouter', or 'fireworks'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;

// Model configurations
const OPENROUTER_MODEL = process.env.LLM_MODEL || 'openai/gpt-4o-mini';
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || 'accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new';

let openaiClient = null;
let currentModel = null;
let currentProvider = null;

/**
 * Direct LLM service for explanations
 * Supports: OpenRouter and Fireworks (Dobby)
 */
class LLMService {
  constructor() {
    // Initialize based on provider preference
    if (LLM_PROVIDER === 'fireworks' && FIREWORKS_API_KEY) {
      openaiClient = new OpenAI({
        apiKey: FIREWORKS_API_KEY,
        baseURL: 'https://api.fireworks.ai/inference/v1'
      });
      currentModel = FIREWORKS_MODEL;
      currentProvider = 'fireworks';
      if (process.env.NODE_ENV === 'development') {
        console.log(`LLM Service: Using Fireworks (Dobby) - ${FIREWORKS_MODEL}`);
      }
    } else if (OPENROUTER_API_KEY) {
      openaiClient = new OpenAI({
        apiKey: OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://pi2-explainer.local',
          'X-Title': 'Pi2 Explainer'
        }
      });
      currentModel = OPENROUTER_MODEL;
      currentProvider = 'openrouter';
      if (process.env.NODE_ENV === 'development') {
        console.log(`LLM Service: Using OpenRouter - ${OPENROUTER_MODEL}`);
      }
    }
  }

  /**
   * Generate explanation directly using LLM
   * @param {string} prompt - Full prompt with context
   * @returns {Promise<string>} Explanation text
   */
  async generateExplanation(prompt) {
    if (!openaiClient) {
      throw new Error('LLM client not initialized. Set FIREWORKS_API_KEY or OPENROUTER_API_KEY');
    }

    try {
      // Lower temperature for Dobby to reduce "unhinged" behavior
      const temperature = currentProvider === 'fireworks' ? 0.3 : 0.7;
      
      // System message for better control, especially for Dobby
      const systemMessage = currentProvider === 'fireworks' 
        ? `You are a professional technical explainer. Your task is to explain technical concepts clearly and accurately. 
        
CRITICAL RULES:
- Stay focused on explaining the EXACT text provided by the user
- Use professional, clear language - avoid slang, profanity, or overly casual expressions
- If context snippets are provided, ONLY reference them if they ACTUALLY contain relevant information about the specific terms/concepts being explained
- Do NOT claim snippets contain information they don't actually contain - be honest about what information is available
- If the text mentions specific technical terms, check if context snippets actually explain those terms before referencing them
- If context snippets are irrelevant or don't contain useful information, do not reference them at all
- If the text is about a specific technical concept, explain that concept directly
- Do not go off-topic or provide generic information
- Be concise, accurate, and helpful
- Maintain a professional but friendly tone`
        : `You are a professional technical explainer. Provide clear, accurate explanations of technical concepts. Only reference context snippets if they actually contain relevant information.`;

      const response = await openaiClient.chat.completions.create({
        model: currentModel,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 500 // Limit response length for explanations
      });

      const explanation = response.choices[0]?.message?.content?.trim();
      if (!explanation) {
        throw new Error('No explanation generated from LLM');
      }

      return explanation;
    } catch (error) {
      console.error(`LLM explanation error (${currentProvider}):`, error);
      throw new Error(`Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Get current provider and model info
   */
  getProviderInfo() {
    return {
      provider: currentProvider,
      model: currentModel
    };
  }
}

export const llmService = new LLMService();

