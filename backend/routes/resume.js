/**
 * routes/resume.js
 * GET  /api/resume  – load user's saved resume
 * POST /api/resume  – save / update user's resume
 *
 * Both routes require a valid JWT (Bearer token).
 */

const express = require('express');
const { getDB } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/resume ──────────────────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  try {
    const db  = getDB();
    const row = db
      .prepare('SELECT data, updated_at FROM resumes WHERE user_id = ?')
      .get(req.user.id);

    if (!row) {
      return res.json({ resume: null }); // No saved resume yet
    }

    res.json({
      resume    : JSON.parse(row.data),
      updatedAt : row.updated_at
    });
  } catch (err) {
    console.error('[resume/GET]', err);
    res.status(500).json({ error: 'Failed to load resume' });
  }
});

// ── POST /api/resume ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  try {
    const db         = getDB();
    const resumeData = req.body;

    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ error: 'Invalid resume data' });
    }

    // Upsert: insert or replace
    db.prepare(`
      INSERT INTO resumes (user_id, data, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id)
      DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(req.user.id, JSON.stringify(resumeData));

    res.json({ message: 'Resume saved', updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[resume/POST]', err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

module.exports = router;
