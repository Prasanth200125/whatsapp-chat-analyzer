/**
 * WhatsApp Chat Analyzer — Express Server Entry Point
 * 
 * Starts the Express server, connects middleware, routes, and database.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');
const chatRoutes = require('./routes/chat');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────────
// Core Middleware
// ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// Health Check (no auth)
// ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: result.rows[0].now,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// ──────────────────────────────────────────────
// Public Routes (no auth)
// ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ──────────────────────────────────────────────
// Protected Routes (require JWT)
// ──────────────────────────────────────────────
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/export', authMiddleware, exportRoutes);

// ──────────────────────────────────────────────
// Global Error Handler (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  WhatsApp Chat Analyzer — Server Started     ║
  ║  Port: ${PORT}                                  ║
  ║  Mode: ${process.env.NODE_ENV || 'development'}                         ║
  ║  Health: http://localhost:${PORT}/api/health     ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
