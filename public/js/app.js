// ========================================================================
// Maku — front-end app logic
// ========================================================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- character mount points ----------
const homeMaku = document.getElementById('home-maku');
const toolMaku = document.getElementById('tool-maku');
const makuCall = document.getElementById('maku-call');
const reportMaku = document.getElementById('report-maku');
const importMaku = document.getElementById('import-maku');
function mountCorner(id, pose) {
  const el = document.getElementById(id);
  if (el) Maku.mount(el, pose || 'peek', { float: true });
}

// ---------- screen navigation ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); animateIn(target); }

  if (id === 'screen-topics') { resetTopics(); mountCorner('corner-topics', 'folder'); }
  if (id === 'screen-import') { Maku.mount(importMaku, 'sitting', { float: true }); }
  if (id === 'screen-study') resetStudy();
  if (id === 'screen-call') { resetCall(); mountCorner('corner-call', 'sitting'); }
  requestAnimationFrame(() => { if (typeof fitScene === 'function') fitScene(); });
}
function showScreenSilently(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active'); animateIn(el);
}

// ---------- soft page transition ----------
function animateIn(el) {
  if (!el || reduceMotion) return;
  el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
}
function flipTo(id, onSwap) {
  onSwap = onSwap || (() => showScreen(id));
  onSwap();
}

document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', () => {
    if (el.id === 'call-back') stopCallCleanup();
    flipTo(el.dataset.target);
  });
});

// ---------- tiny markdown renderer ----------
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inlineMd(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function renderMarkdown(md) {
  const lines = (md || '').split('\n');
  let html = '';
  let listType = null;
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); html += '<hr>'; continue; }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      closeList();
      const level = Math.min(m[1].length, 3);
      html += `<h${level}>${inlineMd(m[2])}</h${level}>`; continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += `<li>${inlineMd(m[1])}</li>`; continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
      html += `<li>${inlineMd(m[1])}</li>`; continue;
    }
    if (line.trim() === '') { closeList(); continue; }
    closeList();
    html += `<p>${inlineMd(line)}</p>`;
  }
  closeList();
  return html;
}

// ---------- shared topic cache + pickers ----------
async function fetchTopics() { return (await fetch('/api/topics')).json(); }
async function fetchTopic(name) {
  const res = await fetch('/api/topics/' + encodeURIComponent(name));
  if (!res.ok) throw new Error('Topic not found');
  return res.json();
}
function starHtml(stars) {
  let s = '';
  for (let i = 0; i < 5; i++) s += `<span class="${i < stars ? 'on' : ''}">★</span>`;
  return `<div class="stars">${s}</div>`;
}
function renderTopicPicker(container, onPick) {
  fetchTopics().then(topics => {
    if (!topics.length) {
      container.innerHTML = '<p class="muted">No topics yet — head to Import Notes to add your first one.</p>';
      return;
    }
    container.innerHTML = '';
    topics.forEach(t => {
      const r = t.rating || { stars: 0 };
      const card = document.createElement('button');
      card.className = 'book-card';
      card.dataset.name = t.name;
      card.title = `${r.callSessions || 0} calls · ${r.quizAnswered || 0} quiz answers · ${r.flashcardsPracticed || 0} cards practiced`;
      card.innerHTML =
        `<div class="bc-title">${escapeHtml(t.name)}</div>
         <div class="bc-sub">${t.conceptCount} notes · ${t.flashcardCount} cards · ${t.gapReportCount} reports</div>
         <div class="bc-stars">${starHtml(r.stars)}</div>`;
      card.addEventListener('click', () => onPick(t.name));
      container.appendChild(card);
    });
  }).catch(() => {
    container.innerHTML = '<p class="muted">Could not load topics. Is the server running?</p>';
  });
}

// ---------- Import Notes ----------
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filePickerBtn = document.getElementById('file-picker-btn');
const importStatus = document.getElementById('import-status');
const topicNameInput = document.getElementById('topic-name-input');

if (filePickerBtn) filePickerBtn.addEventListener('click', () => fileInput.click());
if (dropZone) {
  ['dragover', 'dragenter'].forEach(evt =>
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.style.background = 'var(--sage)'; }));
  ['dragleave', 'drop'].forEach(evt =>
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.style.background = 'transparent'; }));
  dropZone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); });
}
if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleImportFile(fileInput.files[0]); });

async function handleImportFile(file) {
  const name = topicNameInput.value.trim();
  if (!name) { importStatus.textContent = 'Give your topic a name first.'; return; }
  if (!file.name.endsWith('.md')) { importStatus.textContent = 'that doesn\'t look like a .md file — try another?'; return; }
  importStatus.textContent = 'maku is reading…';
  Maku.mount(importMaku, 'thinking');
  Sound.play('place');
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  try {
    const res = await fetch('/api/topics', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    importStatus.textContent = `all tucked away! "${name}" — ${data.definitions.length} definitions, ${data.concepts.length} concepts, ${data.formulas.length} formulas.`;
    topicNameInput.value = '';
    Maku.mount(importMaku, 'happy', { float: true });
    Sound.play('chime');
  } catch (err) {
    importStatus.textContent = 'hmm, that didn\'t work: ' + err.message;
    Maku.mount(importMaku, 'confused');
  }
}

// ========================================================================
// View Topics — folder stack + 5 tabs
// ========================================================================
const topicsPicker = document.getElementById('topics-picker');
const topicsFolderView = document.getElementById('topics-folder-view');
const folderBody = document.getElementById('folder-body');
const folderCaption = document.getElementById('folder-caption');
let openTopic = null;

function resetTopics() {
  topicsFolderView.style.display = 'none';
  topicsPicker.style.display = 'block';
  renderTopicPicker(document.getElementById('topics-list'), openFolder);
}

async function openFolder(name) {
  openTopic = await fetchTopic(name);
  folderCaption.textContent = `folder opening: "${name}"`;
  topicsPicker.style.display = 'none';
  topicsFolderView.style.display = 'block';
  const folder = document.getElementById('folder');
  folder.style.animation = 'none'; void folder.offsetWidth; folder.style.animation = '';
  document.querySelectorAll('#topics-folder-view .tab').forEach(t => t.classList.remove('active'));
  document.querySelector('#topics-folder-view .tab[data-tab="notes"]').classList.add('active');
  renderFolderTab('notes');
}

document.querySelectorAll('#topics-folder-view .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#topics-folder-view .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderFolderTab(tab.dataset.tab);
  });
});

function renderFolderTab(which) {
  if (!openTopic) return;
  if (which === 'notes') {
    folderBody.innerHTML = `<div class="rendered">${renderMarkdown(openTopic.markdown)}</div>
      <p class="folder-hint">Rendered from your imported markdown.</p>`;
  } else if (which === 'definitions') {
    const defs = openTopic.definitions || [];
    folderBody.innerHTML = defs.length
      ? defs.map(d => rowHtml(d.term, d.definition)).join('') + jumpHint()
      : '<p class="muted">No definitions extracted for this topic.</p>';
    wireFolderRows();
  } else if (which === 'concepts') {
    const cs = openTopic.concepts || [];
    folderBody.innerHTML = cs.length
      ? cs.map(c => rowHtml(c.name, c.summary)).join('') + jumpHint()
      : '<p class="muted">No key concepts extracted for this topic.</p>';
    wireFolderRows();
  } else if (which === 'gaps') {
    const gs = openTopic.gapReports || [];
    folderBody.innerHTML = gs.length
      ? gs.map(g => `<div class="report-entry"><p class="mono-label">${escapeHtml(g.label)} · ${new Date(g.date).toLocaleString()}</p><div class="rendered">${renderMarkdown(g.report)}</div></div>`).join('<hr>')
      : '<p class="muted">No gap reports yet — finish a Call Maku session to generate one.</p>';
  } else if (which === 'added') {
    folderBody.innerHTML = openTopic.additionalNotes
      ? `<div class="rendered">${renderMarkdown(openTopic.additionalNotes)}</div>`
      : '<p class="muted">No added notes yet — write some in Study mode\'s Notes tab.</p>';
  }
}
function rowHtml(title, sub) {
  return `<div class="note-row" data-passage="${escapeHtml(title + '. ' + (sub || ''))}">
    <div><strong>${escapeHtml(title)}</strong><span class="row-sub">${escapeHtml(sub || '')}</span></div></div>`;
}
function jumpHint() { return '<p class="folder-hint">Click any row to jump into Study mode with that section pre-selected.</p>'; }
function wireFolderRows() {
  folderBody.querySelectorAll('.note-row').forEach(row => {
    row.addEventListener('click', () => openStudy(openTopic.name, row.dataset.passage, true));
  });
}

// ========================================================================
// Study workspace
// ========================================================================
const studyPicker = document.getElementById('study-picker');
const studyLayout = document.getElementById('study-layout');
const studyNotes = document.getElementById('study-notes');
const studyTitle = document.getElementById('study-title');
const studyInput = document.getElementById('study-input');
const studyOutput = document.getElementById('study-output');
const studyAddBtn = document.getElementById('study-add');
const noteArea = document.getElementById('note-area');
const noteSaveBtn = document.getElementById('note-save');
const noteSaveHint = document.getElementById('note-save-hint');
const highlightPop = document.getElementById('highlight-pop');

let studyTopic = null;
let selectedPassage = '';
let pendingHighlight = '';
let studyMode = 'question';
let lastStudyResult = '';

function resetStudy() {
  studyLayout.style.display = 'none';
  studyPicker.style.display = 'block';
  studyTitle.textContent = 'Study';
  renderTopicPicker(document.getElementById('study-topics-list'), name => openStudy(name, null, false));
}

async function openStudy(name, presetPassage, useFlip) {
  const topic = await fetchTopic(name);
  const render = () => {
    studyTopic = topic;
    studyTitle.textContent = 'Study — ' + name;
    studyPicker.style.display = 'none';
    studyLayout.style.display = 'flex';
    if (!document.getElementById('screen-study').classList.contains('active')) showScreenSilently('screen-study');

    renderNotesWithHighlights();
    selectedPassage = presetPassage || '';
    studyInput.value = '';
    lastStudyResult = '';
    studyAddBtn.disabled = true;
    Maku.mount(toolMaku, 'idle');
    studyOutput.innerHTML = presetPassage
      ? `<span class="muted">Passage pre-selected: "${escapeHtml(presetPassage.slice(0, 70))}…" — pick an option, type your request, press Enter.</span>`
      : '<span class="muted">Select a passage on the left, pick an option, type your request, and press Enter.</span>';

    // note taking
    noteArea.value = topic.additionalNotes || '';
    noteSaveHint.textContent = '';
    // flashcards
    studyFlashcards = (topic.flashcards || []).map(c => ({ ...c }));
    renderFlashList();
    // quiz
    resetQuizUI();
    // default to the Notes tab
    switchStab('notetaking');
  };
  if (useFlip) flipTo('screen-study', render);
  else render();
}

// ---- study sub-tabs ----
document.querySelectorAll('.stab').forEach(btn => {
  btn.addEventListener('click', () => switchStab(btn.dataset.stab));
});
function switchStab(name) {
  document.querySelectorAll('.stab').forEach(b => b.classList.toggle('active', b.dataset.stab === name));
  document.querySelectorAll('.stab-panel').forEach(p => p.classList.toggle('active', p.id === 'stab-' + name));
}

// ---- highlights ----
function renderNotesWithHighlights() {
  studyNotes.innerHTML = renderMarkdown(studyTopic.markdown);
  (studyTopic.highlights || []).forEach(h => wrapFirst(studyNotes, h));
}
function wrapFirst(container, phrase) {
  if (!phrase) return false;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentNode.nodeName === 'MARK') continue;
    const idx = node.nodeValue.indexOf(phrase);
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(node, idx); range.setEnd(node, idx + phrase.length);
      const mark = document.createElement('mark'); mark.className = 'hl';
      try { range.surroundContents(mark); return true; } catch { return false; }
    }
  }
  return false;
}
async function saveHighlights() {
  try {
    await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/highlights`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highlights: studyTopic.highlights })
    });
  } catch {}
}
studyNotes.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  const text = sel.toString().trim();
  if (text) {
    selectedPassage = text;
    pendingHighlight = text;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    highlightPop.style.left = Math.max(8, rect.left + rect.width / 2 - 40) + 'px';
    highlightPop.style.top = Math.max(8, rect.top - 42) + 'px';
    highlightPop.classList.add('show');
  }
});
highlightPop.addEventListener('mousedown', e => e.preventDefault()); // keep selection
highlightPop.addEventListener('click', () => {
  if (!pendingHighlight || !studyTopic) return;
  if (!studyTopic.highlights.includes(pendingHighlight)) {
    studyTopic.highlights.push(pendingHighlight);
    saveHighlights();
    renderNotesWithHighlights();
  }
  window.getSelection().removeAllRanges();
  highlightPop.classList.remove('show');
});
document.addEventListener('mousedown', e => {
  if (e.target !== highlightPop && !studyNotes.contains(e.target)) highlightPop.classList.remove('show');
});
// click a highlight to remove it
studyNotes.addEventListener('click', e => {
  if (e.target.nodeName === 'MARK' && studyTopic) {
    const txt = e.target.textContent;
    studyTopic.highlights = studyTopic.highlights.filter(h => h !== txt);
    saveHighlights();
    renderNotesWithHighlights();
  }
});

// ---- AI tools (no auto-generate; Enter to run) ----
document.querySelectorAll('#stab-ai .mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#stab-ai .mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    studyMode = btn.dataset.mode;
    studyInput.focus();
  });
});
studyInput.addEventListener('keydown', e => { if (e.key === 'Enter') runStudyAsk(); });

async function runStudyAsk() {
  if (!selectedPassage) { studyOutput.innerHTML = '<span class="muted">Select a passage in your notes first.</span>'; return; }
  const userInput = studyInput.value.trim();
  if (!userInput) { studyOutput.innerHTML = '<span class="muted">Type your question or request, then press Enter.</span>'; return; }
  studyOutput.innerHTML = '<span class="muted">Maku is thinking…</span>';
  studyAddBtn.disabled = true;
  Maku.mount(toolMaku, 'thinking');
  try {
    const res = await fetch('/api/study/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedText: selectedPassage, mode: studyMode, userInput })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    lastStudyResult = data.result;
    studyOutput.innerHTML = `<strong>You asked:</strong> "${escapeHtml(userInput)}"<br/><br/><strong>Maku:</strong> ${renderMarkdown(data.result)}`;
    studyAddBtn.disabled = false;
    Maku.mount(toolMaku, 'happy');
    setTimeout(() => Maku.mount(toolMaku, 'idle'), 2200);
  } catch (err) {
    studyOutput.innerHTML = `<span class="muted">Error: ${escapeHtml(err.message)}</span>`;
    Maku.mount(toolMaku, 'idle');
  }
}
studyAddBtn.addEventListener('click', async () => {
  if (!lastStudyResult || !studyTopic) return;
  studyAddBtn.disabled = true; studyAddBtn.textContent = 'Adding…';
  Maku.mount(toolMaku, 'writing');
  try {
    const res = await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/notes/append`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heading: 'From Study — AI Tools', content: lastStudyResult })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Append failed');
    studyTopic.additionalNotes = data.additionalNotes;
    noteArea.value = data.additionalNotes;
    studyAddBtn.textContent = '✓ Added to notes';
    setTimeout(() => { studyAddBtn.textContent = '+ Add to my notes'; Maku.mount(toolMaku, 'idle'); }, 1600);
  } catch {
    studyAddBtn.textContent = '+ Add to my notes'; studyAddBtn.disabled = false; Maku.mount(toolMaku, 'idle');
  }
});

// ---- note taking ----
async function saveNotes() {
  if (!studyTopic) return;
  noteSaveHint.textContent = 'Saving…';
  try {
    const res = await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additionalNotes: noteArea.value })
    });
    const data = await res.json();
    studyTopic.additionalNotes = data.additionalNotes;
    noteSaveHint.textContent = 'Saved ✓';
    setTimeout(() => { noteSaveHint.textContent = ''; }, 1500);
  } catch { noteSaveHint.textContent = 'Save failed'; }
}
noteSaveBtn.addEventListener('click', saveNotes);
noteArea.addEventListener('blur', () => { if (studyTopic && noteArea.value !== studyTopic.additionalNotes) saveNotes(); });

// ---- flashcards ----
let studyFlashcards = [];
const flashList = document.getElementById('flash-list');
function renderFlashList() {
  if (!studyFlashcards.length) {
    flashList.innerHTML = '<p class="muted">No flashcards yet — write your own or generate them from your notes.</p>';
    return;
  }
  flashList.innerHTML = '';
  studyFlashcards.forEach((c, i) => {
    const item = document.createElement('div');
    item.className = 'flash-item';
    item.innerHTML =
      `<div class="fi-line"><span class="fi-label">front</span><textarea data-i="${i}" data-side="front">${escapeHtml(c.front)}</textarea><button class="fi-del" data-i="${i}" title="delete">×</button></div>
       <div class="fi-line"><span class="fi-label">back</span><textarea data-i="${i}" data-side="back">${escapeHtml(c.back)}</textarea></div>`;
    flashList.appendChild(item);
  });
  flashList.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('change', () => {
      studyFlashcards[+ta.dataset.i][ta.dataset.side] = ta.value;
      saveFlashcards();
    });
  });
  flashList.querySelectorAll('.fi-del').forEach(btn => {
    btn.addEventListener('click', () => {
      studyFlashcards.splice(+btn.dataset.i, 1);
      renderFlashList(); saveFlashcards();
    });
  });
}
async function saveFlashcards() {
  try {
    const res = await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/flashcards`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcards: studyFlashcards })
    });
    const data = await res.json();
    studyFlashcards = data.flashcards;
  } catch {}
}
document.getElementById('flash-add').addEventListener('click', () => {
  studyFlashcards.push({ front: '', back: '' });
  renderFlashList();
});
document.getElementById('flash-generate').addEventListener('click', async () => {
  const btn = document.getElementById('flash-generate');
  btn.textContent = 'Generating…'; btn.disabled = true;
  Maku.mount(toolMaku, 'thinking');
  try {
    const res = await fetch('/api/study/flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: studyTopic.name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    studyFlashcards = studyFlashcards.concat(data.cards || []);
    renderFlashList(); await saveFlashcards();
    Maku.mount(toolMaku, 'happy'); setTimeout(() => Maku.mount(toolMaku, 'idle'), 2000);
  } catch (err) {
    alert('Could not generate flashcards: ' + err.message);
    Maku.mount(toolMaku, 'idle');
  } finally {
    btn.textContent = 'Generate from notes'; btn.disabled = false;
  }
});

// flashcard practice overlay
const fpOverlay = document.getElementById('flash-practice-overlay');
const fpCard = document.getElementById('fp-card');
const fpFace = document.getElementById('fp-face');
const fpProgress = document.getElementById('fp-progress');
let fpIndex = 0, fpFlipped = false, fpVisited = new Set();

document.getElementById('flash-practice').addEventListener('click', () => {
  if (!studyFlashcards.length) { alert('Add or generate some flashcards first.'); return; }
  fpIndex = 0; fpVisited = new Set();
  fpOverlay.style.display = 'flex';
  showFpCard();
});
function showFpCard() {
  fpFlipped = false; fpVisited.add(fpIndex);
  fpCard.classList.remove('flipped');
  fpFace.textContent = studyFlashcards[fpIndex].front || '(empty)';
  fpProgress.textContent = `Card ${fpIndex + 1} / ${studyFlashcards.length}`;
}
fpCard.addEventListener('click', () => {
  fpFlipped = !fpFlipped;
  fpCard.classList.toggle('flipped', fpFlipped);
  fpFace.textContent = (fpFlipped ? studyFlashcards[fpIndex].back : studyFlashcards[fpIndex].front) || '(empty)';
});
document.getElementById('fp-next').addEventListener('click', () => {
  fpIndex = (fpIndex + 1) % studyFlashcards.length; showFpCard();
});
document.getElementById('fp-prev').addEventListener('click', () => {
  fpIndex = (fpIndex - 1 + studyFlashcards.length) % studyFlashcards.length; showFpCard();
});
document.getElementById('fp-done').addEventListener('click', async () => {
  fpOverlay.style.display = 'none';
  if (fpVisited.size) {
    try {
      await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/activity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'flashcardsPracticed', amount: fpVisited.size })
      });
    } catch {}
  }
});

// ---- quiz ----
const quizIntro = document.getElementById('quiz-intro');
const quizRun = document.getElementById('quiz-run');
const quizProgress = document.getElementById('quiz-progress');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const quizNext = document.getElementById('quiz-next');
let quizQuestions = [], quizIdx = 0, quizScore = 0;

function resetQuizUI() {
  quizIntro.style.display = 'flex';
  quizRun.style.display = 'none';
  quizIntro.querySelector('.muted').textContent = 'A multiple-choice practice quiz generated from your notes, one question at a time.';
  document.getElementById('quiz-start').textContent = 'Generate quiz';
}
document.getElementById('quiz-start').addEventListener('click', async () => {
  const btn = document.getElementById('quiz-start');
  btn.textContent = 'Generating…'; btn.disabled = true;
  Maku.mount(toolMaku, 'thinking');
  try {
    const res = await fetch('/api/study/quiz', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: studyTopic.name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    quizQuestions = data.questions || [];
    if (!quizQuestions.length) throw new Error('No questions generated');
    quizIdx = 0; quizScore = 0;
    quizIntro.style.display = 'none'; quizRun.style.display = 'flex';
    Maku.mount(toolMaku, 'idle');
    showQuizQuestion();
  } catch (err) {
    alert('Could not generate the quiz: ' + err.message);
    Maku.mount(toolMaku, 'idle');
  } finally {
    btn.disabled = false; btn.textContent = 'Generate quiz';
  }
});
function showQuizQuestion() {
  const q = quizQuestions[quizIdx];
  quizProgress.textContent = `Question ${quizIdx + 1} / ${quizQuestions.length} · score ${quizScore}`;
  quizQuestion.textContent = q.question;
  quizFeedback.innerHTML = '';
  quizNext.style.display = 'none';
  quizOptions.innerHTML = '';
  q.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.textContent = opt;
    b.addEventListener('click', () => answerQuiz(i));
    quizOptions.appendChild(b);
  });
}
async function answerQuiz(choice) {
  const q = quizQuestions[quizIdx];
  const btns = [...quizOptions.children];
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('correct');
    if (i === choice && choice !== q.answer) b.classList.add('wrong');
  });
  if (choice === q.answer) { quizScore++; Sound.play('chime'); }
  quizFeedback.innerHTML = `<strong>${choice === q.answer ? 'Correct!' : 'Not quite.'}</strong> ${escapeHtml(q.explanation)}`;
  quizNext.style.display = 'inline-block';
  quizNext.textContent = quizIdx + 1 < quizQuestions.length ? 'Next →' : 'Finish';
  try {
    await fetch(`/api/topics/${encodeURIComponent(studyTopic.name)}/activity`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'quizAnswered', amount: 1 })
    });
  } catch {}
}
quizNext.addEventListener('click', () => {
  quizIdx++;
  if (quizIdx < quizQuestions.length) { showQuizQuestion(); }
  else {
    resetQuizUI();
    quizIntro.querySelector('.muted').textContent = `You scored ${quizScore} / ${quizQuestions.length}. Generate a fresh quiz to keep practicing.`;
    document.getElementById('quiz-start').textContent = 'New quiz';
  }
});

// ========================================================================
// Call Maku
// ========================================================================
const callSetup = document.getElementById('call-setup');
const callActive = document.getElementById('call-active');
const callReport = document.getElementById('call-report');
const startCallBtn = document.getElementById('start-call-btn');
const speechBubble = document.getElementById('speech-bubble');
const checklistMini = document.getElementById('checklist-mini');
const callPill = document.getElementById('call-pill');
const callModeLabel = document.getElementById('call-mode-label');
const callTextInput = document.getElementById('call-text-input');
const micBtn = document.getElementById('mic-btn');
const endCallBtn = document.getElementById('end-call-btn');
const reportBody = document.getElementById('report-body');
const ringStatus = document.getElementById('ring-status');

let callTopic = null, callMode = null, callMessages = [], callChecklist = [];
let callTimer = null, callSeconds = 0, callBusy = false;

const MODE_LABELS = {
  examples: 'Solve examples', quiz: 'Test definitions & formulas',
  questions: 'Ask me questions', teach: 'Teach Maku'
};

function resetCall() {
  stopCallCleanup();
  callSetup.style.display = 'block';
  callActive.style.display = 'none';
  callActive.classList.remove('ringing', 'ending');
  callReport.style.display = 'none';
  callTopic = null; callMode = null;
  startCallBtn.disabled = true;
  document.querySelectorAll('.call-mode-card').forEach(c => c.classList.remove('selected'));
  renderTopicPicker(document.getElementById('call-topics-list'), name => {
    callTopic = name;
    document.querySelectorAll('#call-topics-list .book-card').forEach(c =>
      c.classList.toggle('selected', c.dataset.name === name));
    updateStartBtn();
  });
}
document.querySelectorAll('.call-mode-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.call-mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    callMode = card.dataset.mode;
    updateStartBtn();
  });
});
function updateStartBtn() { startCallBtn.disabled = !(callTopic && callMode); }
startCallBtn.addEventListener('click', startCall);

async function startCall() {
  callSetup.style.display = 'none';
  callActive.style.display = 'flex';
  callActive.classList.add('ringing');
  callActive.classList.remove('ending');
  callMessages = []; callSeconds = 0;
  callModeLabel.textContent = 'mode: ' + (MODE_LABELS[callMode] || '').toLowerCase();
  callPill.textContent = (MODE_LABELS[callMode] || 'CALL').toUpperCase() + ' · ☎';
  ringStatus.innerHTML = 'Calling Maku<span class="ring-dots"><i>.</i><i>.</i><i>.</i></span>';
  Maku.mount(makuCall, 'call-ring');
  checklistMini.innerHTML = '';
  Sound.play('ring');

  const startP = fetch('/api/maku/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: callTopic, mode: callMode })
  }).then(r => r.json().then(d => ({ ok: r.ok, d })));

  await wait(reduceMotion ? 500 : 1900); // ringing
  callActive.classList.remove('ringing');   // Maku picks up
  Sound.play('connect');
  startTimer();

  try {
    const { ok, d } = await startP;
    if (!ok) throw new Error(d.error || 'Failed to start');
    callChecklist = d.checklist || [];
    renderChecklist();
    makuTurn(d.opening || 'Hi! Ready when you are.', 'call-hi');
  } catch (err) {
    speechBubble.textContent = 'Could not start the call: ' + err.message;
    Maku.mount(makuCall, 'call-hi');
  }
}
function startTimer() {
  clearInterval(callTimer);
  callTimer = setInterval(() => {
    callSeconds++;
    const mm = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const ss = String(callSeconds % 60).padStart(2, '0');
    callPill.textContent = `${(MODE_LABELS[callMode] || 'CALL').toUpperCase()} · ${mm}:${ss}`;
  }, 1000);
}
function renderChecklist() {
  checklistMini.innerHTML = callChecklist.map(c =>
    `<span class="chip-c ${c.covered ? 'done' : ''}">${escapeHtml(c.concept)}</span>`).join('');
}
// Maku speaks a turn: show the right call image, say it, then hand the turn
// back to the student (answer image) once the audio finishes.
function makuTurn(text, image) {
  callMessages.push({ role: 'maku', text });
  Maku.mount(makuCall, image || 'call-question');
  speechBubble.textContent = '“' + text + '”';
  speak(text, () => Maku.mount(makuCall, 'call-answer'));
}
async function sendToMaku(text) {
  if (callBusy || !text.trim()) return;
  callBusy = true;
  callMessages.push({ role: 'you', text: text.trim() });
  callTextInput.value = '';
  speechBubble.textContent = 'Maku is thinking…';
  Maku.mount(makuCall, 'call-question');
  try {
    const res = await fetch('/api/maku/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: callTopic, mode: callMode, messages: callMessages, checklist: callChecklist })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    callChecklist = data.checklist || callChecklist;
    renderChecklist();
    makuTurn(data.reply || '…', 'call-question');
  } catch (err) {
    speechBubble.textContent = 'Hmm, connection hiccup: ' + err.message;
    Maku.mount(makuCall, 'call-answer');
  } finally { callBusy = false; }
}
callTextInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendToMaku(callTextInput.value); });
endCallBtn.addEventListener('click', endCall);

async function endCall() {
  if (callBusy) return;
  stopVoice();
  clearInterval(callTimer);
  callActive.classList.add('ending');
  ringStatus.innerHTML = 'Call ended';
  Maku.mount(makuCall, 'call-hi');
  const sumP = fetch('/api/maku/summary', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: callTopic, mode: callMode, messages: callMessages, checklist: callChecklist })
  }).then(r => r.json().then(d => ({ ok: r.ok, d })));

  await wait(reduceMotion ? 400 : 1400);
  try {
    const { ok, d } = await sumP;
    if (!ok) throw new Error(d.error || 'Failed');
    callActive.style.display = 'none';
    callActive.classList.remove('ending');
    callReport.style.display = 'block';
    Maku.mount(reportMaku, 'happy', { float: true });
    reportBody.innerHTML = renderMarkdown(d.gapReport || 'No report generated.');
  } catch (err) {
    ringStatus.innerHTML = 'Could not generate the report: ' + escapeHtml(err.message);
  }
}
document.getElementById('report-done').addEventListener('click', () => flipTo('screen-entry'));

function stopCallCleanup() { clearInterval(callTimer); stopVoice(); }

// ---------- voice: ElevenLabs (server proxy) with browser-TTS fallback ----------
// The talking "bob" runs while audio plays; the call image is set by makuTurn.
let currentAudio = null;
let ttsEnabled = null; // null=unknown, true/false once /api/tts/status resolves
(async () => { try { ttsEnabled = !!(await (await fetch('/api/tts/status')).json()).enabled; } catch { ttsEnabled = false; } })();

function stopAudio() { if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; } }

function browserSpeak(text, finish) {
  if (!('speechSynthesis' in window)) { setTimeout(finish, Math.min(4500, 900 + text.length * 32)); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.03; u.pitch = 1.15;
    u.onend = finish; u.onerror = finish;
    window.speechSynthesis.speak(u);
    setTimeout(() => { if (makuCall.classList.contains('speaking')) finish(); }, 1500 + text.length * 90);
  } catch { finish(); }
}

async function speak(text, onDone) {
  makuCall.classList.add('speaking');
  let done = false;
  const finish = () => { if (done) return; done = true; makuCall.classList.remove('speaking'); if (onDone) onDone(); };

  // sound off → no text-to-speech; just pace the turn silently
  if (!Sound.isOn()) { setTimeout(finish, Math.min(4500, 900 + text.length * 32)); return; }

  if (ttsEnabled !== false) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        stopAudio();
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => { URL.revokeObjectURL(url); if (currentAudio === audio) currentAudio = null; finish(); };
        audio.onerror = () => { URL.revokeObjectURL(url); browserSpeak(text, finish); };
        try { await audio.play(); return; } catch { URL.revokeObjectURL(url); } // autoplay blocked → fall back
      } else {
        ttsEnabled = false; // no key / bad voice / quota — stop retrying this session, use browser voice
      }
    } catch { /* network/other → fall back */ }
  }
  browserSpeak(text, finish);
}

function stopVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  stopAudio();
  makuCall.classList.remove('speaking');
  stopListening();
}
window.__makuStopVoice = stopVoice; // let the sound toggle silence in-progress speech

// ---------- voice: speech recognition (in) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, listening = false;
if (SR) {
  recognition = new SR();
  recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.onresult = e => { const t = e.results[0][0].transcript; callTextInput.value = t; stopListening(); sendToMaku(t); };
  recognition.onend = () => stopListening();
  recognition.onerror = () => stopListening();
} else if (micBtn) { micBtn.title = 'Voice input not supported here — type your reply'; }
function startListening() {
  if (!recognition || listening || callBusy) { callTextInput.focus(); return; }
  try { listening = true; micBtn.classList.add('listening'); recognition.start(); } catch { stopListening(); }
}
function stopListening() {
  listening = false;
  if (micBtn) micBtn.classList.remove('listening');
  try { recognition && recognition.stop(); } catch {}
}
if (micBtn) micBtn.addEventListener('click', () => {
  if (!recognition) { callTextInput.focus(); return; }
  listening ? stopListening() : startListening();
});

// ========================================================================
// Auto-fit: scale the "scene" elements (home notebook + call phone) so they
// always fit the viewport, no matter the window size.
// ========================================================================
function fitScene() {
  const scenes = [
    { el: document.querySelector('#screen-entry .notebook-open'), reserve: 130 },
    { el: document.querySelector('#screen-call .phone'), reserve: 165 }
  ];
  scenes.forEach(({ el, reserve }) => {
    if (!el) return;
    el.style.transform = 'none';
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return; // hidden / not laid out
    const availW = window.innerWidth - 28;
    const availH = window.innerHeight - reserve;
    const s = Math.min(availW / w, availH / h, 1);
    el.style.transform = s < 1 ? `scale(${s.toFixed(3)})` : 'none';
  });
}
window.addEventListener('resize', fitScene);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitScene);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => fitScene());
  ['#screen-entry .notebook-open', '#screen-call .phone'].forEach(sel => {
    const el = document.querySelector(sel); if (el) ro.observe(el);
  });
}

// ---------- home background illustration ----------
(function loadHomeBg() {
  const img = document.getElementById('home-bg');
  const wrap = document.getElementById('home-illustration');
  if (!img || !wrap) return;
  img.addEventListener('load', () => wrap.classList.remove('no-img'));
  img.addEventListener('error', () => { img.style.display = 'none'; }); // keep fallback wash
  img.src = 'assets/backgrounds/home.png';
})();

// ---------- global click sound (the same soft "pop" as the sound toggle) ----------
document.addEventListener('click', e => {
  if (e.target.closest('button, .book-card, .note-row, [data-target]')) Sound.play('pop');
}, true);

// ---------- initial mount ----------
requestAnimationFrame(fitScene);
setTimeout(fitScene, 300);
