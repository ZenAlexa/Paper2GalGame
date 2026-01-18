/**
 * Paper2GalGame API Server
 *
 * Express server providing API endpoints for:
 * - Paper upload and parsing
 * - Script generation with AI
 * - Voice synthesis (TTS)
 * - Session management
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
// When running from extensions/api, root is ../../..
// When running from project root, we also check current dir
const possiblePaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const envPath of possiblePaths) {
  dotenv.config({ path: envPath });
}
import express from 'express';
import cors from 'cors';

import uploadRouter from './routes/upload.js';
import generateRouter from './routes/generate.js';
import ttsRouter from './routes/tts.js';
import sessionRouter from './routes/session.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config: {
        openrouter: !!process.env.OPENROUTER_API_KEY,
        minimax: !!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID),
        voicevox: process.env.VOICEVOX_URL || 'http://localhost:50021'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/generate', generateRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/session', sessionRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          Paper2GalGame API Server                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://localhost:${PORT}                  ║`);
  console.log('║                                                          ║');
  console.log('║  Endpoints:                                              ║');
  console.log('║    POST /api/upload      - Upload and parse paper        ║');
  console.log('║    POST /api/generate    - Generate WebGAL script        ║');
  console.log('║    POST /api/tts         - Generate voice audio          ║');
  console.log('║    GET  /api/session/:id - Get session status            ║');
  console.log('║    GET  /api/health      - Health check                  ║');
  console.log('║                                                          ║');
  console.log('║  Configuration:                                          ║');
  console.log(`║    OpenRouter API: ${process.env.OPENROUTER_API_KEY ? '✓ configured' : '✗ missing'}                        ║`);
  console.log(`║    Minimax TTS:    ${process.env.MINIMAX_API_KEY ? '✓ configured' : '✗ missing'}                        ║`);
  console.log(`║    VOICEVOX URL:   ${process.env.VOICEVOX_URL || 'http://localhost:50021'}               ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
