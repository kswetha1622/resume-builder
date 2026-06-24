/**
 * routes/pdf.js
 * POST /api/pdf/export
 *
 * Body: { resumeData: { name, title, skills, github, linkedin, portfolio, template, image } }
 *
 * Builds an HTML string matching the frontend template and returns a PDF
 * using the built-in html → pdf conversion via Node's native capabilities.
 *
 * NOTE: For a production setup you would use Puppeteer here.
 * To keep dependencies lightweight we generate a clean, print-ready HTML
 * response (Content-Type: text/html) that the browser can print/save as PDF.
 * The frontend already handles client-side PDF with jsPDF; this route provides
 * an alternative server-side export with higher fidelity.
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Template renderer ──────────────────────────────────────────────────────────
function buildResumeHTML(data) {
  const {
    name       = 'Your Name',
    title      = 'Your Title',
    skills     = [],
    github     = '',
    linkedin   = '',
    portfolio  = '',
    template   = 'modern',
    image      = null,
    summary    = '',
    experience = [],
    education  = []
  } = data;

  const fontFamily =
    template === 'classic'  ? "'Georgia', serif" :
    template === 'creative' ? "'Poppins', sans-serif" :
                              "'Inter', sans-serif";

  const accentColor =
    template === 'creative' ? '#7c3aed' :
    template === 'classic'  ? '#1e3a5f'  :
                              '#059669';

  const skillTags = skills.map(s =>
    `<span style="background:${accentColor}22;color:${accentColor};
      padding:4px 14px;border-radius:999px;font-size:13px;font-weight:600;
      display:inline-block;margin:4px;">${s}</span>`
  ).join('');

  const expRows = experience.map(e => `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:15px;">${e.role}</strong>
        <span style="font-size:12px;color:#6b7280;">${e.period}</span>
      </div>
      <div style="color:${accentColor};font-size:13px;margin-bottom:4px;">${e.company}</div>
      <div style="font-size:13px;color:#374151;">${e.desc}</div>
    </div>
  `).join('');

  const eduRows = education.map(e => `
    <div style="margin-bottom:12px;">
      <strong style="font-size:15px;">${e.degree}</strong><br>
      <span style="color:${accentColor};font-size:13px;">${e.school}</span>
      <span style="float:right;font-size:12px;color:#6b7280;">${e.year}</span>
    </div>
  `).join('');

  const links = [
    github    && `<span>GitHub: ${github}</span>`,
    linkedin  && `<span>LinkedIn: ${linkedin}</span>`,
    portfolio && `<span>Portfolio: ${portfolio}</span>`
  ].filter(Boolean).join(' &nbsp;|&nbsp; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${name} – Resume</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      color: #111827;
      background: #fff;
      padding: 48px;
      max-width: 850px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 20px; }
      button { display: none; }
    }
    header { text-align:center; margin-bottom:32px; }
    header img { width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:16px;border:4px solid ${accentColor}22; }
    h1 { font-size:36px;font-weight:900;color:#111827;margin-bottom:6px; }
    h2.subtitle { font-size:20px;font-weight:600;color:${accentColor};margin-bottom:12px; }
    .summary { font-size:14px;color:#6b7280;max-width:600px;margin:0 auto; }
    section { margin-top:28px; }
    section h3 { font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${accentColor};border-bottom:2px solid ${accentColor}22;padding-bottom:6px;margin-bottom:14px; }
    .links { text-align:center;font-size:13px;color:#6b7280;margin-top:8px; }
    .print-btn {
      display:block;margin:24px auto 0;padding:10px 28px;background:${accentColor};
      color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;
      cursor:pointer;font-family:inherit;
    }
  </style>
</head>
<body>
  <header>
    ${image ? `<img src="${image}" alt="${name} photo">` : ''}
    <h1>${name}</h1>
    <h2 class="subtitle">${title}</h2>
    ${summary ? `<p class="summary">${summary}</p>` : ''}
    ${links ? `<div class="links">${links}</div>` : ''}
  </header>

  ${skills.length ? `
  <section>
    <h3>Skills</h3>
    <div>${skillTags}</div>
  </section>` : ''}

  ${expRows ? `
  <section>
    <h3>Experience</h3>
    ${expRows}
  </section>` : ''}

  ${eduRows ? `
  <section>
    <h3>Education</h3>
    ${eduRows}
  </section>` : ''}

  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body>
</html>`;
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.post('/export', optionalAuth, (req, res) => {
  try {
    const resumeData = req.body.resumeData;
    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ error: 'resumeData is required in the request body.' });
    }

    const html = buildResumeHTML(resumeData);

    // Return as downloadable HTML – browser prints it as PDF
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${resumeData.name || 'resume'}.html"`);
    res.send(html);
  } catch (err) {
    console.error('[pdf/export]', err);
    res.status(500).json({ error: 'PDF export failed: ' + err.message });
  }
});

module.exports = router;
