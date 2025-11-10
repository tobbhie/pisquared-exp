import { llmService } from './llmService.js';
import { vectorDbService } from './vectorDbService.js';
import { embeddingService } from './embeddingService.js';
import '../config/loadEnv.js';

/**
 * Main service for generating explanations
 */
class ExplainService {
  /**
   * Generate explanation for selected text
   * @param {Object} params
   * @param {string} params.url - Page URL
   * @param {string} params.selectedText - Selected text to explain
   * @param {Object} params.userOptions - User preferences
   * @param {string} params.sessionId - Session ID
   */
  async explain({ url, selectedText, userOptions = {}, sessionId }) {
    try {
      // Step 1: Retrieve relevant context from vector DB
      const contextSnippets = await this.retrieveContext(selectedText, url);

      // Step 2: Generate explanation using direct LLM
      const prompt = this.buildExplanationPrompt(selectedText, contextSnippets, userOptions);
      const explanation = await llmService.generateExplanation(prompt);

      const providerInfo = llmService.getProviderInfo();

      return {
        explanation: explanation,
        executionId: `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          contextSnippetsCount: contextSnippets.length,
          userOptions,
          provider: providerInfo.provider,
          model: providerInfo.model
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Explain service error:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context snippets using RAG
   * @param {string} queryText - Text to search for
   * @param {string} url - Page URL for filtering
   */
  async retrieveContext(queryText, url) {
    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingService.generateEmbedding(queryText);

      // Search vector DB
      // First try with URL filter (same page), then without if not enough results
      let results = await vectorDbService.search(queryEmbedding, 3, url);
      
      if (results.length < 2) {
        // Get more results without URL filter
        const moreResults = await vectorDbService.search(queryEmbedding, 5);
        // Merge and deduplicate
        const seen = new Set(results.map(r => r.id));
        results = [
          ...results,
          ...moreResults.filter(r => !seen.has(r.id))
        ].slice(0, 3);
      }

      // Filter out low-relevance snippets (score < 0.5 indicates poor match)
      const MIN_RELEVANCE_SCORE = 0.5;
      const relevantResults = results.filter(result => result.score >= MIN_RELEVANCE_SCORE);
      
      // If we have at least one relevant result, use those; otherwise use all results but mark as low relevance
      const finalResults = relevantResults.length > 0 ? relevantResults : results;
      
      return finalResults.map(result => ({
        text: result.text,
        url: result.url,
        title: result.title,
        score: result.score,
        isRelevant: result.score >= MIN_RELEVANCE_SCORE
      }));
    } catch (error) {
      console.warn('RAG retrieval failed, continuing without context:', error.message);
      // Return empty array if retrieval fails - LLM can still work without context
      return [];
    }
  }

  /**
   * Build explanation prompt with context for LLM
   * @param {string} selectedText - Selected text
   * @param {Array} contextSnippets - RAG context snippets
   * @param {Object} userOptions - User preferences
   */
  buildExplanationPrompt(selectedText, contextSnippets = [], userOptions = {}) {
    const { tone = 'casual', level = 'beginner', mode = 'explain' } = userOptions;
    
    // Truncate selected text if too long
    const MAX_SELECTED_TEXT_LENGTH = 500;
    if (selectedText.length > MAX_SELECTED_TEXT_LENGTH) {
      selectedText = selectedText.substring(0, MAX_SELECTED_TEXT_LENGTH - 3) + '...';
    }

    const toneInstructions = {
      casual: 'Use a friendly, conversational tone',
      formal: 'Use a professional, formal tone',
      technical: 'Use precise technical language'
    };

    const levelInstructions = {
      beginner: 'Explain in simple terms suitable for beginners. Use analogies and avoid jargon.',
      intermediate: 'Explain with moderate technical detail, assuming some background knowledge.',
      expert: 'Provide a detailed, technical explanation for experts.'
    };

    const modeInstructions = {
      explain: 'Provide a clear explanation',
      'quick-summary': 'Provide a one-sentence summary',
      'bullet-list': 'Provide a bullet-point list',
      'code-example': 'If applicable, include code examples'
    };

    // Build context section - only include relevant snippets
    let contextSection = '';
    const relevantSnippets = contextSnippets.filter(s => s.isRelevant !== false);
    
    if (relevantSnippets.length > 0) {
      const contextText = relevantSnippets.map((snippet, idx) => {
        const relevanceNote = snippet.score < 0.7 ? ' (low relevance)' : '';
        return `[Snippet ${idx + 1} from ${snippet.url}${relevanceNote}]:\n${snippet.text.substring(0, 400)}${snippet.text.length > 400 ? '...' : ''}`;
      }).join('\n\n');
      contextSection = `\n\nContext from PiSquared documentation:\n${contextText}`;
    }

    // Build a more structured, directive prompt
    let prompt = `TASK: ${modeInstructions[mode] || modeInstructions.explain} the following text about PiSquared (Pi² Network).

TEXT TO EXPLAIN:
"${selectedText}"
${contextSection}

INSTRUCTIONS:
1. Focus EXCLUSIVELY on explaining the text provided above. Do not provide generic information about PiSquared.
2. ${toneInstructions[tone] || toneInstructions.casual}
3. ${levelInstructions[level] || levelInstructions.beginner}
4. Keep your explanation concise (2-4 short paragraphs, under 150 words)
5. **CRITICAL - Snippet Usage**: Only reference context snippets if they ACTUALLY contain relevant information about the specific terms/concepts in the text to explain. Do NOT reference snippets that are unrelated or only tangentially related.
6. If the text mentions specific technical terms (like LLVM-K, KORE, etc.), check if the context snippets actually explain these terms. If not, explain based on general knowledge but do NOT claim the snippets contain this information.
7. If you cannot find enough information in the provided context to explain the text, respond with: "I couldn't find enough information in the PiSquared documentation to fully explain this."
8. **Only mention snippet numbers if you actually used information from those specific snippets**. If snippets are provided but don't contain relevant information, do not reference them.

IMPORTANT: 
- Explain the EXACT text provided. Do not go off-topic or provide unrelated information about PiSquared.
- Be honest about snippet relevance - do not claim snippets contain information they don't actually contain.`;

    return prompt;
  }
}

export const explainService = new ExplainService();

