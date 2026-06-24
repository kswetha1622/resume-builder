/**
 * routes/auth.js
 * POST /api/auth/login
 *
 * Accepts { email } (optional).
 * Creates or retrieves the user, then returns a signed JWT.
 * If no email is supplied a guest account is created with a UUID.
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/database');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'resume_builder_secret';
const TOKEN_TTL = '30d'; // tokens valid for 30 days

router.post('/login', (req, res) => {
  try {
    const db    = getDB();
    const email = req.body.email?.trim().toLowerCase() || null;

    let user;

    if (email) {
      // Try to find existing user by email
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!user) {
        // Create new user
        const id = uuidv4();
        db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);
        user = { id, email };
      }
    } else {
      // Guest – always create a new anonymous account
      const id = uuidv4();
      db.prepare('INSERT INTO users (id, email) VALUES (?, NULL)').run(id);
      user = { id, email: null };
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: TOKEN_TTL }
    );

    res.json({
      message : 'Login successful',
      token,
      user    : { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
