import express from 'express';
import rateLimit from 'express-rate-limit';
import { explainService } from '../services/explainService.js';
import { cacheService } from '../services/cacheService.js';

const router = express.Router();

// Rate limiting: 20 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);

/**
 * POST /api/explain
 * Main endpoint for explaining highlighted text
 */
router.post('/', async (req, res) => {
  try {
    const { url, selected_text, user_options = {}, session_id } = req.body;

    // Validation
    if (!selected_text || selected_text.trim().length === 0) {
      return res.status(400).json({
        error: 'selected_text is required and cannot be empty'
      });
    }

    if (!url) {
      return res.status(400).json({
        error: 'url is required'
      });
    }

    // Check cache first
    const cacheKey = `${url}:${selected_text}:${JSON.stringify(user_options)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cached: true
      });
    }

    // Get explanation from LLM
    const result = await explainService.explain({
      url,
      selectedText: selected_text,
      userOptions: user_options,
      sessionId: session_id
    });

    // Cache the result
    await cacheService.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Explain error:', error);
    res.status(500).json({
      error: 'Failed to generate explanation',
      message: error.message
    });
  }
});

export { router as explainRouter };

