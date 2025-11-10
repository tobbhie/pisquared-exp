import express from 'express';
import { Pi2Indexer } from '../crawler/indexer.js';

const router = express.Router();

/**
 * POST /api/crawler/index
 * Trigger manual indexing
 */
router.post('/index', async (req, res) => {
  try {
    const indexer = new Pi2Indexer();
    
    // Run indexing in background
    indexer.index().catch(error => {
      console.error('Indexing error:', error);
    });

    res.json({
      status: 'started',
      message: 'Indexing started in background'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start indexing',
      message: error.message
    });
  }
});

export { router as crawlerRouter };

