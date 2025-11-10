import express from 'express';
import { llmService } from '../services/llmService.js';
import { vectorDbService } from '../services/vectorDbService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check LLM service (synchronous, no network call)
    const llmInfo = llmService.getProviderInfo();
    const llmStatus = llmInfo.provider ? { status: 'connected', ...llmInfo } : { status: 'not_configured' };
    
    // Check Vector DB connection with timeout (max 3 seconds)
    let vectorDbStatus = { status: 'unknown' };
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      vectorDbStatus = await Promise.race([
        vectorDbService.checkHealth(),
        timeoutPromise
      ]);
    } catch (error) {
      // If Vector DB check times out or fails, mark as unreachable but don't fail health check
      vectorDbStatus = { 
        status: 'unreachable', 
        error: error.message === 'Timeout' ? 'Health check timeout' : error.message 
      };
    }
    
    // Always return 200 if server is running, even if services are down
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        llm: llmStatus,
        vectorDb: vectorDbStatus
      },
      version: '1.0.0'
    });
  } catch (error) {
    // Only return 503 for critical server errors
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRouter };

