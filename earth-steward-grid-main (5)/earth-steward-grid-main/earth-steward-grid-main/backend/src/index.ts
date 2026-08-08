import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/validate';

import authRoutes from './routes/auth';
import marketplaceRoutes from './routes/marketplace';
import companyRoutes from './routes/company';
import paymentRoutes from './routes/payment';
import govRoutes from './routes/gov';
import ledgerRoutes from './routes/ledger';
import chatbotRoutes from './routes/chatbot';
import notificationsRoutes from './routes/notifications';

import pool from './db/pool';
import { ensureGenesisBlock, validateChain } from './services/blockchain';

// Import jobs to start intervals
import './jobs/expiry.job';

const app = express();
const PORT = process.env.PORT || 4000;

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any localhost port (dev) or the configured FRONTEND_URL
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://localhost:8082',
      'http://localhost:3000',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limit all routes globally
app.use(globalLimiter);
app.use(compression());

// Serve local uploads in dev
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== BODY PARSERS ====================
// Note: payment webhook uses raw body (handled inside route)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/gov', govRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

// ==================== START SERVER ====================
async function start() {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('Database connected.');

    // Ensure genesis block
    await ensureGenesisBlock();

    // Validate chain on startup
    const chainResult = await validateChain();
    if (!chainResult.valid) {
      console.error(`WARNING: Blockchain invalid at block ${chainResult.broken_at_index}. New blocks will be refused until repaired.`);
    } else {
      console.log('Blockchain chain integrity: VALID');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Restart watch again for P5174
      console.log(`  Carbon Credit Backend running`);
      console.log(`  PORT: ${PORT}`);
      console.log(`  Health: http://localhost:${PORT}/api/health`);
      console.log(`=====================================\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
