// VPet web player — minimal frame engine
// Pure scheduler (testable, no DOM) + thin DOM renderer.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PetEngine = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // Drives frame advance for one manifest. `render(state, idx)` is called per frame.
  // `schedule`/`cancel` default to setTimeout but are injectable for tests.
  // `onState(state)` (optional) fires whenever a state starts, including the
  // automatic return to 'idle' after a non-looping animation finishes.
  function createPlayer(manifest, render, schedule, cancel, onState) {
    schedule = schedule || setTimeout;
    cancel = cancel || clearTimeout;
    let cur = null, idx = 0, timer = null;

    function step() {
      const def = manifest[cur];
      render(cur, idx);
      const dur = def.frames[idx][1];
      timer = schedule(function () {
        idx++;
        if (idx >= def.frames.length) {
          if (def.loop) idx = 0;
          else { play('idle'); return; }
        }
        step();
      }, dur);
    }

    function play(state) {
      if (timer) cancel(timer);
      cur = state;
      idx = 0;
      if (onState) onState(state);
      step();
    }

    function stop() { if (timer) { cancel(timer); timer = null; } }

    return { play: play, stop: stop, get state() { return cur; }, get index() { return idx; } };
  }

  return { createPlayer: createPlayer };
});

// ===== Browser bootstrap (skipped under Node/CommonJS) =====
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  (async function () {
    const BASE = 'pet/';
    const manifest = await fetch(BASE + 'manifest.json').then((r) => r.json());
    const el = document.getElementById('pet');
    if (!el) return;
    const img = el.querySelector('img');

    // lazy per-state Image preload; idle preloaded first for instant boot
    const cache = {};
    function preload(state) {
      if (cache[state]) return cache[state];
      cache[state] = manifest[state].frames.map(function (f) {
        const im = new Image();
        im.src = BASE + state + '/' + encodeURIComponent(f[0]);
        return im;
      });
      return cache[state];
    }

    function render(state, idx) {
      img.src = preload(state)[idx].src;
    }

    // ===== Idle behaviours: auto-sleep + random small actions =====
    const SLEEP_AFTER = 15000;            // ms of idle before dozing off
    const ACT_MIN = 18000, ACT_MAX = 36000; // random small-action interval
    let idleTimer = null, actTimer = null;

    // states that count as "resting idle" and may schedule idle behaviours
    function scheduleIdle() {
      clearIdle();
      idleTimer = setTimeout(function () { player.play('sleep'); }, SLEEP_AFTER);
      actTimer = setTimeout(function () {
        const acts = manifest.idleActs || [];
        if (acts.length) player.play(acts[Math.floor(Math.random() * acts.length)]);
      }, ACT_MIN + Math.random() * (ACT_MAX - ACT_MIN));
    }
    function clearIdle() {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      if (actTimer) { clearTimeout(actTimer); actTimer = null; }
    }

    const player = window.PetEngine.createPlayer(manifest, render, null, null, function (state) {
      // onState: arm idle behaviours only while truly idling
      if (state === 'idle') scheduleIdle();
      else clearIdle();
    });
    window.__pet = player;

    // ===== Speech bubble =====
    const LINES = [
      '你好呀~ 我是这个网站的小助手',
      '往上翻翻,看看我的研究课题吧 🔬',
      '想了解论文?都在「论文与发表」那一栏',
      '对水下视觉、目标检测感兴趣吗?',
      '想合作的话,点页面底部联系我哦 ✉️',
      '摸摸我没关系,我不怕痒~',
      '把我拖到喜欢的位置吧!',
    ];
    let bubble = null, bubbleTimer = null;
    function say(text) {
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'pet-bubble';
        el.appendChild(bubble);
      }
      bubble.textContent = text;
      bubble.classList.add('show');
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 3500);
    }
    let lineIdx = 0;
    function pickLine() {
      // first click greets, then cycle through guidance lines
      const t = LINES[lineIdx % LINES.length];
      lineIdx++;
      return t;
    }

    // wake from any non-interactive resting state back to idle
    function wake() {
      if (player.state === 'sleep' || (manifest.idleActs || []).indexOf(player.state) >= 0) {
        player.play('idle');
      }
    }

    preload('idle');
    player.play('startup'); // play once -> auto idle

    // ===== Interaction: hover=touch, click=pinch, drag=raise =====
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const TH = 4; // px threshold to tell drag from click

    el.addEventListener('pointerenter', function () {
      wake();
      if (!dragging && player.state === 'idle') player.play('touch');
    });
    el.addEventListener('pointerleave', function () {
      if (!dragging && player.state === 'touch') player.play('idle');
    });

    el.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      el.setPointerCapture(e.pointerId);
      player.play('raise');
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > TH) moved = true;
      if (moved) {
        el.style.left = ox + dx + 'px';
        el.style.top = oy + dy + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      }
    });
    el.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (moved) player.play('idle');       // was a drag -> rest
      else { player.play('pinch'); say(pickLine()); } // was a click -> pinch + talk
    });

    // ===== Perf guard: pause when off-screen or tab hidden =====
    let visible = true, onScreen = true;
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      if (!visible) player.stop();
      else player.play(player.state || 'idle');
    });
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (!onScreen) player.stop();
      else if (visible) player.play(player.state || 'idle');
    }).observe(el);
  })();
}
