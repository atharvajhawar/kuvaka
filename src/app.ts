import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  next();
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Lead Qualification API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      offer: 'POST /api/offer',
      upload: 'POST /api/leads/upload',
      score: 'POST /api/score',
      results: 'GET /api/results',
      export: 'GET /api/export/csv'
    }
  });
});

// Error handling
app.use(errorHandler);

export default app;