(function () {
  const canvas = document.getElementById("draw-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const strokes = [];
  let px = 0;
  let py = 0;
  let frame = 0;
  let hasPointer = false;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let activeTouchId = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let claimTouchDraw = false;
  let lastTouchAt = 0;

  const config = {
    jitter: 2.5,
    noiseAmp: 3.5,
    noiseOffset: 3,
    noiseSpeed: 0.1,
    alpha: 0.45,
    lineWidth: 0.9,
    fadeAfterMs: 3000,
    fadeDurationMs: 2000,
    substeps: 8,
    smoothFactor: 0.5,
    drawThresholdPx: 5,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function noise1D(x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = Math.sin((i + 1) * 127.1) * 43758.5453;
    const b = Math.sin((i + 2) * 127.1) * 43758.5453;
    const fa = a - Math.floor(a);
    const fb = b - Math.floor(b);
    return fa * (1 - u) + fb * u;
  }

  function strokeAlpha(age) {
    if (age >= config.fadeAfterMs) return 0;
    const fadeStart = config.fadeAfterMs - config.fadeDurationMs;
    if (age <= fadeStart) return config.alpha;
    const progress = (age - fadeStart) / config.fadeDurationMs;
    return config.alpha * (1 - progress);
  }

  function addStroke(x1, y1, x2, y2, t) {
    const steps = config.substeps;
    let lx = x1;
    let ly = y1;

    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const jx = (Math.random() - 0.5) * config.jitter * 0.65;
      const jy = (Math.random() - 0.5) * config.jitter * 0.08;
      const nx = x1 + (x2 - x1) * p + jx;
      const ny = y1 + (y2 - y1) * p + jy;
      strokes.push({ x1: lx, y1: ly, x2: nx, y2: ny, t });
      lx = nx;
      ly = ny;
    }
  }

  function pruneStrokes(now) {
    let i = 0;
    while (i < strokes.length) {
      if (now - strokes[i].t >= config.fadeAfterMs) strokes.splice(i, 1);
      else i += 1;
    }
  }

  function redraw() {
    const now = performance.now();
    pruneStrokes(now);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineWidth = config.lineWidth;

    for (let i = 0; i < strokes.length; i++) {
      const s = strokes[i];
      const a = strokeAlpha(now - s.t);
      if (a <= 0) continue;
      ctx.strokeStyle = `rgba(0, 0, 0, ${a})`;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }

  function beginStroke(x, y) {
    pointerX = x;
    pointerY = y;
    px = x;
    py = y;
    smoothX = x;
    smoothY = y;
    hasPointer = true;
  }

  function endStroke() {
    hasPointer = false;
    activeTouchId = null;
    claimTouchDraw = false;
  }

  function findTouch(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  function paintTouchTo(x, y) {
    if (!hasPointer) return;

    const dx = x - px;
    const dy = y - py;
    if (dx * dx + dy * dy < 0.25) return;

    frame += 1;
    const n = (Math.random() - 0.5) * config.jitter;
    const wobble =
      (noise1D(frame * config.noiseSpeed) - 0.5) * 2 * config.noiseAmp * 0.35;
    const tx = x - config.noiseOffset * 0.25 + wobble + n * 0.35;
    const ty = y + n * 0.05;

    addStroke(px, py, tx, ty, performance.now());
    px = tx;
    py = ty;
    pointerX = x;
    pointerY = y;
    redraw();
  }

  function paintMouseStep() {
    if (!hasPointer || activeTouchId !== null) return;
    if (performance.now() - lastTouchAt < 1000) return;

    smoothX += (pointerX - smoothX) * config.smoothFactor;
    smoothY += (pointerY - smoothY) * config.smoothFactor;

    const n = (Math.random() - 0.5) * config.jitter;
    const wobble =
      (noise1D(frame * config.noiseSpeed) - 0.5) * 2 * config.noiseAmp;
    const x = smoothX - config.noiseOffset + wobble + n;
    const y = smoothY + n * 0.1;
    addStroke(px, py, x, y, performance.now());
    px = x;
    py = y;
  }

  function tick() {
    frame += 1;
    if (hasPointer && activeTouchId === null) paintMouseStep();
    redraw();
    requestAnimationFrame(tick);
  }

  window.addEventListener(
    "touchstart",
    (e) => {
      if (activeTouchId !== null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      lastTouchAt = performance.now();
      activeTouchId = t.identifier;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      claimTouchDraw = false;
      beginStroke(t.clientX, t.clientY);
    },
    { passive: true, capture: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (activeTouchId === null) return;
      const t =
        findTouch(e.touches, activeTouchId) ||
        findTouch(e.changedTouches, activeTouchId);
      if (!t) return;

      lastTouchAt = performance.now();

      const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
      if (dist >= config.drawThresholdPx) claimTouchDraw = true;

      /* Don't preventDefault — allow native scroll while the trail follows the finger */
      if (claimTouchDraw) paintTouchTo(t.clientX, t.clientY);
    },
    { passive: true, capture: true }
  );

  function onTouchEnd(e) {
    if (activeTouchId === null) return;
    if (!findTouch(e.changedTouches, activeTouchId)) return;
    lastTouchAt = performance.now();
    endStroke();
  }

  window.addEventListener("touchend", onTouchEnd, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchcancel", onTouchEnd, {
    passive: true,
    capture: true,
  });

  window.addEventListener(
    "mousemove",
    (e) => {
      if (activeTouchId !== null) return;
      if (performance.now() - lastTouchAt < 1000) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!hasPointer) beginStroke(e.clientX, e.clientY);
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseleave",
    () => {
      if (activeTouchId !== null) return;
      endStroke();
    },
    { passive: true }
  );

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
