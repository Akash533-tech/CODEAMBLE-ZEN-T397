require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const govRoutes = require('./routes/gov');
const marketRoutes = require('./routes/market');
const bhuvanRoutes = require('./routes/bhuvan');

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Suppress uncaught errors so server stays alive ─────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[WARN] Uncaught exception:', err.code || err.message);
});

// ─── Security Middleware ────────────────────────────────────────────────────────
// Trust the first proxy (nginx) — required for express-rate-limit behind a reverse proxy
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_A_URL || 'http://localhost:3000',
    process.env.FRONTEND_B_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  credentials: true,
}));

// Rate limiting for public routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/gov/auth', publicLimiter);
app.use('/api/market/auth', publicLimiter);
app.use('/api/public', publicLimiter);

// Body parsing — 50MB to support large document uploads before they go to Pinata
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'carbontrace-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/gov', govRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/bhuvan', bhuvanRoutes);

// ─── Error Handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Multer errors (file too large, wrong type)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Maximum size is 10MB per file.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: `Unexpected file field: ${err.field}` });
  }
  if (err.message?.includes('Only PDF, JPG, PNG')) {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] CarbonTrace API running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[BHUVAN] API key: ${process.env.BHUVAN_API_KEY ? 'configured ✓' : 'not set ✗'}`);
  console.log('[DB] PostgreSQL connection deferred — will connect when available');
});
