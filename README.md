<p align="center">
  <img src="assets/maku-sprite.png" alt="Maku sprite" width="100" />
</p>

<h1 align="center">MAKU</h1>

<p align="center">
  <strong>Teach Maku what you know. It’ll show you what you don’t.</strong>
</p>

<p align="center">
  An AI-powered study companion that tests understanding through explanation,
  identifies conceptual gaps, and turns them into targeted study material.
</p>

<p align="center">
  <img src="assets/screenshots/home.png" alt="Maku home screen" width="900" />
</p>

---

# About Maku

I've always felt that the real test of whether you understand something is whether you can explain it to a friend.

You can reread your notes, recognize every flashcard, and score well on a multiple-choice quiz while still only understanding a concept at the surface level. The gaps often appear when someone asks:

> "Wait, but why?"

Maku is built around that moment.

Instead of only acting as another AI tutor that gives students answers, Maku can reverse the relationship. In its signature **Teach Maku** mode, the student becomes the teacher and Maku becomes a curious, slightly confused classmate.

As the student explains the material, Maku asks follow-up questions and tracks which underlying concepts they actually demonstrate understanding of.

At the end of the conversation, unresolved concepts become a targeted **Gap Report** that helps answer one of the hardest questions in studying:

> **What do I actually need to work on next?**

The result is a continuous learning loop:

**Study → Explain → Expose gaps → Improve your notes → Study again**

---

# Table of Contents

- [About Maku](#about-maku)
- [Why Maku?](#why-maku)
- [Screenshots](#screenshots)
- [Features](#features)
  - [Import Notes](#import-notes)
  - [View Topics](#view-topics)
  - [Study Mode](#study-mode)
  - [AI Tools](#ai-tools)
  - [Flashcards](#flashcards)
  - [Quizzes](#quizzes)
  - [Call Maku](#call-maku)
  - [Teach Maku](#teach-maku)
  - [Gap Reports](#gap-reports)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Anthropic API Setup](#anthropic-api-setup)
- [Running the App](#running-the-app)
- [Using Maku](#using-maku)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Security Notes](#security-notes)
- [Learning Science Behind Maku](#learning-science-behind-maku)
- [Design](#design)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

# Why Maku?

Most digital study tools measure progress using metrics that are easy to count:

- Flashcards reviewed
- Questions answered
- Quiz accuracy
- Time spent studying

These are useful signals, but they do not always reflect true understanding.

A student may recognize the correct side of a flashcard without being able to recall the idea independently.

A multiple-choice question may be answered through elimination.

A student may memorize a definition without understanding the concepts underneath it.

Maku is designed to explore a different question:

> **Can you explain what you think you know?**

Maku combines traditional study tools with AI-powered conversations that probe the relationships between concepts.

The goal is not simply to help students consume more information.

The goal is to help students discover where their understanding becomes incomplete.

---

# Screenshots

## Your Study Desk

Start from Maku's cozy study desk and choose whether to import notes, browse topics, study, or call Maku.

<p align="center">
  <img src="assets/screenshots/home.png" alt="Maku home screen" width="850" />
</p>

---

## Import Your Own Notes

Upload your own Markdown notes. Maku uses Claude to extract important definitions, concepts, relationships, and formulas.

<p align="center">
  <img src="assets/screenshots/import-notes.png" alt="Import notes screen" width="850" />
</p>

---

## Organize Topics

Each imported subject becomes its own study folder, with progress based on your activity across Maku.

<p align="center">
  <img src="assets/screenshots/topics.png" alt="Maku topic library" width="850" />
</p>

---

## Study Alongside Your Notes

Read and highlight your original notes while using Maku's study tools in the same workspace.

<p align="center">
  <img src="assets/screenshots/study.png" alt="Maku study interface" width="850" />
</p>

---

## Ask Maku for Help

Highlight material and ask focused questions, request an analogy, or ask Maku to explain something in more detail.

<p align="center">
  <img src="assets/screenshots/ai-tools.png" alt="Maku AI study tools" width="850" />
</p>

---

## Practice with Flashcards and Quizzes

Generate flashcards from your notes, practice active recall, and answer AI-generated quiz questions grounded in your material.

<table>
  <tr>
    <td width="50%">
      <img src="assets/screenshots/flashcards.png" alt="Maku flashcards" />
    </td>
    <td width="50%">
      <img src="assets/screenshots/quiz.png" alt="Maku quiz mode" />
    </td>
  </tr>
</table>

---

## Teach Maku

The signature feature.

Choose a topic, enter **Teach Maku** mode, and explain the material as though Maku were a confused classmate.

<p align="center">
  <img src="assets/screenshots/call-maku.png" alt="Teach Maku conversation" width="850" />
</p>

Maku asks follow-up questions and tracks which underlying concepts you actually demonstrate through your explanation.

---

## Find the Gaps

When the conversation ends, Maku generates a targeted Gap Report based on concepts that were incomplete or never adequately explained.

<p align="center">
  <img src="assets/screenshots/gap-report.png" alt="Maku gap report" width="850" />
</p>

These reports remain attached to the topic, so the student's study material evolves alongside their understanding.

---

# Features

## Import Notes

Maku begins with the student's own material.

Users can upload Markdown (`.md`) files containing class notes, study guides, lecture notes, or summaries.

When a topic is imported, Claude analyzes the material and extracts structured information such as:

- Definitions
- Key concepts
- Important relationships
- Formulas
- Core ideas that may later be used during study sessions

Rather than treating the notes as one large block of text, Maku converts them into a more structured representation of what the student is expected to understand.

This structured information powers several later features, including:

- Flashcard generation
- Quiz generation
- AI explanations
- Teach Maku concept tracking
- Gap Reports

---

## View Topics

Imported material is organized into individual topics.

Each topic acts like its own study folder.

Depending on the content available, a topic may include:

- **Notes** — the student's original imported material
- **Definitions** — important terms extracted from the notes
- **Concepts** — major ideas and relationships identified by Claude
- **Gap Reports** — weaknesses identified during Maku sessions
- **Added Notes** — material added manually or generated while studying

The topic view is designed to let the student's study material evolve over time.

The original notes remain available, while new explanations, annotations, and identified weaknesses can accumulate around them.

---

## Study Mode

Study Mode places the student's original notes alongside a set of interactive study tools.

The interface is split into two primary areas.

On one side, the student can read through the imported material.

On the other, they can interact with:

- Personal notes
- AI-powered explanations
- Flashcards
- Quizzes

This keeps the original source material visible while allowing students to actively work with it.

Students can also highlight sections of their notes that they consider important or confusing.

---

## AI Tools

The AI Tools section allows students to ask Claude for help with specific material.

Rather than automatically generating large amounts of content, Maku keeps these tools user-driven.

Students can:

- Ask a question
- Request an analogy
- Ask for more detail
- Write their own prompt

For example, a student studying Operating Systems might highlight a section on process states and ask:

> "I've heard that there are five-state and seven-state process models. What's the difference?"

Maku can generate a focused explanation based on the context of the student's notes.

If the response is useful, the student can save it to their additional notes.

This allows the topic to grow as the student discovers new questions.

---

## Flashcards

Maku includes a flashcard system for retrieval practice.

Students can:

- Create flashcards manually
- Generate flashcards from their notes using AI
- Edit flashcards
- Remove flashcards
- Practice them in a focused review mode

Flashcards are intentionally only one part of the Maku workflow.

They are useful for remembering:

- Definitions
- Formulas
- Terminology
- Short factual relationships

However, Maku does not treat flashcard success as proof that a topic is fully understood.

That deeper understanding is explored through conversation.

---

## Quizzes

Maku can generate multiple-choice questions based on imported material.

Questions are presented one at a time.

After submitting an answer, the student receives immediate feedback.

Quiz mode is useful for:

- Checking factual knowledge
- Practicing retrieval
- Identifying obvious misconceptions
- Reviewing material quickly

Quiz results can contribute to the student's broader activity within the topic.

However, like flashcards, quizzes are not treated as the only measure of understanding.

---

# Call Maku

Call Maku is the conversational side of the application.

Students select a topic and choose a study mode.

Available modes may include:

### Solve Examples

Maku presents practice problems or examples and reacts to the student's proposed solution.

### Test Definitions & Formulas

A quick-recall mode focused on important terminology, definitions, and formulas.

### Ask Me Questions

An oral-exam-style mode where Maku asks the student open-ended questions about the topic.

### Teach Maku

The signature Maku experience.

Instead of Maku teaching the student, the student teaches Maku.

---

# Teach Maku

Teach Maku is built around the idea that explaining something exposes gaps that recognition-based studying can miss.

During the session, Maku behaves like a curious classmate who does not fully understand the topic.

The student explains the material in their own words.

Maku then asks follow-up questions.

For example:

> "What is an operating system?"

The student might answer:

> "It's basically the middleman between software and hardware."

Maku may then ask:

> "Okay, but what is it actually doing for us besides connecting the two?"

This follow-up can reveal whether the student understands deeper concepts such as:

- Resource management
- Memory management
- Process scheduling
- Protection
- User convenience

The goal is not to aggressively interrogate the student.

Maku should behave like someone who is genuinely trying to understand.

---

# Concept Tracking

Teach Maku is not designed as a simple prompt that tells an LLM:

> "Pretend to be confused."

When notes are imported, Maku creates a structured list of important concepts for the topic.

During a Teach Maku session, this list becomes a hidden conceptual checklist.

As the conversation progresses, the system can track which concepts the student has demonstrated understanding of.

For example, an Operating Systems topic might contain concepts such as:

- Goals of an Operating System
- Process States
- Round Robin Scheduling
- Threads vs. Processes
- Memory Management
- Page Fault Handling
- Deadlock Conditions

If the student successfully explains one of these ideas, it can be marked as covered.

If the student gives an incomplete explanation, Maku can ask a targeted follow-up question.

If a concept never comes up during the conversation, it remains unresolved.

This tracked state becomes the basis for the final Gap Report.

---

# Gap Reports

At the end of a Call Maku session, the application can generate a Gap Report.

The purpose of the report is to answer:

> **What should I actually study next?**

Rather than simply saying:

> "You need to review Operating Systems."

Maku can identify more specific weaknesses.

For example:

### Still Building Understanding

**Goals of an Operating System**

You explained that the OS acts as an intermediary between software and hardware, but did not fully cover resource management, user convenience, or system protection.

**Process States**

Not yet discussed.

Study prompt:

> Draw the process lifecycle and explain what causes each state transition.

**Round Robin Scheduling**

Not yet discussed.

Study prompt:

> Explain why a time quantum that is too small or too large can both cause problems.

These reports are saved back into the topic.

Over time, the student's topic can accumulate a history of identified gaps.

---

# How It Works

A simplified Maku workflow looks like this:

```text
User uploads notes
        ↓
Claude extracts structured information
        ↓
Definitions + concepts + formulas are stored
        ↓
Student studies the material
        ↓
Student practices flashcards and quizzes
        ↓
Student starts a Call Maku session
        ↓
Concept checklist is loaded
        ↓
Student explains the topic
        ↓
Maku asks targeted follow-up questions
        ↓
Concepts are marked as demonstrated or unresolved
        ↓
Session ends
        ↓
Gap Report is generated
        ↓
Targeted study material is saved back into the topic
```

The full learning loop is:

```text
Study
  ↓
Explain
  ↓
Expose gaps
  ↓
Improve notes
  ↓
Study again
```

---

# Architecture

Maku uses a deliberately lightweight architecture.

The application is designed to be easy to clone and run locally without a frontend build pipeline.

## Backend

The backend is built with:

- Node.js
- Express

It handles:

- Application routes
- File uploads
- Anthropic API requests
- AI content generation
- Topic processing
- Study data
- Conversation state
- Gap Report generation

## Frontend

The frontend uses:

- HTML
- CSS
- Vanilla JavaScript

There is no framework-specific build step.

This keeps local setup simple and makes the project easy to inspect.

## AI

Anthropic's Claude API powers tasks including:

- Structured note extraction
- Definition extraction
- Concept identification
- Flashcard generation
- Quiz generation
- Analogies
- Additional explanations
- Call Maku conversations
- Gap-targeted remediation

## Voice

The current version uses browser-native speech functionality where supported.

This may include:

- `SpeechRecognition`
- `speechSynthesis`

Because browser support can vary, text input remains useful as a fallback.

---

# Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js |
| Server | Express |
| Frontend | HTML |
| Styling | CSS |
| Client Logic | Vanilla JavaScript |
| AI | Anthropic Claude API |
| Voice | Browser Speech APIs |
| Configuration | `.env` environment variables |

---

# Getting Started

## Prerequisites

Before running Maku locally, make sure you have:

- Node.js version 18 or newer
- npm
- An Anthropic API key
- A modern browser

---

## 1. Install Node.js

Maku requires **Node.js 18+**.

Check whether Node.js is already installed:

```bash
node --version
```

If the command returns version 18 or newer, you can continue.

Otherwise, install Node.js from:

```text
https://nodejs.org
```

After installing, verify:

```bash
node --version
npm --version
```

---

## 2. Clone the Repository

Clone the project:

```bash
git clone <YOUR_REPOSITORY_URL>
```

Move into the project directory:

```bash
cd <YOUR_REPOSITORY_FOLDER>
```

Replace the placeholders above with the actual GitHub repository URL and folder name.

---

## 3. Install Dependencies

Run:

```bash
npm install
```

This installs all Node.js dependencies required by the project.

---

# Anthropic API Setup

Maku requires users to provide **their own Anthropic API key**.

The API key is used by the backend to communicate with Claude.

You can create and manage API keys through the Anthropic Console:

```text
https://console.anthropic.com
```

Anthropic API usage is separate from a regular Claude.ai subscription.

Depending on your account, you may need to configure billing or add API usage credits in the Anthropic Console before API requests will work.

## Create your `.env` file

The repository includes an example environment file:

```text
.env.example
```

Copy it to create your local `.env` file:

```bash
cp .env.example .env
```

On Windows Command Prompt:

```cmd
copy .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then open the newly created `.env` file in your text editor.

You should see something similar to:

```env
ANTHROPIC_API_KEY=
```

Paste your personal Anthropic API key after the equals sign:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Your final `.env` file should look similar to:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

The application backend will read this value when making requests to Anthropic.

## Important

Never commit your real API key to GitHub.

Your `.env` file should be included in `.gitignore`.

Before pushing changes, confirm:

```bash
git status
```

Your `.env` file should **not** appear as a file being committed.

Never put your Anthropic API key directly into:

- Frontend JavaScript
- HTML
- CSS
- Public configuration files
- GitHub commits
- Screenshots
- Demo videos

API requests should remain server-side.

---

# Running the App

After installing dependencies and configuring your Anthropic API key, start Maku with:

```bash
npm start
```

Once the server starts, open:

```text
http://localhost:3000
```

in your browser.

The complete setup flow is:

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env

# Add your Anthropic API key inside .env
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Start Maku
npm start
```

Then visit:

```text
http://localhost:3000
```

---

# Using Maku

## Step 1: Import Notes

From the home screen, select:

```text
Import Notes
```

Enter a topic name.

For example:

```text
Operating Systems
```

Upload a Markdown file:

```text
operating_systems_notes.md
```

Maku will process the material and extract structured study content.

---

## Step 2: View the Topic

Open:

```text
View Topics
```

Select the topic you imported.

You can explore:

- Notes
- Definitions
- Concepts
- Gap Reports
- Added Notes

---

## Step 3: Study

Open:

```text
Study
```

Select a topic.

Use the left side to review your notes.

Use the right side to:

- Write annotations
- Ask AI questions
- Generate explanations
- Create flashcards
- Practice flashcards
- Take quizzes

---

## Step 4: Highlight and Ask Questions

Select or highlight material in your notes.

Open the AI Tools section.

You can:

- Ask a question
- Request an analogy
- Ask for more detail
- Write a custom prompt

Useful responses can be saved into your additional notes.

---

## Step 5: Practice

Use the Flashcards tab to:

- Generate cards from your notes
- Create your own cards
- Practice active recall

Use the Quiz tab to answer AI-generated questions based on your material.

---

## Step 6: Call Maku

Return to the home screen and select:

```text
Call Maku
```

Choose a topic.

Then choose a mode.

For the main experience, select:

```text
Teach Maku
```

Start the session.

Explain the topic as though you are teaching a friend.

Maku will ask questions based on what it does not understand.

---

## Step 7: Review Your Gap Report

End the call.

Maku generates a report describing:

- Concepts you demonstrated
- Concepts that appeared incomplete
- Concepts that were never discussed
- Suggested follow-up study prompts

Return to:

```text
View Topics → Gap Reports
```

to review previous reports.

---

# Project Structure

A typical project structure may look similar to:

```text
maku/
│
├── assets/
│   ├── maku-sprite.png
│   │
│   └── screenshots/
│       ├── home.png
│       ├── import-notes.png
│       ├── topics.png
│       ├── study.png
│       ├── ai-tools.png
│       ├── flashcards.png
│       ├── quiz.png
│       ├── call-maku.png
│       └── gap-report.png
│
├── public/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── routes/
├── services/
├── data/
│
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

A possible separation of responsibilities is:

```text
public/
```

Frontend files and visual assets.

```text
routes/
```

Express routes and HTTP endpoints.

```text
services/
```

Anthropic API logic and AI-related processing.

```text
data/
```

Locally stored topic or study data, depending on the project configuration.

```text
server.js
```

Express application entry point.

---

# Environment Variables

The project currently requires an Anthropic API key.

Example:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The included `.env.example` should contain only placeholder values:

```env
ANTHROPIC_API_KEY=
```

Never place real credentials inside `.env.example`.

---

# Security Notes

## Never expose your API key

Your Anthropic API key should remain private.

The key should only be used by the server.

Do not send it to the browser or include it in client-side JavaScript.

## Do not commit `.env`

Make sure `.gitignore` contains:

```gitignore
.env
```

## Rotate exposed keys

If an API key is accidentally:

- Committed to GitHub
- Shared publicly
- Included in a screenshot
- Included in a demo recording

Revoke it immediately through the Anthropic Console and create a new key.

---

# Learning Science Behind Maku

Maku's core design was inspired by the idea that explaining a concept can reveal weaknesses that passive review may hide.

Two broad learning principles influenced the project.

## Learning by Teaching

Teach Maku is inspired by the idea commonly associated with the **protégé effect**.

When students teach material, they often have to:

- Retrieve information from memory
- Organize it coherently
- Explain relationships
- Identify missing pieces
- Respond to questions

Maku turns this process into an interactive study mode.

## Retrieval Practice

Flashcards and quizzes support retrieval practice by requiring the student to actively recall information instead of simply rereading it.

Maku combines retrieval-based tools with open-ended explanation.

The goal is to support both:

```text
Can I remember this?
```

and:

```text
Can I explain this?
```

---

# Design

Maku's visual identity is designed to feel calm, cozy, and approachable.

The application uses:

- Soft sage greens
- Warm cream backgrounds
- Paper and stationery-inspired surfaces
- Books and notebooks
- Hand-drawn study objects
- A small green Maku character

Maku appears throughout the application as a study companion rather than simply as a logo.

Different illustrations can represent states such as:

- Studying
- Thinking
- Confusion
- Understanding
- Sleeping
- Listening
- Asking questions

The goal is to make the experience feel like studying alongside a tiny companion rather than interacting with a generic chatbot.

---

# Known Limitations

## Browser Speech Support

Speech recognition support varies by browser.

If voice input does not work, use text input instead.

## API Usage

Maku relies on the Anthropic API.

A valid API key and available API usage balance are required for AI-powered features.

## Local Development

The current version is primarily designed to run locally.

Closing or resetting the local application may affect locally stored data depending on the current persistence implementation.

## AI Output

AI-generated material may occasionally contain mistakes.

Students should verify important academic information against:

- Course materials
- Textbooks
- Lecture notes
- Instructors

Maku is intended to support studying, not replace authoritative course resources.

---

# Future Improvements

## Natural Voice

Integrating a higher-quality voice system for more expressive Maku conversations.

## Spaced Repetition

Adding a scheduling system inspired by modern spaced-repetition models such as FSRS.

Instead of manually choosing when to review material, Maku could surface concepts based on predicted forgetting.

## Concept-Level Mastery

Instead of tracking progress only at the topic level, future versions could track understanding at the individual concept level.

For example:

```text
Operating Systems

Processes              Strong
CPU Scheduling         Strong
Threads                 Developing
Virtual Memory          Developing
Paging                  Needs Review
Deadlocks               Strong
```

## Better Concept Relationships

Future versions could model relationships between concepts.

For example:

```text
Virtual Memory
      ↓
Paging
      ↓
Page Tables
      ↓
Page Faults
```

This could help Maku identify when a student's misunderstanding originates from a more foundational concept.

## Long-Term Study History

Gap Reports could be compared across multiple sessions to determine whether previously weak concepts improve over time.

## Teacher-Facing Insights

A future classroom version could provide instructors with aggregated information about concepts that many students struggle to explain.

For example:

> Most students can define virtual memory but struggle to explain how page tables connect virtual and physical addresses.

---

# Philosophy

Maku is built around one central distinction:

> **Familiarity is not the same as understanding.**

Seeing the correct answer is not the same as producing it.

Producing an answer is not always the same as understanding why it is true.

And understanding one isolated fact is not always the same as understanding how it connects to everything around it.

Maku is an attempt to build study software around those differences.

Instead of asking only:

> "Did you get the answer right?"

Maku asks:

> "Can you explain it?"

And when the explanation breaks down:

> "What should we study next?"

---

# Quick Start

For anyone who just wants to get the project running:

```bash
# 1. Make sure Node.js 18+ is installed
node --version

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env

# 4. Open .env and add your personal Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 5. Start the server
npm start
```

Then open:

```text
http://localhost:3000
```

You can create an Anthropic API key through:

```text
https://console.anthropic.com
```

API usage may require billing or usage credits configured separately through the Anthropic Console.

---

# Maku

**Teach Maku what you know. It’ll show you what you don’t.**