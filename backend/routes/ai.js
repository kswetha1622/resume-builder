/**
 * routes/ai.js
 * POST /api/ai/generate
 *
 * Body: { prompt?: string }
 *
 * If OPENAI_API_KEY is set  → calls GPT-4o-mini and returns real data.
 * If OPENAI_API_KEY is empty → returns rich, varied mock data.
 *
 * Response: { name, title, skills, summary, experience, education }
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Mock profiles ─────────────────────────────────────────────────────────────
const MOCK_PROFILES = [
  {
    name    : 'Alex Rivera',
    title   : 'Senior Full-Stack Engineer',
    summary : 'Passionate engineer with 6+ years building scalable web apps. Loves open-source and mentoring junior devs.',
    skills  : ['React', 'Node.js', 'TypeScript', 'MongoDB', 'GraphQL', 'Docker', 'AWS'],
    experience: [
      { role: 'Senior Engineer', company: 'TechCorp', period: '2021–Present', desc: 'Led migration to microservices, reduced API latency by 40%.' },
      { role: 'Full-Stack Dev',  company: 'StartupXYZ', period: '2018–2021',  desc: 'Built React dashboard used by 50k+ monthly users.' }
    ],
    education: [{ degree: 'B.Sc. Computer Science', school: 'MIT', year: '2018' }]
  },
  {
    name    : 'Priya Sharma',
    title   : 'AI / ML Engineer',
    summary : 'ML engineer specialising in NLP and LLM fine-tuning. Published 3 papers at NeurIPS.',
    skills  : ['Python', 'PyTorch', 'Transformers', 'FastAPI', 'LangChain', 'SQL', 'GCP'],
    experience: [
      { role: 'ML Engineer',   company: 'DeepMind Labs',  period: '2022–Present', desc: 'Fine-tuned LLMs for document summarisation at scale.' },
      { role: 'Data Scientist',company: 'Analytics Co.',  period: '2020–2022',    desc: 'Built churn-prediction model saving $2M annually.' }
    ],
    education: [{ degree: 'M.Sc. Artificial Intelligence', school: 'Stanford', year: '2020' }]
  },
  {
    name    : 'Jordan Lee',
    title   : 'UX / Product Designer',
    summary : 'Design thinker blending user research with pixel-perfect execution. Obsessed with accessibility.',
    skills  : ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'CSS', 'Motion Design'],
    experience: [
      { role: 'Senior UX Designer', company: 'DesignFirst',  period: '2020–Present', desc: 'Redesigned onboarding flow; increased activation rate by 32%.' },
      { role: 'UI Designer',         company: 'AgencyBlue',   period: '2018–2020',    desc: 'Delivered 20+ client projects across fintech and healthtech.' }
    ],
    education: [{ degree: 'B.A. Interaction Design', school: 'RCA London', year: '2018' }]
  }
];

// ── Groq / OpenAI helper ─────────────────────────────────────────────────────
async function generateWithGroq(prompt) {
  const { default: OpenAI } = await import('openai');
  
  // Groq is OpenAI-compatible, just change the baseURL
  const client = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });

  const systemPrompt = `
You are a professional resume writer. Given a user prompt, return a JSON object with these fields:
{
  "name"      : "Realistic full name",
  "title"     : "Professional job title",
  "summary"   : "2-3 sentence professional summary",
  "skills"    : ["skill1", "skill2", ...],  // 6-10 skills
  "experience": [
    { "role": "...", "company": "...", "period": "...", "desc": "..." }
  ],
  "education" : [{ "degree": "...", "school": "...", "year": "..." }]
}
Return ONLY valid JSON – no markdown, no extra text.
`.trim();

  const completion = await client.chat.completions.create({
    model    : 'llama3-8b-8192', // Groq's fast model
    messages : [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: prompt || 'Generate a resume for a modern software engineer.' }
    ],
    temperature      : 0.8,
    max_tokens       : 1024,
    response_format  : { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/generate', optionalAuth, async (req, res) => {
  const { prompt } = req.body;

  try {
    let profile;

    if (process.env.GROQ_API_KEY) {
      console.log('[ai/generate] Calling Groq API…');
      profile = await generateWithGroq(prompt || '');
    } else {
      console.log('[ai/generate] No API key – returning mock profile.');
      profile = MOCK_PROFILES[Math.floor(Math.random() * MOCK_PROFILES.length)];
    }

    res.json({ profile });
  } catch (err) {
    console.error('[ai/generate]', err.message);
    // Gracefully fall back to mock on error
    const fallback = MOCK_PROFILES[0];
    res.json({ profile: fallback, warning: 'AI service unavailable – showing sample data.' });
  }
});

module.exports = router;
