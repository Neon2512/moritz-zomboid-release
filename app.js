(() => {
  'use strict';

  const releaseAt = new Date('2026-08-28T19:00:00+02:00').getTime();
  const countdown = document.getElementById('countdown');
  const timeNodes = Object.fromEntries(
    [...document.querySelectorAll('[data-time]')].map((node) => [node.dataset.time, node]),
  );

  const updateCountdown = () => {
    const distance = releaseAt - Date.now();
    if (distance <= 0) {
      if (countdown) {
        countdown.outerHTML = '<p class="countdown-live">DER SERVER IST LIVE — ÜBERLEBE, WENN DU KANNST.</p>';
      }
      return;
    }
    const values = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance / 3600000) % 24),
      minutes: Math.floor((distance / 60000) % 60),
      seconds: Math.floor((distance / 1000) % 60),
    };
    for (const [name, value] of Object.entries(values)) {
      if (timeNodes[name]) timeNodes[name].textContent = String(value).padStart(2, '0');
    }
  };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  const player = document.getElementById('music-player');
  const audio = document.getElementById('background-music');
  const toggle = document.getElementById('music-toggle');
  const icon = document.getElementById('music-icon');
  const status = document.getElementById('music-status');
  if (audio && toggle && player && icon && status) {
    audio.volume = .55;
    const syncAudioState = () => {
      const playing = !audio.paused;
      player.classList.toggle('is-playing', playing);
      toggle.setAttribute('aria-pressed', String(playing));
      icon.textContent = playing ? 'Ⅱ' : '▶';
      if (playing) status.textContent = 'NOW PLAYING';
    };
    const attemptPlay = async () => {
      try {
        await audio.play();
        player.classList.remove('needs-gesture');
        syncAudioState();
      } catch {
        player.classList.add('needs-gesture');
        status.textContent = 'KLICK FÜR TON';
      }
    };
    const startOnInteraction = (event) => {
      if (event.target instanceof Element && event.target.closest('.music-player')) return;
      attemptPlay();
    };
    toggle.addEventListener('click', async () => {
      if (!audio.paused) audio.pause();
      else await attemptPlay();
      syncAudioState();
    });
    audio.addEventListener('play', syncAudioState);
    audio.addEventListener('pause', syncAudioState);
    audio.addEventListener('error', () => { status.textContent = 'SIGNAL GESTÖRT'; });
    for (const name of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
      window.addEventListener(name, startOnInteraction, { passive: true });
    }
    attemptPlay();
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('rain-canvas');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !context) return;
  const trailCanvas = document.createElement('canvas');
  const trail = trailCanvas.getContext('2d', { alpha: true });
  if (!trail) return;

  const TAU = Math.PI * 2;
  const TRAIL_LIFETIME_SECONDS = 3;
  const TRAIL_OPACITY_AT_END = 0.004;
  let width = innerWidth;
  let height = innerHeight;
  let ratio = 1;
  let seed = 90210;
  let streaks = [];
  let drops = [];
  let previousTime = performance.now();
  let frame = 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const makeStreak = (above = false) => {
    const depth = .12 + random() * .88;
    return {
      x: random() * (width + 220) - 110,
      y: above ? -30 - random() * height * .45 : random() * height,
      length: 16 + depth * 94,
      speed: 610 + depth * 920,
      alpha: .035 + depth * .24,
      width: .32 + depth * 1.02,
      wind: 118 + depth * 142,
      depth,
    };
  };

  const makeDrop = (above = false, moving = false) => {
    const radius = 1.05 + Math.pow(random(), 2.45) * 8.6;
    const naturalMotion = radius > 5.2 || random() > .78;
    const y = above ? -24 - random() * height * .25 : 8 + random() * Math.max(1, height - 16);
    const x = 12 + random() * Math.max(1, width - 24);
    return {
      x, y, radius,
      vx: 0,
      vy: moving ? 8 + radius * 2.4 : 0,
      terminal: 22 + radius * 18,
      adhesion: moving || naturalMotion ? random() * 2.2 : 7 + random() * 36,
      age: random() * 20,
      phase: random() * TAU,
      rate: .35 + random() * .85,
      oldX: x,
      oldY: y,
      trailDistance: 0,
    };
  };

  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    trailCanvas.width = canvas.width;
    trailCanvas.height = canvas.height;
    trail.setTransform(ratio, 0, 0, ratio, 0, 0);
    trail.lineCap = trail.lineJoin = 'round';
    streaks = Array.from({ length: Math.min(210, Math.max(96, Math.round(width / 7.5))) }, () => makeStreak());
    drops = Array.from({ length: Math.min(72, Math.max(38, Math.round(width / 25))) }, () => makeDrop());
  };

  const paintTrail = (drop) => {
    const distance = Math.hypot(drop.x - drop.oldX, drop.y - drop.oldY);
    drop.trailDistance += distance;
    if (distance < .12 || drop.trailDistance < Math.max(1.5, drop.radius * .28)) return;
    const trackWidth = Math.max(.55, drop.radius * .42);
    trail.save();
    trail.strokeStyle = `rgba(1,5,5,${Math.min(.24, .07 + drop.radius * .015)})`;
    trail.lineWidth = trackWidth * 1.8;
    trail.beginPath();
    trail.moveTo(drop.oldX, drop.oldY);
    trail.quadraticCurveTo((drop.oldX + drop.x) * .5 - drop.vx * .015, (drop.oldY + drop.y) * .5, drop.x, drop.y);
    trail.stroke();
    trail.strokeStyle = `rgba(221,238,232,${Math.min(.17, .045 + drop.radius * .012)})`;
    trail.lineWidth = Math.max(.4, trackWidth * .38);
    trail.stroke();
    trail.restore();
    drop.oldX = drop.x;
    drop.oldY = drop.y;
    drop.trailDistance = 0;
  };

  const drawDrop = (drop) => {
    const speedRatio = Math.min(1, drop.vy / Math.max(1, drop.terminal));
    const stretch = 1 + speedRatio * .72 + Math.max(0, drop.radius - 5) * .035;
    const w = drop.radius * (1 - speedRatio * .08);
    const h = drop.radius * stretch;
    context.save();
    context.translate(drop.x, drop.y);
    context.rotate(Math.max(-.1, Math.min(.1, drop.vx * .0035)));
    const shape = new Path2D();
    shape.moveTo(0, -h);
    shape.bezierCurveTo(-w * .48, -h * .78, -w * 1.02, -h * .18, -w * .91, h * .3);
    shape.bezierCurveTo(-w * .74, h * .79, -w * .32, h, 0, h);
    shape.bezierCurveTo(w * .48, h * .96, w * .92, h * .65, w * .96, h * .18);
    shape.bezierCurveTo(w, -h * .26, w * .43, -h * .82, 0, -h);
    shape.closePath();
    context.shadowColor = 'rgba(0,0,0,.42)';
    context.shadowBlur = 1.5 + drop.radius * .34;
    context.shadowOffsetX = 1.1;
    context.shadowOffsetY = 1.8;
    const lens = context.createRadialGradient(-w * .24, -h * .34, Math.max(.1, drop.radius * .08), w * .08, h * .08, Math.max(1, w * 1.22));
    lens.addColorStop(0, 'rgba(255,255,255,.72)');
    lens.addColorStop(.12, 'rgba(224,239,235,.25)');
    lens.addColorStop(.46, 'rgba(111,141,137,.045)');
    lens.addColorStop(.72, 'rgba(211,230,224,.14)');
    lens.addColorStop(.9, 'rgba(17,28,28,.22)');
    lens.addColorStop(1, 'rgba(0,4,5,.48)');
    context.fillStyle = lens;
    context.fill(shape);
    context.shadowColor = 'transparent';
    context.strokeStyle = 'rgba(226,241,236,.34)';
    context.lineWidth = Math.max(.45, drop.radius * .075);
    context.stroke(shape);
    context.strokeStyle = 'rgba(255,255,255,.62)';
    context.lineWidth = Math.max(.42, drop.radius * .095);
    context.beginPath();
    context.moveTo(-w * .48, -h * .35);
    context.quadraticCurveTo(-w * .68, 0, -w * .46, h * .28);
    context.stroke();
    context.fillStyle = 'rgba(245,252,249,.66)';
    context.beginPath();
    context.ellipse(-w * .25, -h * .48, Math.max(.32, w * .13), Math.max(.48, h * .2), -.42, 0, TAU);
    context.fill();
    context.restore();
  };

  const updateDrop = (drop, dt) => {
    drop.age += dt;
    const pinned = drop.adhesion > 0;
    if (pinned) {
      drop.adhesion -= dt;
      drop.vy *= Math.exp(-dt * 8);
      drop.vx *= Math.exp(-dt * 7);
      if (drop.radius > 4.4) drop.y += (drop.radius - 4.4) * .19 * dt;
    } else {
      drop.vy = Math.min(drop.terminal, drop.vy + (27 + Math.max(0, drop.radius - 1.6) * 24) * dt);
      const meander = Math.sin(drop.age * drop.rate + drop.phase) * (1.15 + drop.radius * .17) + Math.sin(drop.age * .23 + drop.phase * 1.7) * .75;
      drop.vx += (meander - drop.vx) * Math.min(1, dt * 1.8);
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      if (drop.vy > 14 && random() < dt * Math.max(0, .17 - drop.radius * .012)) {
        drop.adhesion = .12 + random() * .72;
        drop.vy *= .16 + random() * .18;
      }
    }
    if (!pinned || drop.radius > 4.4) paintTrail(drop);
    if (drop.y - drop.radius > height + 36 || drop.x < -32 || drop.x > width + 32) Object.assign(drop, makeDrop(true, random() > .28));
  };

  const mergeDrops = () => {
    for (let i = 0; i < drops.length; i++) {
      const first = drops[i];
      if (first.adhesion > 0 && first.radius < 3.2) continue;
      for (let j = i + 1; j < drops.length; j++) {
        const second = drops[j];
        const contact = (first.radius + second.radius) * .7;
        if (Math.abs(first.x - second.x) > contact || Math.abs(first.y - second.y) > contact * 1.45) continue;
        const a = first.radius ** 2;
        const b = second.radius ** 2;
        first.x = (first.x * a + second.x * b) / (a + b);
        first.y = (first.y * a + second.y * b) / (a + b);
        first.radius = Math.min(13.5, Math.sqrt(a + b) * .96);
        first.terminal = 22 + first.radius * 18;
        first.vy = Math.max(first.vy, second.vy, 12 + first.radius * 2.1);
        first.adhesion = 0;
        first.oldX = first.x;
        first.oldY = first.y;
        Object.assign(second, makeDrop(true));
      }
    }
  };

  const drawStreak = (streak, dt) => {
    streak.y += streak.speed * dt;
    streak.x += streak.wind * dt;
    if (streak.y - streak.length > height || streak.x > width + 150) Object.assign(streak, makeStreak(true));
    const tailX = streak.x - streak.wind * .055;
    const tailY = streak.y - streak.length;
    const gradient = context.createLinearGradient(tailX, tailY, streak.x, streak.y);
    gradient.addColorStop(0, 'rgba(187,207,207,0)');
    gradient.addColorStop(.62, `rgba(193,216,215,${streak.alpha * .48})`);
    gradient.addColorStop(1, `rgba(231,242,239,${streak.alpha})`);
    context.strokeStyle = gradient;
    context.lineWidth = streak.width;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(streak.x, streak.y);
    context.stroke();
  };

  const animate = (time) => {
    frame = requestAnimationFrame(animate);
    if (time - previousTime < 20) return;
    const dt = Math.min(.042, (time - previousTime) / 1000 || .022);
    previousTime = time;
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    trail.save();
    trail.globalCompositeOperation = 'destination-out';
    const trailFade = 1 - Math.pow(TRAIL_OPACITY_AT_END, dt / TRAIL_LIFETIME_SECONDS);
    trail.fillStyle = `rgba(0,0,0,${trailFade})`;
    trail.fillRect(0, 0, width, height);
    trail.restore();
    for (const streak of streaks) drawStreak(streak, dt);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(trailCanvas, 0, 0);
    context.restore();
    for (const drop of drops) updateDrop(drop, dt);
    mergeDrops();
    for (const drop of drops) drawDrop(drop);
  };

  resize();
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { previousTime = performance.now(); });
  frame = requestAnimationFrame(animate);
})();
