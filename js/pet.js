// VPet web player — minimal frame engine
// Pure scheduler (testable, no DOM) + thin DOM renderer.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PetEngine = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // Drives frame advance for one manifest. `render(state, idx)` is called per frame.
  // `schedule`/`cancel` default to setTimeout but are injectable for tests.
  function createPlayer(manifest, render, schedule, cancel) {
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

    const player = window.PetEngine.createPlayer(manifest, render);
    window.__pet = player;

    preload('idle');
    player.play('startup'); // play once -> auto idle

    // ===== Interaction: hover=touch, drag=raise, default bottom-right =====
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const TH = 4; // px threshold to tell drag from click

    el.addEventListener('pointerenter', function () {
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
      player.play('idle');
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
