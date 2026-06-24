/**
 * routes/upload.js
 * POST /api/upload/photo
 *
 * Accepts a multipart/form-data file (field: "photo").
 * Resizes to 200×200 PNG using sharp, saves to /uploads/, returns the URL.
 */

const express  = require('express');
const multer   = require('multer');
const sharp    = require('sharp');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Ensure uploads directory exists ──────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer: store file in memory (we process it with sharp before saving) ─────
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits : { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/photo', optionalAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Use field name "photo".' });
    }

    const filename = `${uuidv4()}.png`;
    const outPath  = path.join(UPLOADS_DIR, filename);

    // Resize & convert to 200×200 PNG
    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .png()
      .toFile(outPath);

    // Build public URL
    const photoUrl = `http://localhost:${process.env.PORT || 3001}/uploads/${filename}`;

    res.json({ message: 'Photo uploaded', photoUrl });
  } catch (err) {
    console.error('[upload/photo]', err);
    res.status(500).json({ error: 'Photo upload failed: ' + err.message });
  }
});

module.exports = router;
