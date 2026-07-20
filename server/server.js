require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TOPICS_FILE)) fs.writeFileSync(TOPICS_FILE, JSON.stringify({}, null, 2));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Current Sonnet — near-Opus quality at the low latency an interactive voice
// study session needs. Thinking is disabled per-call to keep turns snappy.
const MODEL = 'claude-sonnet-5';

// ElevenLabs voice (optional upgrade for Call Maku's voice output).
// Key stays server-side; set ELEVENLABS_VOICE_ID in .env to Maku's voice.
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // "Rachel" default preset
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';        // fast + low-cost

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// ---------- helpers ----------
function normalizeTopic(t) {
  t.additionalNotes = t.additionalNotes || '';
  t.highlights = Array.isArray(t.highlights) ? t.highlights : [];
  t.flashcards = Array.isArray(t.flashcards) ? t.flashcards : [];
  t.gapReports = Array.isArray(t.gapReports) ? t.gapReports : [];
  t.activity = Object.assign(
    { callSessions: 0, quizAnswered: 0, flashcardsPracticed: 0 },
    t.activity || {}
  );
  return t;
}

// Mastery rating (0–5 stars), from tracked study activity:
//   points = callSessions*3 + quizAnswered*1 + flashcardsPracticed*1
//   stars  = min(5, floor(points / 4))   — 20 points earns the full 5★
function ratingOf(t) {
  const a = t.activity;
  const points = a.callSessions * 3 + a.quizAnswered + a.flashcardsPracticed;
  return { stars: Math.min(5, Math.floor(points / 4)), points, ...a };
}

function readTopics() {
  const data = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  Object.values(data).forEach(normalizeTopic);
  return data;
}
function writeTopics(data) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2));
}
function requireAnthropic(res) {
  if (!anthropic) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.'
    });
    return false;
  }
  return true;
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Plain text completion. Thinking disabled for low latency + predictable output.
async function complete(system, messages, maxTokens = 1000) {
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'disabled' },
    system,
    messages
  });
  return resp.content.find(b => b.type === 'text')?.text || '';
}

// Ask Claude for strict JSON and parse it safely.
// Parse JSON that may be wrapped in prose or code fences.
function parseLooseJSON(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/[\{\[][\s\S]*[\}\]]/); // first {...} or [...]
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
async function askForJSON(systemPrompt, userPrompt, maxTokens = 2000) {
  const text = await complete(systemPrompt, [{ role: 'user', content: userPrompt }], maxTokens);
  const parsed = parseLooseJSON(text);
  if (!parsed) throw new Error('Model did not return valid JSON');
  return parsed;
}

function studyCorpus(topic) {
  return `${topic.markdown}\n\n${topic.additionalNotes ? 'Student\'s own added notes:\n' + topic.additionalNotes : ''}`.slice(0, 8000);
}

// Mode-specific personas for Call Maku. The concept checklist is injected as
// hidden context so the conversation logic is grounded in the student's notes.
const MAKU_MODES = {
  examples: {
    label: 'Solve examples',
    persona: `You are Maku, a warm study buddy running a practice session. Present ONE practice problem at a time drawn from the topic's material. After the student answers, react honestly — praise what's right, gently point out what's off — then offer the next problem. Keep every turn short and spoken-aloud friendly.`
  },
  quiz: {
    label: 'Test definitions & formulas',
    persona: `You are Maku running quick-fire recall practice. Ask ONE definition or formula question at a time, wait for the answer, confirm or correct it briefly, then move to the next. Keep it snappy, like flashcards out loud.`
  },
  questions: {
    label: 'Ask me questions',
    persona: `You are Maku conducting a friendly oral exam. Ask ONE open-ended "why / how / what-if" question at a time about the topic, listen to the student's reasoning, and probe follow-ups where their explanation is thin. One question per turn.`
  },
  teach: {
    label: 'Teach Maku',
    persona: `You are Maku, a sweet but genuinely confused classmate. The STUDENT is teaching YOU this topic. Stay in character as the learner: react to their explanation, and ask ONE targeted, naive follow-up question that surfaces a gap or a glossed-over step ("wait, but why does...?"). Never lecture — your job is to be taught, and to probe. One question per turn.`
  }
};

function checklistFrom(topic) {
  return (topic.concepts || []).map(c => ({ concept: c.name, covered: false }));
}

// Call Maku's lines are read aloud — strip any emoji/pictographs.
function stripEmoji(s) {
  return String(s)
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{25FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/[^\S\n]{2,}/g, ' ') // collapse runs of spaces/tabs but keep newlines (markdown-safe)
    .trim();
}
const NO_EMOJI = 'Never use emojis, emoticons, or symbols — your reply is read aloud as speech.';

// ---------- routes: topics ----------

app.get('/api/topics', (req, res) => {
  const topics = readTopics();
  const list = Object.keys(topics).map(name => {
    const t = topics[name];
    return {
      name,
      definitionCount: (t.definitions || []).length,
      conceptCount: (t.concepts || []).length,
      formulaCount: (t.formulas || []).length,
      flashcardCount: t.flashcards.length,
      gapReportCount: t.gapReports.length,
      rating: ratingOf(t),
      createdAt: t.createdAt
    };
  });
  res.json(list);
});

app.get('/api/topics/:name', (req, res) => {
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json({ ...topic, rating: ratingOf(topic) });
});

app.post('/api/topics', upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Topic name and a markdown file are required.' });
    }
    const markdown = req.file.buffer.toString('utf-8');
    const topics = readTopics();
    if (topics[name]) {
      return res.status(409).json({ error: 'A topic with that name already exists.' });
    }

    let structured = { definitions: [], concepts: [], formulas: [] };
    if (anthropic) {
      structured = await askForJSON(
        `You extract structured study material from a student's notes.
Return ONLY valid JSON, no preamble, no markdown fences, matching exactly:
{
  "definitions": [{"term": "...", "definition": "..."}],
  "concepts": [{"name": "...", "summary": "..."}],
  "formulas": [{"name": "...", "expression": "...", "explanation": "..."}]
}
If a category has nothing relevant, return an empty array for it. Keep definitions and summaries concise.`,
        markdown,
        3000
      );
    }

    topics[name] = normalizeTopic({
      name,
      markdown,
      definitions: structured.definitions || [],
      concepts: structured.concepts || [],
      formulas: structured.formulas || [],
      createdAt: new Date().toISOString()
    });
    writeTopics(topics);
    res.json(topics[name]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import notes.', detail: String(err) });
  }
});

// Save the student's free-write Additional Notes (markdown), stored alongside
// the original notes rather than merged into them.
app.post('/api/topics/:name/notes', (req, res) => {
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  topic.additionalNotes = req.body.additionalNotes || '';
  writeTopics(topics);
  res.json({ additionalNotes: topic.additionalNotes });
});

// Append AI-generated study content to Additional Notes.
app.post('/api/topics/:name/notes/append', (req, res) => {
  const { content, heading } = req.body;
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  const block = `${topic.additionalNotes ? '\n\n' : ''}---\n### ${heading || 'From Study'}\n${content}\n`;
  topic.additionalNotes += block;
  writeTopics(topics);
  res.json({ additionalNotes: topic.additionalNotes });
});

// Persist highlighted passages (array of plain-text strings).
app.post('/api/topics/:name/highlights', (req, res) => {
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  topic.highlights = Array.isArray(req.body.highlights) ? req.body.highlights : [];
  writeTopics(topics);
  res.json({ highlights: topic.highlights });
});

// Save the topic's flashcard set.
app.post('/api/topics/:name/flashcards', (req, res) => {
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  topic.flashcards = (req.body.flashcards || []).map(c => ({
    id: c.id || newId(), front: String(c.front || ''), back: String(c.back || '')
  }));
  writeTopics(topics);
  res.json({ flashcards: topic.flashcards });
});

// Increment a tracked activity counter (feeds the mastery rating).
app.post('/api/topics/:name/activity', (req, res) => {
  const { field, amount = 1 } = req.body;
  const allowed = ['callSessions', 'quizAnswered', 'flashcardsPracticed'];
  const topics = readTopics();
  const topic = topics[req.params.name];
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  if (allowed.includes(field)) topic.activity[field] += Number(amount) || 0;
  writeTopics(topics);
  res.json({ activity: topic.activity, rating: ratingOf(topic) });
});

// ---------- routes: study tools ----------

app.post('/api/study/ask', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { selectedText, mode, userInput } = req.body;
    const instructions = {
      question: `Answer the student's question about the passage clearly and concisely.`,
      analogy: `Explain the passage using a vivid, concrete analogy that makes it easier to understand. Follow any steer in the student's input about what kind of analogy they want.`,
      detail: `Expand on the passage with more depth and nuance than the original notes, focused on what the student asked for.`,
      freeform: `Respond helpfully to what the student wrote, using the passage as context.`
    };
    const system = `You are a helpful study assistant. The student selected a passage from their notes and wants help with it. ${instructions[mode] || instructions.freeform} Keep your response focused and study-friendly (short paragraphs, bullet points if useful).`;
    const userPrompt = `Selected passage:\n"""${selectedText}"""\n\nStudent's input: ${userInput || '(none)'}`;
    const result = await complete(system, [{ role: 'user', content: userPrompt }], 1000);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate response.', detail: String(err) });
  }
});

// Generate flashcards from a topic's notes.
app.post('/api/study/flashcards', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { topic: topicName, count = 8 } = req.body;
    const topics = readTopics();
    const topic = topics[topicName];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const data = await askForJSON(
      `You create study flashcards from a student's notes.
Return ONLY valid JSON (no fences): {"cards":[{"front":"question/term","back":"answer/definition"}]}
Make up to ${count} cards. Fronts should prompt recall; backs should be concise and correct.`,
      studyCorpus(topic),
      2500
    );
    const cards = (data.cards || []).map(c => ({ id: newId(), front: c.front, back: c.back }));
    res.json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate flashcards.', detail: String(err) });
  }
});

// Generate a multiple-choice practice quiz from a topic's notes.
app.post('/api/study/quiz', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { topic: topicName, count = 5 } = req.body;
    const topics = readTopics();
    const topic = topics[topicName];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const data = await askForJSON(
      `You write a multiple-choice practice quiz from a student's notes.
Return ONLY valid JSON (no fences):
{"questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"why the answer is correct"}]}
Exactly 4 options each. "answer" is the 0-based index of the correct option. Write ${count} questions of varied difficulty grounded in the notes.`,
      studyCorpus(topic),
      3000
    );
    const questions = (data.questions || [])
      .filter(q => Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        question: String(q.question || ''),
        options: q.options.map(String),
        answer: Math.max(0, Math.min(3, Number(q.answer) || 0)),
        explanation: String(q.explanation || '')
      }));
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate the quiz.', detail: String(err) });
  }
});

// ---------- routes: call maku ----------

app.post('/api/maku/start', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { topic: topicName, mode } = req.body;
    const topics = readTopics();
    const topic = topics[topicName];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const modeCfg = MAKU_MODES[mode] || MAKU_MODES.questions;

    const checklist = checklistFrom(topic);
    const system = `${modeCfg.persona}

Topic: "${topic.name}".
Key concepts you may draw on: ${checklist.map(c => c.concept).join(', ') || '(none extracted yet)'}.

Open the call with a single short, friendly spoken line to get started. No preamble, no lists — just what Maku would say out loud first. ${NO_EMOJI}`;

    const opening = await complete(
      system,
      [{ role: 'user', content: `Start the ${modeCfg.label} session for "${topic.name}".` }],
      200
    );
    res.json({ mode, label: modeCfg.label, checklist, opening: stripEmoji(opening) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start the call.', detail: String(err) });
  }
});

app.post('/api/maku/chat', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { topic: topicName, mode, messages = [], checklist = [] } = req.body;
    const topics = readTopics();
    const topic = topics[topicName];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const modeCfg = MAKU_MODES[mode] || MAKU_MODES.questions;

    const uncovered = checklist.filter(c => !c.covered).map(c => c.concept);

    const system = `${modeCfg.persona}

Topic: "${topic.name}".
Reference material (the student's own notes, for grounding your questions and judging answers):
"""
${topic.markdown.slice(0, 6000)}
"""

HIDDEN CONCEPT CHECKLIST — track this silently, never read it aloud:
${checklist.map(c => `- [${c.covered ? 'x' : ' '}] ${c.concept}`).join('\n') || '(none)'}

Concepts NOT yet adequately covered: ${uncovered.join(', ') || '(all covered — start wrapping up)'}.
Steer the conversation toward the uncovered concepts.

Respond ONLY with valid JSON (no markdown fences):
{
  "reply": "what Maku says out loud this turn (short, spoken, in character)",
  "covered": ["exact concept names from the checklist that the student has now demonstrated adequate understanding of this turn"]
}
Only list a concept in "covered" when the student's own words showed real understanding — not when you merely mentioned it.
${NO_EMOJI} The "reply" text must contain no emoji.`;

    const convo = messages.map(m => ({
      role: m.role === 'maku' ? 'assistant' : 'user',
      content: m.text
    }));
    while (convo.length && convo[0].role === 'assistant') convo.shift();
    if (!convo.length) convo.push({ role: 'user', content: '(the student is ready to begin)' });

    const raw = await complete(system, convo, 700);
    let parsed = parseLooseJSON(raw);
    if (!parsed || typeof parsed.reply !== 'string') {
      // last resort: drop any trailing JSON blob, keep the prose
      const prose = String(raw).replace(/```json|```/g, '').replace(/\{[\s\S]*\}\s*$/, '').trim();
      parsed = { reply: prose || String(raw).trim(), covered: [] };
    }

    const newlyCovered = new Set((parsed.covered || []).map(String));
    const updated = checklist.map(c => ({ ...c, covered: c.covered || newlyCovered.has(c.concept) }));
    res.json({ reply: stripEmoji(parsed.reply || ''), checklist: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to continue the call.', detail: String(err) });
  }
});

// End of call: gap report from checklist state → stored as a structured Gap
// Report on the topic (not merged into the notes). Also bumps callSessions.
app.post('/api/maku/summary', async (req, res) => {
  if (!requireAnthropic(res)) return;
  try {
    const { topic: topicName, mode, messages = [], checklist = [] } = req.body;
    const topics = readTopics();
    const topic = topics[topicName];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const modeCfg = MAKU_MODES[mode] || MAKU_MODES.questions;

    const covered = checklist.filter(c => c.covered).map(c => c.concept);
    const gaps = checklist.filter(c => !c.covered).map(c => c.concept);
    const transcript = messages.map(m => `${m.role === 'maku' ? 'Maku' : 'You'}: ${m.text}`).join('\n');

    const system = `You are Maku, wrapping up a "${modeCfg.label}" study call on "${topic.name}".
Write a short, encouraging gap report in markdown for the student to keep.

Base it on the tracked understanding state, not a re-read of everything:
- Concepts the student showed they understand: ${covered.join(', ') || '(none yet)'}
- Concepts still shaky / not demonstrated: ${gaps.join(', ') || '(none — solid across the board!)'}

For each shaky concept, add ONE focused, targeted study prompt or mini-explanation that would close the gap. If there are no gaps, celebrate briefly and suggest one stretch question. Keep it tight and warm. Do not include a top-level heading — start with the content. Do not use any emojis, emoticons, or symbols.`;

    const report = await complete(
      system,
      [{ role: 'user', content: `Transcript:\n${transcript || '(no transcript captured)'}` }],
      900
    );

    const entry = {
      id: newId(),
      label: modeCfg.label,
      date: new Date().toISOString(),
      report: stripEmoji(report)
    };
    topic.gapReports.unshift(entry);
    topic.activity.callSessions += 1;
    writeTopics(topics);

    res.json({ gapReport: entry.report, covered, gaps, gapReports: topic.gapReports, rating: ratingOf(topic) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate the gap report.', detail: String(err) });
  }
});

// ---------- routes: text-to-speech (ElevenLabs, optional) ----------

// Lets the client know whether to use ElevenLabs or fall back to browser TTS.
app.get('/api/tts/status', (req, res) => {
  res.json({ enabled: !!ELEVEN_KEY, voice: ELEVEN_VOICE, model: ELEVEN_MODEL });
});

// Proxy a short line of text to ElevenLabs and stream back MP3 audio.
app.post('/api/tts', async (req, res) => {
  if (!ELEVEN_KEY) return res.status(501).json({ error: 'ElevenLabs key not set' });
  const text = String(req.body.text || '').slice(0, 800);
  if (!text.trim()) return res.status(400).json({ error: 'No text' });
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.15 }
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: 'ElevenLabs request failed', detail: detail.slice(0, 300) });
    }
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TTS failed', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Maku is running at http://localhost:${PORT}`);
  console.log(ELEVEN_KEY ? `ElevenLabs voice ON (voice ${ELEVEN_VOICE}, model ${ELEVEN_MODEL})` : 'ElevenLabs voice OFF — using browser TTS.');
  if (!anthropic) {
    console.warn('WARNING: ANTHROPIC_API_KEY not set — copy .env.example to .env and add your key.');
  }
});
