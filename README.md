# Maku 🌿

A small green study buddy. Upload your notes, get flashcards/mnemonics/formulas pulled out automatically, dig into any passage with an AI tool panel, and (coming day 2) call Maku for a voice study session.

## Setup

1. **Install Node.js** if you don't have it (v18+): https://nodejs.org
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Add your API key:**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste in your Anthropic API key (get one at https://console.anthropic.com — new accounts get a small free credit, plenty for hackathon-scale use).
4. **Run it:**
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** in your browser.

## What's built so far (Day 1)

- ✅ Entry screen (the "game start" menu)
- ✅ Import Notes — drag & drop a `.md` file, name the topic, Claude extracts definitions/concepts/formulas automatically
- ✅ View Topics — lists imported topics (folder-opening animation + tabs still to polish)
- 🚧 Study mode — split-pane notes + AI tool panel (next up)
- 🚧 Call Maku — voice conversation with 4 modes (day 2)

## Project structure

```
maku-app/
├── public/            ← everything the browser loads, no build step needed
│   ├── index.html
│   ├── css/style.css  ← design tokens (colors, fonts) live at the top
│   └── js/app.js
├── server/
│   ├── server.js       ← Express app + API routes
│   └── data/topics.json ← simple file-based storage (no DB needed for a hackathon)
├── package.json
└── .env                ← your API key goes here (not committed)
```

## Notes for tomorrow's build

- Study mode: text-selection in the left pane triggers the right-side tool panel (`/api/study/ask` already works — just needs the UI wired to it).
- Call Maku: will need a `/api/maku/chat` route (conversation with mode-specific system prompts) and a `/api/maku/summary` route (end-of-call gap analysis → appended to notes via the existing `/api/topics/:name/append` route).
- Voice: browser `SpeechRecognition` for input (free), browser `speechSynthesis` for output as the default — swap in ElevenLabs later if the student pack credits come through in time.
