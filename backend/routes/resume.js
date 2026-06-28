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
    const row = db.get('resumes').find({ user_id: req.user.id }).value();

    if (!row) {
      return res.json({ resume: null });
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

    const existing = db.get('resumes').find({ user_id: req.user.id }).value();
    const now      = new Date().toISOString();

    if (existing) {
      db.get('resumes')
        .find({ user_id: req.user.id })
        .assign({ data: JSON.stringify(resumeData), updated_at: now })
        .write();
    } else {
      db.get('resumes')
        .push({ id: Date.now(), user_id: req.user.id, data: JSON.stringify(resumeData), updated_at: now })
        .write();
    }

    res.json({ message: 'Resume saved', updatedAt: now });
  } catch (err) {
    console.error('[resume/POST]', err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

module.exports = router;
