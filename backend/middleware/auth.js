/**
 * middleware/auth.js
 * JWT verification middleware.
 * Attaches req.user = { id, email } on success.
 */

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'resume_builder_secret';

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth – attaches req.user if token is present, but
 * does NOT block the request if it's missing.
 */
function optionalAuth(req, _res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], SECRET);
    } catch (_) { /* ignore invalid tokens */ }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
