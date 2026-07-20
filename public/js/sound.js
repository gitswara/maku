// ========================================================================
// Maku — optional, extremely subtle sound design (synthesized, no assets).
// One persistent preference; off by default; never autoplays music.
// ========================================================================
window.Sound = (function () {
  let on = localStorage.getItem('maku-sound') === 'on';
  let ctx = null;
  let noiseBuf = null;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise() {
    const c = ac(); if (!c) return null;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function tone(freq, dur, { type = 'sine', vol = 0.05, when = 0, glideTo = null } = {}) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function paper(dur = 0.13, vol = 0.045, freq = 1600) {
    const c = ac(); const buf = noise(); if (!c || !buf) return;
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.7;
    const g = c.createGain();
    const t0 = c.currentTime;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const LIB = {
    tap()     { tone(230, 0.05, { type: 'triangle', vol: 0.04 }); },
    flip()    { paper(0.16, 0.05, 1400); },
    place()   { paper(0.12, 0.045, 900); tone(170, 0.09, { type: 'sine', vol: 0.03 }); },
    pop()     { tone(520, 0.08, { type: 'sine', vol: 0.045, glideTo: 820 }); },
    chime()   { tone(660, 0.12, { vol: 0.045 }); tone(990, 0.16, { vol: 0.04, when: 0.09 }); },
    connect() { tone(523, 0.14, { vol: 0.045 }); tone(659, 0.18, { vol: 0.045, when: 0.12 }); },
    // gentle two-cycle ringtone (~1.8s) while the call is ringing
    ring() {
      const cyc = t => { tone(680, 0.2, { vol: 0.05, when: t }); tone(900, 0.24, { vol: 0.045, when: t + 0.18 }); };
      cyc(0); cyc(0.95);
    }
  };

  function play(name) { if (!on) return; try { (LIB[name] || (() => {}))(); } catch {} }
  function isOn() { return on; }

  // ---- ambient background music (toggled with sound) ----
  let music = null;
  function ensureMusic() {
    if (!music) {
      music = new Audio('assets/music/background_track.mp3');
      music.loop = true;
      music.volume = 0.14;
    }
    return music;
  }
  function startMusic() { try { const m = ensureMusic(); m.play().catch(() => {}); } catch {} }
  function stopMusic() { if (music) { try { music.pause(); } catch {} } }

  function setOn(v) {
    on = !!v;
    localStorage.setItem('maku-sound', on ? 'on' : 'off');
    if (on) { ac(); startMusic(); } else { stopMusic(); }
    render();
  }
  function toggle() { setOn(!on); if (on) play('pop'); }

  function render() {
    const btn = document.getElementById('sound-toggle');
    const label = document.getElementById('sound-label');
    if (!btn) return;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (label) label.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.addEventListener('click', toggle);
    // if sound was left on, start music on the first user gesture (autoplay policy)
    if (on) {
      const kick = () => { ac(); startMusic(); window.removeEventListener('pointerdown', kick); };
      window.addEventListener('pointerdown', kick, { once: true });
    }
  });

  return { play, isOn, setOn, toggle };
})();
