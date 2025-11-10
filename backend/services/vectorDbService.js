import fetch from 'node-fetch';
import '../config/loadEnv.js';


const VECTOR_DB_TYPE = process.env.VECTOR_DB_TYPE || 'qdrant';
const VECTOR_DB_URL = process.env.VECTOR_DB_URL || 'https://e7d7ffe7-3616-4beb-ad2b-da1fc7d6751f.us-east4-0.gcp.cloud.qdrant.io';
const VECTOR_DB_API_KEY = process.env.VECTOR_DB_API_KEY;
const VECTOR_DB_COLLECTION = process.env.VECTOR_DB_COLLECTION || 'pisquared_docs';

/**
 * Service for interacting with Vector Database (Qdrant)
 */
class VectorDbService {
  /**
   * Check if Vector DB is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch(`${VECTOR_DB_URL}/health`, {
        method: 'GET'
      });
      
      if (response.ok) {
        return { status: 'connected', type: VECTOR_DB_TYPE };
      }
      return { status: 'unreachable' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Search for similar documents
   * @param {string} queryEmbedding - Query embedding vector
   * @param {number} limit - Number of results to return
   * @param {string} url - Optional URL filter
   */
  async search(queryEmbedding, limit = 3, url = null) {
    try {
      const filter = url ? {
        must: [{
          key: 'url',
          match: { value: url }
        }]
      } : null;

      const payload = {
        vector: queryEmbedding,
        limit,
        with_payload: true,
        ...(filter && { filter })
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (VECTOR_DB_API_KEY) {
        headers['api-key'] = VECTOR_DB_API_KEY;
      }

      let response = await fetch(
        `${VECTOR_DB_URL}/collections/${VECTOR_DB_COLLECTION}/points/search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      let usedFilter = !!filter;
      let needsMemoryFilter = false;

      // If search fails due to missing index and we have a URL filter, retry without filter
      if (!response.ok && url) {
        const errorText = await response.text();
        if (errorText.includes('Index required') || errorText.includes('not found')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('URL index not found, retrying search without URL filter');
          }
          // Retry without URL filter, but we'll filter in memory
          const retryPayload = {
            vector: queryEmbedding,
            limit: limit * 2, // Get more results since we'll filter in memory
            with_payload: true
          };
          
          response = await fetch(
            `${VECTOR_DB_URL}/collections/${VECTOR_DB_COLLECTION}/points/search`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(retryPayload)
            }
          );
          usedFilter = false;
          needsMemoryFilter = true;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vector DB search error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Map results
      let results = result.result.map(point => ({
        text: point.payload.text,
        url: point.payload.url,
        title: point.payload.title,
        score: point.score,
        id: point.id
      }));

      // If we had a URL filter but couldn't use it in the query, filter in memory
      if (needsMemoryFilter && url) {
        results = results.filter(r => r.url === url).slice(0, limit);
      }

      return results;
    } catch (error) {
      console.error('Vector DB search error:', error);
      throw new Error(`Failed to search vector DB: ${error.message}`);
    }
  }

  /**
   * Upsert documents into vector DB
   * @param {Array} points - Array of points to upsert
   */
  async upsert(points) {
    try {
      const payload = {
        points: points
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (VECTOR_DB_API_KEY) {
        headers['api-key'] = VECTOR_DB_API_KEY;
      }

      const response = await fetch(
        `${VECTOR_DB_URL}/collections/${VECTOR_DB_COLLECTION}/points`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vector DB upsert error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Vector DB upsert error:', error);
      throw new Error(`Failed to upsert to vector DB: ${error.message}`);
    }
  }

  /**
   * Create collection if it doesn't exist
   */
  async createCollection(vectorSize = 1536) {
    try {
      const payload = {
        vectors: {
          size: vectorSize,
          distance: 'Cosine'
        }
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (VECTOR_DB_API_KEY) {
        headers['api-key'] = VECTOR_DB_API_KEY;
      }

      const response = await fetch(
        `${VECTOR_DB_URL}/collections/${VECTOR_DB_COLLECTION}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        }
      );

      if (response.ok || response.status === 400) {
        // 400 means collection already exists, which is fine
        // Create index on 'url' field for filtering
        await this.createUrlIndex();
        return { success: true };
      }

      const errorText = await response.text();
      throw new Error(`Failed to create collection: ${errorText}`);
    } catch (error) {
      console.error('Collection creation error:', error);
      throw error;
    }
  }

  /**
   * Create index on 'url' field for filtering
   */
  async createUrlIndex() {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (VECTOR_DB_API_KEY) {
        headers['api-key'] = VECTOR_DB_API_KEY;
      }

      const payload = {
        field_name: 'url',
        field_schema: 'keyword'
      };

      const response = await fetch(
        `${VECTOR_DB_URL}/collections/${VECTOR_DB_COLLECTION}/index`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        }
      );

      if (response.ok || response.status === 400) {
        // 400 means index already exists, which is fine
        return { success: true };
      }

        // If index creation fails, log but don't throw (collection still works)
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to create URL index (non-fatal): ${errorText}`);
        }
        return { success: false, warning: errorText };
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('URL index creation error (non-fatal):', error.message);
        }
      return { success: false, warning: error.message };
    }
  }
}

export const vectorDbService = new VectorDbService();

