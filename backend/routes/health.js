import express from 'express';
import { llmService } from '../services/llmService.js';
import { vectorDbService } from '../services/vectorDbService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check LLM service
    const llmInfo = llmService.getProviderInfo();
    const llmStatus = llmInfo.provider ? { status: 'connected', ...llmInfo } : { status: 'not_configured' };
    
    // Check Vector DB connection
    const vectorDbStatus = await vectorDbService.checkHealth();
    
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
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRouter };

