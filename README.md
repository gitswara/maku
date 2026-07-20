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
