// ========================================================================
// Maku — the character.
// Single-frame painted PNGs, mapped to context by meaning.
//   sit/  : 1 studying(book)  2 tea  3 leaf-smile  4 folder  5 glasses-think  6 confused
//   rest/ : 1 sleep-on-book   2 lounging          3 sleep-pillow
//   call/ : ring  hi  question  answer
// Falls back to a built-in SVG if the manifest/images are missing.
// ========================================================================
window.Maku = (function () {
  const IMG = { sit: [], rest: [], call: {} };
  const active = new Map(); // el -> {pose, opts}

  // pose -> image resolver (indices match manifest order) --------------------
  function imgFor(pose) {
    const s = IMG.sit, r = IMG.rest, c = IMG.call;
    switch (pose) {
      // general
      case 'reading':
      case 'writing':   return s[0];            // studying with a book
      case 'sitting':
      case 'idle':      return s[1] || s[0];    // cozy / tea
      case 'happy':
      case 'waving':    return s[2] || s[0];    // leaf smile
      case 'folder':    return s[3] || s[0];    // holding a folder
      case 'thinking':  return s[4] || s[5] || s[0]; // glasses, pondering
      case 'confused':  return s[5] || s[4] || s[0];
      case 'sleeping':
      case 'peek':      return r[2] || r[0] || s[1]; // napping
      case 'resting':   return r[1] || r[0];
      // call
      case 'call-ring':     return c.ring;
      case 'call-hi':       return c.hi;
      case 'call-question': return c.question;
      case 'call-answer':   return c.answer;
      default:          return s[1] || s[0];
    }
  }

  const HOME_POSES = ['reading', 'sitting', 'happy', 'sleeping'];
  function randomHome() { return HOME_POSES[Math.floor(Math.random() * HOME_POSES.length)]; }

  // SVG fallback (only if images fail to load) ------------------------------
  function svgFallback() {
    const BODY = '#F6F4E4', INK = '#2B2A1E', SHADE = '#E4E0C4', BLUSH = '#E7A9A0', ACCENT = '#8FAE64';
    return `<svg class="maku-svg breathe" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="142" rx="30" ry="6" fill="${ACCENT}" opacity="0.16"/>
      <ellipse cx="47" cy="131" rx="10" ry="6" fill="${SHADE}"/><ellipse cx="73" cy="131" rx="10" ry="6" fill="${SHADE}"/>
      <ellipse cx="27" cy="95" rx="8" ry="13" fill="${BODY}" transform="rotate(14 27 95)"/><ellipse cx="93" cy="95" rx="8" ry="13" fill="${BODY}" transform="rotate(-14 93 95)"/>
      <ellipse cx="60" cy="100" rx="37" ry="33" fill="${BODY}"/><circle cx="60" cy="56" r="35" fill="${BODY}"/>
      <g class="maku-eyes"><circle cx="49" cy="55" r="4.5" fill="${INK}"/><circle cx="71" cy="55" r="4.5" fill="${INK}"/></g>
      <ellipse cx="41" cy="64" rx="5" ry="3" fill="${BLUSH}" opacity=".55"/><ellipse cx="79" cy="64" rx="5" ry="3" fill="${BLUSH}" opacity=".55"/>
      <path d="M52 67 Q60 73 68 67" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`;
  }

  // painting ---------------------------------------------------------------
  function paint(el, pose, opts) {
    const floatCls = opts && opts.float ? ' float' : '';
    const src = imgFor(pose);
    if (src) {
      el.innerHTML = `<img class="maku-img${floatCls}" src="${src}" alt="Maku" draggable="false">`;
      const img = el.querySelector('img');
      img.onerror = () => { el.innerHTML = `<div class="maku-fallback${floatCls}">${svgFallback()}</div>`; };
    } else {
      el.innerHTML = `<div class="maku-fallback${floatCls}">${svgFallback()}</div>`;
    }
  }

  function mount(el, pose, opts) {
    if (!el) return;
    active.set(el, { pose, opts });
    paint(el, pose, opts);
  }
  function setPose(el, pose, opts) { mount(el, pose, opts); }
  function setTalking(el, on) { if (el) el.classList.toggle('speaking', !!on); } // kept for compatibility
  function repaintAll() { active.forEach((v, el) => { if (el.isConnected) paint(el, v.pose, v.opts); }); }

  // load manifest ----------------------------------------------------------
  const ready = fetch('assets/maku/manifest.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : {}))
    .then(m => {
      if (Array.isArray(m.sit)) IMG.sit = m.sit;
      if (Array.isArray(m.rest)) IMG.rest = m.rest;
      if (m.call && typeof m.call === 'object') IMG.call = m.call;
      [...IMG.sit, ...IMG.rest, ...Object.values(IMG.call)].forEach(src => { const im = new Image(); im.src = src; });
      repaintAll();
    })
    .catch(() => {});

  return { mount, setPose, setTalking, randomHome, ready };
})();
