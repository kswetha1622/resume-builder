/**
 * routes/pdf.js
 * POST /api/pdf/export  – returns print-ready HTML
 * POST /api/pdf/download – returns a true vector PDF via Puppeteer
 *
 * All styles are 100 % inline — no CDN, no Tailwind, no external fonts
 * needed by Puppeteer. This guarantees crisp, high-quality text in the PDF.
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Build high-quality, fully inline-styled resume HTML ───────────────────────
function buildResumeHTML(data) {
  const {
    name             = 'Your Name',
    title            = 'Your Title',
    phone            = '',
    email            = '',
    summary          = '',
    technicalSkills  = [],
    softSkills       = [],
    experience       = [],
    education        = [],
    projects         = [],
    certifications   = [],
    achievements     = [],
    codingProfiles   = [],
    languages        = [],
    hobbies          = [],
    github           = '',
    linkedin         = '',
    portfolio        = '',
    image            = null,
  } = data;

  // ── Color palette ──────────────────────────────────────────────────────────
  const accent   = '#1a56db';   // Professional blue
  const heading  = '#111827';   // Near-black
  const body     = '#374151';   // Dark gray
  const light    = '#6b7280';   // Medium gray
  const border   = '#d1d5db';   // Light border
  const bg       = '#ffffff';

  // ── Shared style helpers ───────────────────────────────────────────────────
  const S = {
    section: `margin-top:22px;`,
    sectionTitle: `font-size:11.5pt;font-weight:700;color:${accent};
      text-transform:uppercase;letter-spacing:1.2px;
      border-bottom:2px solid ${accent};padding-bottom:4px;
      margin-bottom:12px;font-family:Arial,Helvetica,sans-serif;`,
    subsectionRole: `font-size:11pt;font-weight:700;color:${heading};
      font-family:Arial,Helvetica,sans-serif;`,
    subsectionCompany: `font-size:10.5pt;font-weight:600;color:${accent};
      font-family:Arial,Helvetica,sans-serif;`,
    period: `font-size:9.5pt;color:${light};font-family:Arial,Helvetica,sans-serif;`,
    bodyText: `font-size:10pt;color:${body};font-family:Arial,Helvetica,sans-serif;line-height:1.5;`,
    smallText: `font-size:9.5pt;color:${body};font-family:Arial,Helvetica,sans-serif;`,
    bullet: `font-size:10pt;color:${body};font-family:Arial,Helvetica,sans-serif;
      line-height:1.6;margin:0;padding-left:16px;`,
    tag: `display:inline-block;background:${accent}18;color:${accent};
      font-size:9pt;font-weight:600;padding:3px 10px;border-radius:20px;
      margin:3px 3px 3px 0;font-family:Arial,Helvetica,sans-serif;`,
    link: `color:${accent};text-decoration:none;font-size:9.5pt;
      font-family:Arial,Helvetica,sans-serif;`,
  };

  // ── Contact row ────────────────────────────────────────────────────────────
  const contactItems = [];
  if (phone)     contactItems.push(`<span style="${S.smallText}">${esc(phone)}</span>`);
  if (email)     contactItems.push(`<a href="mailto:${esc(email)}" style="${S.link}">${esc(email)}</a>`);
  if (github)    contactItems.push(`<a href="${esc(github.startsWith('http')?github:'https://'+github)}" style="${S.link}">${esc(github)}</a>`);
  if (linkedin)  contactItems.push(`<a href="${esc(linkedin.startsWith('http')?linkedin:'https://'+linkedin)}" style="${S.link}">${esc(linkedin)}</a>`);
  if (portfolio) contactItems.push(`<a href="${esc(portfolio.startsWith('http')?portfolio:'https://'+portfolio)}" style="${S.link}">${esc(portfolio)}</a>`);

  const contactHTML = contactItems.length
    ? `<div style="text-align:center;margin-top:6px;display:flex;justify-content:center;flex-wrap:wrap;gap:6px 18px;">
        ${contactItems.join(`<span style="color:${border};font-size:10pt;">|</span>`)}
       </div>`
    : '';

  // ── Profile photo ──────────────────────────────────────────────────────────
  const photoHTML = image
    ? `<img src="${image}" alt="${esc(name)}"
         style="width:88px;height:88px;border-radius:50%;object-fit:cover;
                border:3px solid ${accent};margin-bottom:10px;">`
    : '';

  // ── Skills ─────────────────────────────────────────────────────────────────
  const techTags = technicalSkills.filter(Boolean)
    .map(s => `<span style="${S.tag}">${esc(s)}</span>`).join('');
  const softTags = softSkills.filter(Boolean)
    .map(s => `<span style="${S.tag}">${esc(s)}</span>`).join('');

  const skillsHTML = (techTags || softTags) ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Skills</div>
      ${techTags ? `<div style="margin-bottom:6px;"><span style="font-size:9.5pt;font-weight:700;color:${heading};font-family:Arial,Helvetica,sans-serif;">Technical:&nbsp;</span>${techTags}</div>` : ''}
      ${softTags ? `<div><span style="font-size:9.5pt;font-weight:700;color:${heading};font-family:Arial,Helvetica,sans-serif;">Soft Skills:&nbsp;</span>${softTags}</div>` : ''}
    </div>` : '';

  // ── Experience ─────────────────────────────────────────────────────────────
  const expRows = (experience || []).filter(e => e.role || e.company).map(e => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
        <span style="${S.subsectionRole}">${esc(e.role)}</span>
        <span style="${S.period}">${esc(e.period)}</span>
      </div>
      <div style="${S.subsectionCompany};margin-bottom:4px;">${esc(e.company)}</div>
      ${e.desc ? `<ul style="${S.bullet}">
        ${e.desc.split('\n').filter(Boolean).map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>` : ''}
    </div>`).join('');

  const experienceHTML = expRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Experience</div>
      ${expRows}
    </div>` : '';

  // ── Education ──────────────────────────────────────────────────────────────
  const eduRows = (education || []).filter(e => e.degree || e.school).map(e => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
        <span style="${S.subsectionRole}">${esc(e.degree)}</span>
        <span style="${S.period}">${esc(e.year)}</span>
      </div>
      <div style="${S.subsectionCompany};margin-bottom:2px;">${esc(e.school)}</div>
      ${e.cgpa ? `<div style="${S.smallText}">CGPA: ${esc(e.cgpa)}</div>` : ''}
      ${e.desc ? `<div style="${S.smallText};margin-top:2px;">${esc(e.desc)}</div>` : ''}
    </div>`).join('');

  const educationHTML = eduRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Education</div>
      ${eduRows}
    </div>` : '';

  // ── Projects ───────────────────────────────────────────────────────────────
  const projRows = (projects || []).filter(p => p.name || p.description).map(p => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
        <span style="${S.subsectionRole}">${esc(p.name)}</span>
        ${p.technologies ? `<span style="font-size:9pt;color:${accent};font-family:Arial,Helvetica,sans-serif;font-weight:600;">${esc(p.technologies)}</span>` : ''}
      </div>
      ${p.description ? `<ul style="${S.bullet}">
        ${p.description.split('\n').filter(Boolean).map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>` : ''}
      ${p.link ? `<a href="${esc(p.link)}" style="${S.link};display:block;margin-top:3px;">🔗 ${esc(p.link)}</a>` : ''}
    </div>`).join('');

  const projectsHTML = projRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Projects</div>
      ${projRows}
    </div>` : '';

  // ── Certifications ─────────────────────────────────────────────────────────
  const certRows = (certifications || []).filter(c => c.name || c.issuer).map(c => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
        <span style="${S.subsectionRole}">${esc(c.name)}</span>
        <span style="${S.period}">${esc(c.date)}</span>
      </div>
      <div style="${S.subsectionCompany}">${esc(c.issuer)}</div>
      ${c.link ? `<a href="${esc(c.link)}" style="${S.link};display:block;margin-top:2px;">🔗 View Certificate</a>` : ''}
    </div>`).join('');

  const certificationsHTML = certRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Certifications</div>
      ${certRows}
    </div>` : '';

  // ── Achievements ───────────────────────────────────────────────────────────
  const achieveRows = (achievements || []).filter(a => a.title || a.description).map(a => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
        <span style="${S.subsectionRole}">${esc(a.title)}</span>
        <span style="${S.period}">${esc(a.date)}</span>
      </div>
      ${a.type ? `<div style="font-size:9pt;color:${accent};font-weight:600;font-family:Arial,Helvetica,sans-serif;">${esc(a.type)}</div>` : ''}
      ${a.description ? `<div style="${S.bodyText};margin-top:2px;">${esc(a.description)}</div>` : ''}
    </div>`).join('');

  const achievementsHTML = achieveRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Achievements</div>
      ${achieveRows}
    </div>` : '';

  // ── Coding Profiles ────────────────────────────────────────────────────────
  const cpRows = (codingProfiles || []).filter(p => p.platform || p.username).map(p => `
    <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
      <div>
        <span style="${S.subsectionRole}">${esc(p.platform)}</span>
        <span style="font-size:9.5pt;color:${body};font-family:Arial,Helvetica,sans-serif;margin-left:8px;">${esc(p.username)}</span>
        ${p.stats ? `<span style="font-size:9pt;color:${light};font-family:Arial,Helvetica,sans-serif;margin-left:8px;">${esc(p.stats)}</span>` : ''}
      </div>
      ${p.url ? `<a href="${esc(p.url)}" style="${S.link};">View Profile →</a>` : ''}
    </div>`).join('');

  const codingProfilesHTML = cpRows ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Coding Profiles</div>
      ${cpRows}
    </div>` : '';

  // ── Additional Info ────────────────────────────────────────────────────────
  const langStr   = languages.filter(Boolean).map(l => esc(l)).join(', ');
  const hobbyStr  = hobbies.filter(Boolean).map(h => esc(h)).join(', ');
  const additionalHTML = (langStr || hobbyStr) ? `
    <div style="${S.section}">
      <div style="${S.sectionTitle}">Additional Information</div>
      ${langStr  ? `<div style="${S.bodyText}"><strong>Languages:</strong> ${langStr}</div>`  : ''}
      ${hobbyStr ? `<div style="${S.bodyText}"><strong>Hobbies:</strong> ${hobbyStr}</div>`   : ''}
    </div>` : '';

  // ── Assemble final HTML ───────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(name)} – Resume</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #374151;
      background: #ffffff;
      padding: 36px 44px;
      max-width: 850px;
      margin: 0 auto;
      line-height: 1.5;
    }
    /* Prevent page breaks inside blocks */
    div { page-break-inside: avoid; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>

  <!-- ── Header ── -->
  <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid ${accent};">
    ${photoHTML}
    <h1 style="font-size:22pt;font-weight:800;color:${heading};
               font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.3px;
               margin-bottom:4px;">${esc(name)}</h1>
    <h2 style="font-size:13pt;font-weight:600;color:${accent};
               font-family:Arial,Helvetica,sans-serif;margin-bottom:6px;">${esc(title)}</h2>
    ${contactHTML}
    ${summary ? `<p style="font-size:10pt;color:${body};max-width:640px;
                             margin:10px auto 0;line-height:1.6;
                             font-family:Arial,Helvetica,sans-serif;">${esc(summary)}</p>` : ''}
  </div>

  ${skillsHTML}
  ${experienceHTML}
  ${educationHTML}
  ${projectsHTML}
  ${certificationsHTML}
  ${achievementsHTML}
  ${codingProfilesHTML}
  ${additionalHTML}

</body>
</html>`;
}

// ── Route: /export (HTML preview) ─────────────────────────────────────────────
router.post('/export', optionalAuth, (req, res) => {
  try {
    const resumeData = req.body.resumeData;
    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ error: 'resumeData is required in the request body.' });
    }

    const html = buildResumeHTML(resumeData);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${resumeData.name || 'resume'}.html"`);
    res.send(html);
  } catch (err) {
    console.error('[pdf/export]', err);
    res.status(500).json({ error: 'PDF export failed: ' + err.message });
  }
});

// ── Route: /download (true PDF via Puppeteer) ─────────────────────────────────
router.post('/download', optionalAuth, async (req, res) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ error: 'resumeData is required in the request body.' });
    }

    // Always rebuild from resumeData so we get 100 % inline-styled HTML.
    // Never use the Tailwind-class-based HTML captured from the frontend DOM.
    const html = buildResumeHTML(resumeData);

    const puppeteer = require('puppeteer');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--font-render-hinting=none',   // Sharper text
        '--disable-font-subpixel-positioning',
      ],
    });

    const page = await browser.newPage();

    // High-DPI viewport for crisp rendering (3× device pixel ratio)
    await page.setViewport({ width: 850, height: 1200, deviceScaleFactor: 3 });

    // setContent is faster than goto for inline HTML; no network needed
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Give inline styles a tick to settle (no fonts to load)
    await new Promise(r => setTimeout(r, 300));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    });

    await browser.close();

    const filename = `${(resumeData.name || 'resume')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('[pdf/download]', err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

module.exports = router;
