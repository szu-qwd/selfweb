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

    // ===== Idle behaviours =====
    // While idling, every 10-20s pick one idle action with equal odds from
    // manifest.idleActs (sleep/crawl/dance/amuse/yawn). Sleep may self-wake ~15s.
    const IDLE_MIN = 10000, IDLE_MAX = 20000; // ms between idle behaviours
    const SLEEP_WAKE_AFTER = 15000;           // ms before sleep may self-wake
    const SLEEP_WAKE_CHANCE = 0.5;            // probability of self-waking each check
    const LOOP_ACT_DURATION = 5000;           // looping idle actions (e.g. dance) last ~5s
    const WALK_DURATION = 2500;               // each leg of a stroll (out, then back)
    let idleTimer = null, sleepTimer = null, actTimer = null;

    function scheduleIdle() {
      clearIdle();
      const wait = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
      idleTimer = setTimeout(doIdleAction, wait);
    }
    function doIdleAction() {
      const acts = (manifest.idleActs || []).filter(hasState);
      const pool = acts.slice();
      if (hasState('walk_left') && hasState('walk_right')) pool.push('__walk__');
      if (!pool.length) { scheduleIdle(); return; }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick === '__walk__') { doWalk(); return; }
      player.play(pick);
      // looping actions other than sleep need a timer to return to idle
      if (pick !== 'sleep' && manifest[pick].loop) {
        actTimer = setTimeout(function () {
          if (player.state === pick) player.play('idle');
        }, LOOP_ACT_DURATION);
      }
    }
    // Take a short stroll: walk out in one direction, then turn around and walk
    // back, with the facing always matching the movement direction. Direction is
    // chosen toward whichever side has more room, so the pet won't walk into an edge.
    function doWalk() {
      const r = el.getBoundingClientRect();
      const margin = 16;
      const roomLeft = r.left - margin;
      const roomRight = window.innerWidth - r.right - margin;
      const dir = roomRight >= roomLeft ? 1 : -1; // head toward the roomier side
      const room = Math.max(0, dir > 0 ? roomRight : roomLeft);
      const dist = Math.min(80 + Math.random() * 80, room); // 80-160px, capped by room
      if (dist < 20) { player.play('idle'); return; }       // no space -> skip stroll
      const faceOut = dir < 0 ? 'walk_left' : 'walk_right';
      const faceBack = dir < 0 ? 'walk_right' : 'walk_left';
      player.play(faceOut);                                  // walk out
      el.style.transition = 'transform ' + WALK_DURATION + 'ms linear';
      el.style.transform = 'translateX(' + (dir * dist) + 'px)';
      actTimer = setTimeout(function () {
        if (!isWalking()) return;            // interrupted (clicked/dragged)
        player.play(faceBack);               // turn around to face the way back
        el.style.transform = 'translateX(0)';
        actTimer = setTimeout(function () {
          el.style.transition = '';
          if (isWalking()) player.play('idle');
        }, WALK_DURATION);
      }, WALK_DURATION);
    }
    function armSleepWake() {
      if (sleepTimer) clearTimeout(sleepTimer);
      sleepTimer = setTimeout(function check() {
        if (player.state !== 'sleep') return;        // already woken by user
        if (Math.random() < SLEEP_WAKE_CHANCE) player.play('idle');
        else sleepTimer = setTimeout(check, SLEEP_WAKE_AFTER); // try again later
      }, SLEEP_WAKE_AFTER);
    }
    function clearIdle() {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null; }
      if (actTimer) { clearTimeout(actTimer); actTimer = null; }
    }
    function hasState(s) { return manifest[s] && manifest[s].frames.length > 0; }

    const player = window.PetEngine.createPlayer(manifest, render, null, null, function (state) {
      // onState: arm idle scheduling only while idling; arm self-wake while sleeping
      if (state === 'idle') scheduleIdle();
      else { clearIdle(); if (state === 'sleep') armSleepWake(); }
    });
    window.__pet = player;

    // ===== Speech bubble =====
    const LINES = [
      '今天吃啥?',
      '什么时候下班',
      '我要去摸鱼了',
      '求求你给我个班上吧',
      '你好!',
      '好好学习,天天向上!',
      '我无法只是~普通朋友~~',
      '再摸要秃了!',
      '好吗?好的!',
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
      // random line, avoiding an immediate repeat of the previous one
      let i = Math.floor(Math.random() * LINES.length);
      if (LINES.length > 1 && i === lineIdx) i = (i + 1) % LINES.length;
      lineIdx = i;
      return LINES[i];
    }

    // a "resting" state can be woken by a click (sleep + idle actions + strolling)
    function isWalking() { return player.state === 'walk_left' || player.state === 'walk_right'; }
    function isResting() {
      return player.state === 'sleep' || isWalking() ||
        (manifest.idleActs || []).indexOf(player.state) >= 0;
    }
    // cancel an in-progress stroll: drop transform without animating it back
    function stopWalk() {
      if (actTimer) { clearTimeout(actTimer); actTimer = null; }
      el.style.transition = '';
      el.style.transform = '';
    }

    preload('idle');
    player.play('startup'); // play once -> auto idle

    // ===== Interaction: hover=touch, click=pinch/wake, drag=raise =====
    let dragging = false, moved = false, wokeOnDown = false, sx = 0, sy = 0, ox = 0, oy = 0;
    let lastPinch = 0; // timestamp of last pinch, for click throttle
    const TH = 4; // px threshold to tell drag from click

    el.addEventListener('pointerenter', function () {
      // hovering must not disturb a resting pet; only react when idle
      if (!dragging && player.state === 'idle') player.play('touch');
    });
    el.addEventListener('pointerleave', function () {
      if (!dragging && player.state === 'touch') player.play('idle');
    });

    el.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      wokeOnDown = isResting();        // remember if this press is a wake-up
      if (isWalking()) stopWalk();     // stop a stroll, snap back to rest position
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); // pos after any transform cleared
      ox = r.left; oy = r.top;
      el.setPointerCapture(e.pointerId);
      if (!wokeOnDown) player.play('raise'); // don't flash raise when waking
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
      if (moved) { player.play('idle'); return; }   // was a drag -> rest
      if (wokeOnDown) { player.play('idle'); return; } // click woke it -> just idle
      const now = Date.now();                          // throttle rapid clicks
      if (now - lastPinch < 400) return;
      lastPinch = now;
      player.play('pinch'); say(pickLine());          // normal click -> pinch + talk
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
