/**
 * server.js – Resume Builder Express API
 * Binds all routes and starts the HTTP server.
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initDB } = require('./db/database');

// ── Route modules ────────────────────────────────────────────────────────────
const authRoutes   = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const aiRoutes     = require('./routes/ai');
const uploadRoutes = require('./routes/upload');
const pdfRoutes    = require('./routes/pdf');

// ── App setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ai',     aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf',    pdfRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
initDB();
app.listen(PORT, () => {
  console.log(`\n🚀  Resume Builder API running at http://localhost:${PORT}`);
  console.log(`📋  Health → http://localhost:${PORT}/api/health\n`);
});
