// REDUNDANT - NOT USED

import fetch from 'node-fetch';
import '../config/loadEnv.js';

const ROMA_API_URL = process.env.ROMA_API_URL || 'http://localhost:5000';
const ROMA_PROFILE = process.env.ROMA_PROFILE || 'pisquared_explainer';

/**
 * Service for interacting with ROMA API
 */
class RomaService {
  /**
   * Check if ROMA service is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch(`${ROMA_API_URL}/api/simple/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'connected',
          framework_available: data.framework_available || false,
          simple_agent_ready: data.simple_agent_ready || false
        };
      }
      return { status: 'unreachable' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Execute explanation task using ROMA
   * @param {Object} params - Explanation parameters
   * @param {string} params.goal - The explanation goal/prompt
   * @param {Array} params.contextSnippets - RAG context snippets
   * @param {Object} params.userOptions - User preferences (tone, level, etc.)
   */
  async executeExplanation({ goal, contextSnippets = [], userOptions = {} }) {
    try {
      const MAX_GOAL_LENGTH = 950; // Leave some buffer under 1000 limit
      const INSTRUCTIONS = '\n\nInstructions: Provide a clear, accurate explanation based on the context provided. If the context doesnt contain enough information, say "I couldnt find enough information in the PiSquared documentation to fully explain this." Always cite which snippet(s) you used.';
      
      // Calculate available space for context
      const baseGoalLength = goal.length + INSTRUCTIONS.length;
      let availableSpace = MAX_GOAL_LENGTH - baseGoalLength;
      
      // Build context section with truncation
      let contextSection = '';
      if (contextSnippets.length > 0 && availableSpace > 100) {
        const maxSnippetLength = Math.floor(availableSpace / contextSnippets.length) - 50; // Reserve space for formatting
        
        const truncatedSnippets = contextSnippets.map((snippet, idx) => {
          let snippetText = snippet.text;
          if (snippetText.length > maxSnippetLength) {
            snippetText = snippetText.substring(0, maxSnippetLength - 3) + '...';
          }
          return `[Snippet ${idx + 1} from ${snippet.url}]:\n${snippetText}`;
        });
        
        contextSection = `\n\nContext from PiSquared documentation:\n${truncatedSnippets.join('\n\n')}`;
        
        // Final check - truncate context if still too long
        const testGoal = `${goal}${contextSection}${INSTRUCTIONS}`;
        if (testGoal.length > MAX_GOAL_LENGTH) {
          // Truncate context section to fit
          const contextMaxLength = MAX_GOAL_LENGTH - goal.length - INSTRUCTIONS.length - 50;
          contextSection = contextSection.substring(0, contextMaxLength) + '...';
        }
      }

      let fullGoal = `${goal}${contextSection}${INSTRUCTIONS}`;
      
      // Final safety check - ensure we're under limit
      if (fullGoal.length > MAX_GOAL_LENGTH) {
        console.warn(`Goal length ${fullGoal.length} exceeds limit, truncating to ${MAX_GOAL_LENGTH}...`);
        // Truncate the goal itself, keeping the base prompt
        const goalBase = goal.substring(0, Math.min(goal.length, 300));
        fullGoal = `${goalBase}${INSTRUCTIONS}`;
      }

      // Call ROMA's simple API
      const response = await fetch(`${ROMA_API_URL}/api/simple/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: fullGoal,
          options: {
            max_steps: 5, // Keep it simple for explanations
            skip_atomization: true, // Explanations are atomic tasks
            enable_hitl: false
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ROMA API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Debug: Log the full result structure
      console.log('ROMA API response:', JSON.stringify(result, null, 2));
      
      // Try multiple possible result fields
      let explanation = null;
      if (result.final_result) {
        explanation = result.final_result;
      } else if (result.result) {
        explanation = result.result;
      } else if (result.final_output) {
        explanation = result.final_output;
      } else if (result.output) {
        explanation = result.output;
      } else if (result.framework_result) {
        // Try to extract from framework_result
        if (typeof result.framework_result === 'string') {
          explanation = result.framework_result;
        } else if (result.framework_result?.final_result) {
          explanation = result.framework_result.final_result;
        } else if (result.framework_result?.result) {
          explanation = result.framework_result.result;
        }
      }
      
      // If still no explanation, check if there's an error
      if (!explanation || explanation.trim() === '') {
        if (result.error) {
          throw new Error(`ROMA execution failed: ${result.error}`);
        }
        console.warn('No explanation found in ROMA response, result keys:', Object.keys(result));
        explanation = 'No explanation was generated. The task may have failed or returned an empty result.';
      }
      
      return {
        explanation: explanation,
        executionId: result.execution_id,
        status: result.status || 'completed',
        sources: contextSnippets.map(s => s.url),
        metadata: {
          steps: result.execution_stats?.steps_completed || 0,
          nodeCount: result.node_count || 0
        }
      };
    } catch (error) {
      console.error('ROMA execution error:', error);
      throw new Error(`Failed to execute ROMA explanation: ${error.message}`);
    }
  }

  /**
   * Alternative: Use ROMA's FastAPI endpoint if available
   */
  async executeViaFastAPI({ goal, contextSnippets = [], userOptions = {} }) {
    const fastApiUrl = process.env.ROMA_FASTAPI_URL || 'http://localhost:8000';
    
    try {
      const contextSection = contextSnippets.length > 0
        ? `\n\nContext from PiSquared documentation:\n${contextSnippets.map((snippet, idx) => 
            `[Snippet ${idx + 1} from ${snippet.url}]:\n${snippet.text}\n`
          ).join('\n')}`
        : '';

      const fullGoal = `${goal}${contextSection}`;

      const response = await fetch(`${fastApiUrl}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: fullGoal,
          profile: ROMA_PROFILE,
          max_steps: 5,
          save_state: false
        })
      });

      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        explanation: result.result || 'Explanation generated',
        executionId: result.execution_id,
        status: result.status,
        sources: contextSnippets.map(s => s.url)
      };
    } catch (error) {
      console.error('FastAPI execution error:', error);
      throw error;
    }
  }
}

export const romaService = new RomaService();


