// Ambient motion and small delights:
// - background: slow colour blobs, rising currency signs in the accent colours, and dashed flight trails;
// - window.Fun.confetti(x, y): a burst of boarding-pass confetti on a separate top layer;
// - a soft spotlight that follows the pointer over cards, and a gentle tilt on the boarding pass.
// Everything pauses when the tab is hidden and stays still when the viewer prefers reduced motion.
(function () {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const tok = (n, d) => (css.getPropertyValue(n) || d).trim();
  const COLORS = [tok('--a', '#ffb547'), tok('--c3', '#ff6b81'), tok('--b', '#3ee6b0'), tok('--c4', '#a98bff'), tok('--c5', '#5cc8ff')];
  const SIGNS = ['₹', '$', '€', '£', '¥', 'R', 'A$', 'C$', '%'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- background ----------
  const cv = document.getElementById('sky');
  const g = cv && cv.getContext && cv.getContext('2d');
  let W = 0, H = 0, glyphs = [], trails = [], blobs = [], t0 = performance.now(), clock = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    glyphs = Array.from({ length: Math.round(Math.min(22, (W * H) / 46000)) }, () => newGlyph(true));
    blobs = COLORS.map((c, i) => ({ c, x: Math.random(), y: Math.random(), r: .35 + Math.random() * .25, sx: .03 + Math.random() * .04, sy: .02 + Math.random() * .04, p: i * 1.3 }));
    trails = [];
  }
  function newGlyph(anywhere) {
    return { s: pick(SIGNS), c: pick(COLORS), x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30, v: 8 + Math.random() * 16,
      size: 13 + Math.random() * 24, a: .05 + Math.random() * .08, sway: Math.random() * 6.28, rot: (Math.random() - .5) * .6, spin: (Math.random() - .5) * .3 };
  }
  function newTrail() {
    const left = Math.random() < .5, y0 = H * (.12 + Math.random() * .65), y1 = y0 + (Math.random() - .5) * H * .35;
    return { x0: left ? -40 : W + 40, y0, x1: left ? W + 40 : -40, y1, lift: H * (.1 + Math.random() * .2), t: 0, dur: 8 + Math.random() * 7, c: pick(COLORS) };
  }
  const bez = (tr, t) => {
    const cx = (tr.x0 + tr.x1) / 2, cy = (tr.y0 + tr.y1) / 2 - tr.lift, u = 1 - t;
    return [u * u * tr.x0 + 2 * u * t * cx + t * t * tr.x1, u * u * tr.y0 + 2 * u * t * cy + t * t * tr.y1];
  };

  function sky(now) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now; clock += dt;
    g.clearRect(0, 0, W, H);
    // Colour blobs drifting slowly, mixed additively for a soft aurora.
    g.globalCompositeOperation = 'lighter';
    blobs.forEach((b) => {
      const x = (b.x + Math.sin(clock * b.sx + b.p) * .18) * W, y = (b.y + Math.cos(clock * b.sy + b.p) * .18) * H, r = b.r * Math.max(W, H);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, b.c + '1a'); grd.addColorStop(1, b.c + '00');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'source-over';
    // Rising currency signs.
    g.textAlign = 'center'; g.textBaseline = 'middle';
    glyphs.forEach((p, i) => {
      p.y -= p.v * dt; p.sway += dt * .7; p.rot += p.spin * dt;
      if (p.y < -40) glyphs[i] = newGlyph(false);
      g.save(); g.translate(p.x + Math.sin(p.sway) * 12, p.y); g.rotate(p.rot);
      g.globalAlpha = p.a; g.fillStyle = p.c; g.font = '600 ' + p.size + 'px "IBM Plex Mono", monospace';
      g.fillText(p.s, 0, 0); g.restore();
    });
    g.globalAlpha = 1;
    // Flight trails with a bright head.
    if (trails.length < 2 && Math.random() < dt * .4) trails.push(newTrail());
    trails = trails.filter((tr) => tr.t < 1.25);
    trails.forEach((tr) => {
      tr.t += dt / tr.dur;
      const head = Math.min(tr.t, 1), tail = Math.max(0, tr.t - .3);
      g.strokeStyle = tr.c; g.lineWidth = 1.6; g.setLineDash([6, 8]);
      g.globalAlpha = .55 * (tr.t > 1 ? 1 - (tr.t - 1) / .25 : 1);
      g.beginPath();
      for (let k = 0; k <= 24; k++) { const [x, y] = bez(tr, tail + (head - tail) * k / 24); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.setLineDash([]);
      if (tr.t <= 1) { const [x, y] = bez(tr, head); g.globalAlpha = 1; g.fillStyle = tr.c; g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
    });
    if (!still && !document.hidden) requestAnimationFrame(sky);
  }

  if (g) {
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !still) { t0 = performance.now(); requestAnimationFrame(sky); } });
    if (still) { trails = [newTrail(), newTrail()]; trails.forEach((t) => { t.t = .7; }); }
    requestAnimationFrame(sky);
  }

  // ---------- confetti ----------
  const fx = document.getElementById('fx');
  const fg = fx && fx.getContext && fx.getContext('2d');
  let bits = [], running = false, last = 0;
  function sizeFx() { const dpr = Math.min(window.devicePixelRatio || 1, 2); fx.width = Math.round(fx.clientWidth * dpr); fx.height = Math.round(fx.clientHeight * dpr); fg.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function burst(x, y) {
    if (!fg || still) return;
    sizeFx();
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2, v = 220 + Math.random() * 420;
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 260, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * 14,
        c: pick(COLORS), life: 1.6 + Math.random() * .9, shape: Math.random() < .2 ? 'sign' : 'rect', s: pick(SIGNS) });
    }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    fg.clearRect(0, 0, fx.clientWidth, fx.clientHeight);
    bits.forEach((b) => {
      b.vy += 700 * dt; b.vx *= .985; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.life -= dt;
      fg.save(); fg.translate(b.x, b.y); fg.rotate(b.r); fg.globalAlpha = Math.max(0, Math.min(1, b.life)); fg.fillStyle = b.c;
      if (b.shape === 'sign') { fg.font = '700 16px "IBM Plex Mono", monospace'; fg.fillText(b.s, 0, 0); } else fg.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      fg.restore();
    });
    bits = bits.filter((b) => b.life > 0 && b.y < fx.clientHeight + 40);
    if (bits.length) requestAnimationFrame(tick); else { running = false; fg.clearRect(0, 0, fx.clientWidth, fx.clientHeight); }
  }
  window.Fun = { confetti: burst };

  // ---------- pointer spotlight and tilt ----------
  if (!still) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.card, .quick');
      if (card) { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
    const pass = document.getElementById('quick');
    if (pass && matchMedia('(hover: hover)').matches) {
      pass.addEventListener('pointermove', (e) => {
        const r = pass.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        pass.style.transform = 'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg)';
      });
      pass.addEventListener('pointerleave', () => { pass.style.transform = ''; });
    }
  }
})();
