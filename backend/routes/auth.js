/**
 * routes/auth.js
 * Full auth: register, login, forgot-password, verify-otp, reset-password
 * Uses lowdb (JSON file, no native bindings).
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto  = require('crypto');
const { getDB } = require('../db/database');

const router   = express.Router();
const SECRET   = process.env.JWT_SECRET || 'resume_builder_secret';
const TOKEN_TTL = '30d';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return key === hash;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function findUser(db, identifier) {
  return db.get('users').find(u =>
    (u.email && u.email.toLowerCase() === identifier.toLowerCase()) || (u.phone && u.phone === identifier)
  ).value();
}

/* ── Routes ──────────────────────────────────────────────────────────── */

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const db = getDB();
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ error: 'Identifier and password required' });

    if (findUser(db, identifier))
      return res.status(400).json({ error: 'Account already exists' });

    const id            = uuidv4();
    const password_hash = hashPassword(password);
    const email         = isEmail(identifier) ? identifier : null;
    const phone         = isEmail(identifier) ? null : identifier;

    db.get('users').push({ id, email, phone, password_hash, created_at: new Date().toISOString() }).write();

    const token = jwt.sign({ id, identifier }, SECRET, { expiresIn: TOKEN_TTL });
    res.json({ message: 'Registration successful', token, user: { id, identifier } });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const db = getDB();
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ error: 'Identifier and password required' });

    const user = findUser(db, identifier);

    if (!user || !verifyPassword(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, identifier }, SECRET, { expiresIn: TOKEN_TTL });
    res.json({ message: 'Login successful', token, user: { id: user.id, identifier } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const db = getDB();
    const { identifier } = req.body;

    if (!identifier)
      return res.status(400).json({ error: 'Identifier required' });

    const user = findUser(db, identifier);

    if (!user)
      return res.json({ message: 'If an account exists, an OTP has been sent.' });

    const otp        = generateOTP();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Remove any old OTPs for this user then save new one
    db.get('otps').remove({ user_id: user.id }).write();
    db.get('otps').push({ id: uuidv4(), user_id: user.id, otp_code: otp, expires_at }).write();

    console.log(`\n\n[OTP] Code for ${identifier}: ${otp}  (expires ${expires_at})\n\n`);

    // Send real OTP
    (async () => {
      try {
        const nodemailer = require('nodemailer');
        let transporter;
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
          });
        } else {
          let testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
          });
        }
        let info = await transporter.sendMail({
          from: '"Resume Builder" <noreply@resumebuilder.com>',
          to: user.email || user.phone + '@sms.gateway.com',
          subject: "Your OTP for Password Reset",
          text: `Your OTP for password reset is: ${otp}. It expires in 15 minutes.`,
          html: `<b>Your OTP for password reset is: ${otp}</b><br>It expires in 15 minutes.`
        });
        console.log("Message sent: %s", info.messageId);
        if (!process.env.EMAIL_USER) {
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
      } catch (e) {
        console.error("Failed to send email OTP", e);
      }
    })();

    res.json({ message: 'If an account exists, an OTP has been sent.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  try {
    const db = getDB();
    const { identifier, otp } = req.body;

    if (!identifier || !otp)
      return res.status(400).json({ error: 'Identifier and OTP required' });

    const user = findUser(db, identifier);
    if (!user) return res.status(400).json({ error: 'Invalid OTP' });

    const now      = new Date().toISOString();
    const validOtp = db.get('otps').find(o =>
      o.user_id === user.id &&
      o.otp_code === String(otp).trim() &&
      o.expires_at > now
    ).value();

    if (!validOtp) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const resetToken = jwt.sign({ id: user.id, action: 'reset_password' }, SECRET, { expiresIn: '10m' });
    res.json({ message: 'OTP verified', resetToken });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  try {
    const db = getDB();
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword)
      return res.status(400).json({ error: 'Token and new password required' });

    const decoded = jwt.verify(resetToken, SECRET);
    if (decoded.action !== 'reset_password') throw new Error('Invalid token type');

    const password_hash = hashPassword(newPassword);
    db.get('users').find({ id: decoded.id }).assign({ password_hash }).write();

    // Remove used OTPs
    db.get('otps').remove({ user_id: decoded.id }).write();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
