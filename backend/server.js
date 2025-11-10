import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { explainRouter } from './routes/explain.js';
import { healthRouter } from './routes/health.js';
import { crawlerRouter } from './routes/crawler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const defaultCorsOrigins = [
  'https://pi2.network',
  'https://www.pi2.network',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const envCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(`CORS blocked request from origin: ${origin}`);
    }
    return callback(new Error(`CORS not allowed for origin ${origin}`), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/explain', explainRouter);
app.use('/api/health', healthRouter);
app.use('/api/crawler', crawlerRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Pi2 Explainer Backend',
    version: '1.0.0',
    endpoints: {
      explain: '/api/explain',
      health: '/api/health',
      crawler: '/api/crawler'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
// Bind to 0.0.0.0 to accept connections from all network interfaces (required for Render)
app.listen(PORT, '0.0.0.0', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 Pi2 Explainer Backend running on port ${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  } else {
    console.log(`Pi2 Explainer Backend running on port ${PORT}`);
  }
});

