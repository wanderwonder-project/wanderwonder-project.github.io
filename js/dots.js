(function () {
  if (typeof window.__wwDotsCleanup === "function") {
    window.__wwDotsCleanup();
    window.__wwDotsCleanup = null;
  }

  const dots = document.querySelectorAll(".dot");
  const triggerDots = document.querySelectorAll(".dot--trigger");
  const captions = document.querySelectorAll(".dot-caption");

  const dotsState = Array.from(dots, (el) => ({
    el,
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top),
    vx: (Math.random() - 0.5) * 0.006,
    vy: (Math.random() - 0.5) * 0.006,
    phase: Math.random() * Math.PI * 2,
    paused: false,
    isHollow: el.classList.contains("dot--hollow"),
  }));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fleeRadiusPx = 110;
  const touchFleeRadiusPx = 150;
  const touchFleePush = 1.55;
  let mouseX = -10000;
  let mouseY = -10000;
  let frameId = null;
  let fleeTouchId = null;
  let prevFleeX = -10000;
  let prevFleeY = -10000;

  function setFleePoint(x, y) {
    mouseX = x;
    mouseY = y;
  }

  function clearFleePoint() {
    mouseX = -10000;
    mouseY = -10000;
    prevFleeX = -10000;
    prevFleeY = -10000;
  }

  function findTouch(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  function onMouseMove(e) {
    if (fleeTouchId !== null) return;
    setFleePoint(e.clientX, e.clientY);
  }

  function onMouseLeave() {
    if (fleeTouchId !== null) return;
    clearFleePoint();
  }

  function onTouchStart(e) {
    if (fleeTouchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    fleeTouchId = t.identifier;
    prevFleeX = t.clientX;
    prevFleeY = t.clientY;
    setFleePoint(t.clientX, t.clientY);
    applyFleeAlongSegment(t.clientX, t.clientY, t.clientX, t.clientY);
  }

  function onTouchMove(e) {
    if (fleeTouchId === null) return;
    const t =
      findTouch(e.touches, fleeTouchId) ||
      findTouch(e.changedTouches, fleeTouchId);
    if (!t) return;

    const fromX = prevFleeX;
    const fromY = prevFleeY;
    prevFleeX = t.clientX;
    prevFleeY = t.clientY;
    setFleePoint(t.clientX, t.clientY);

    /* Sparse touch samples: sweep force along the finger path like dense mousemove */
    if (fromX > -9999) {
      applyFleeAlongSegment(fromX, fromY, t.clientX, t.clientY);
    } else {
      applyFleeAlongSegment(t.clientX, t.clientY, t.clientX, t.clientY);
    }
  }

  function onTouchEnd(e) {
    if (fleeTouchId === null) return;
    if (!findTouch(e.changedTouches, fleeTouchId)) return;
    fleeTouchId = null;
    clearFleePoint();
  }

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseleave", onMouseLeave, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true });

  function applyFleeForceAt(dot, px, py, radius, pushScale) {
    const rect = dot.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - px;
    const dy = cy - py;
    const dist = Math.hypot(dx, dy);

    if (dist >= radius || dist < 1) return false;

    const urgency = 1 - dist / radius;
    const push = urgency * urgency * 0.028 * pushScale;
    dot.vx += (dx / dist) * push;
    dot.vy += (dy / dist) * push;
    return true;
  }

  function applyFleeForce(dot) {
    const touching = fleeTouchId !== null;
    return applyFleeForceAt(
      dot,
      mouseX,
      mouseY,
      touching ? touchFleeRadiusPx : fleeRadiusPx,
      touching ? touchFleePush : 1
    );
  }

  function applyFleeAlongSegment(x0, y0, x1, y1) {
    const hollows = [];
    for (let i = 0; i < dotsState.length; i++) {
      const dot = dotsState[i];
      if (!dot.isHollow || dot.paused) continue;
      const rect = dot.el.getBoundingClientRect();
      hollows.push({
        dot,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      });
    }

    const span = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(span / 8));
    const radius = touchFleeRadiusPx;
    const pushScale = touchFleePush;

    for (let s = 0; s <= steps; s++) {
      const p = s / steps;
      const px = x0 + (x1 - x0) * p;
      const py = y0 + (y1 - y0) * p;

      for (let i = 0; i < hollows.length; i++) {
        const h = hollows[i];
        const dx = h.cx - px;
        const dy = h.cy - py;
        const dist = Math.hypot(dx, dy);
        if (dist >= radius || dist < 1) continue;

        const urgency = 1 - dist / radius;
        const push = urgency * urgency * 0.028 * pushScale;
        h.dot.vx += (dx / dist) * push;
        h.dot.vy += (dy / dist) * push;
      }
    }
  }

  function rectsOverlap(a, b) {
    return !(
      a.right <= b.left ||
      a.left >= b.right ||
      a.bottom <= b.top ||
      a.top >= b.bottom
    );
  }

  function getPreviewRect(trigger) {
    const preview = trigger.querySelector(".dot-preview");
    const dotRect = trigger.getBoundingClientRect();
    const cx = dotRect.left + dotRect.width / 2;
    const cy = dotRect.top + dotRect.height / 2;

    const previewMaxW = 250;
    let w = previewMaxW;
    let h = previewMaxW;

    if (preview) {
      if (preview.offsetWidth) w = preview.offsetWidth;
      if (preview.offsetHeight) h = preview.offsetHeight;
      else if (preview.naturalWidth && preview.naturalHeight) {
        w = previewMaxW;
        h = (previewMaxW / preview.naturalWidth) * preview.naturalHeight;
      }
    }

    const pad = 28;
    return {
      left: cx - w / 2 - pad,
      top: cy - h / 2 - pad,
      right: cx + w / 2 + pad,
      bottom: cy + h / 2 + pad,
    };
  }

  function placeCaptionAvoidingPreview(caption, trigger) {
    const margin = 20;
    const previewRect = getPreviewRect(trigger);

    caption.style.top = "0px";
    caption.style.left = "0px";
    const captionW = caption.offsetWidth;
    const captionH = caption.offsetHeight;

    const maxLeft = window.innerWidth - captionW - margin;
    const maxTop = window.innerHeight - captionH - margin;

    for (let i = 0; i < 48; i++) {
      const left = margin + Math.random() * Math.max(0, maxLeft - margin);
      const top = margin + Math.random() * Math.max(0, maxTop - margin);
      const captionRect = {
        left,
        top,
        right: left + captionW,
        bottom: top + captionH,
      };

      if (!rectsOverlap(previewRect, captionRect)) {
        caption.style.left = `${left}px`;
        caption.style.top = `${top}px`;
        return;
      }
    }

    const dotRect = trigger.getBoundingClientRect();
    const dotCx = dotRect.left + dotRect.width / 2;
    const fallbackLeft =
      dotCx < window.innerWidth / 2 ? maxLeft : margin;
    const fallbackTop = margin + Math.random() * Math.max(0, maxTop - margin);

    caption.style.left = `${fallbackLeft}px`;
    caption.style.top = `${fallbackTop}px`;
  }

  function hideAllCaptions() {
    captions.forEach((caption) => {
      caption.hidden = true;
    });
  }

  /* Phones/tablets: no hover — tap to reveal, tap photo to navigate */
  const canHover = !window.matchMedia("(hover: none)").matches;
  const triggerBindings = [];

  function closeAllTriggers() {
    triggerBindings.forEach(({ trigger, state, caption }) => {
      trigger.classList.remove("is-open");
      state.paused = false;
      caption.hidden = true;
    });
  }

  function openTrigger(binding) {
    const { trigger, state, caption } = binding;
    closeAllTriggers();
    trigger.classList.add("is-open");
    state.paused = true;
    caption.hidden = false;

    requestAnimationFrame(() => {
      placeCaptionAvoidingPreview(caption, trigger);
    });
  }

  triggerDots.forEach((trigger) => {
    const state = dotsState.find((dot) => dot.el === trigger);
    const index = trigger.dataset.caption;
    const caption = captions[index];
    if (!state || !caption) return;

    const binding = { trigger, state, caption };
    triggerBindings.push(binding);

    if (canHover) {
      trigger.addEventListener("mouseenter", () => {
        state.paused = true;
        hideAllCaptions();
        caption.hidden = false;

        requestAnimationFrame(() => {
          placeCaptionAvoidingPreview(caption, trigger);
        });
      });

      trigger.addEventListener("mouseleave", () => {
        state.paused = false;
        caption.hidden = true;
      });
      return;
    }

    trigger.addEventListener("click", (event) => {
      if (!trigger.classList.contains("is-open")) {
        event.preventDefault();
        event.stopPropagation();
        openTrigger(binding);
        return;
      }

      /* Second tap must hit the preview image to navigate */
      if (!event.target.closest(".dot-preview")) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });

  function onDocumentClick(event) {
    if (canHover) return;
    if (event.target.closest(".dot--trigger")) return;
    closeAllTriggers();
  }

  if (!canHover) {
    document.addEventListener("click", onDocumentClick);
  }

  const maxSpeed = 0.012;
  const hollowFleeSpeed = 0.13;
  const touchHollowFleeSpeed = 0.22;
  const dotRadiusPx = 6;
  const dotGapPx = 2;
  const collisionRestitution = 0.9;
  const canvas = document.querySelector(".page-home .canvas, .page-about .canvas");

  function getCanvasSize() {
    if (!canvas) {
      return { width: window.innerWidth, height: window.innerHeight };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      width: rect.width || window.innerWidth,
      height: rect.height || window.innerHeight,
    };
  }

  function dotCenterPx(dot, width, height) {
    return {
      x: (dot.x / 100) * width,
      y: (dot.y / 100) * height,
    };
  }

  function setDotCenterPx(dot, px, py, width, height) {
    dot.x = (px / width) * 100;
    dot.y = (py / height) * 100;
  }

  function reflectVelocity(vx, vy, nx, ny, restitution) {
    const dotNormal = vx * nx + vy * ny;
    if (dotNormal > 0) return { vx, vy };

    return {
      vx: vx - (1 + restitution) * dotNormal * nx,
      vy: vy - (1 + restitution) * dotNormal * ny,
    };
  }

  function resolveDotCollisions(width, height) {
    const minSep = dotRadiusPx * 2 + dotGapPx;

    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < dotsState.length; i += 1) {
        for (let j = i + 1; j < dotsState.length; j += 1) {
          const a = dotsState[i];
          const b = dotsState[j];
          if (a.paused && b.paused) continue;

          const aCenter = dotCenterPx(a, width, height);
          const bCenter = dotCenterPx(b, width, height);
          let dx = bCenter.x - aCenter.x;
          let dy = bCenter.y - aCenter.y;
          let dist = Math.hypot(dx, dy);

          if (dist === 0) {
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dist = 1;
          }

          if (dist >= minSep) continue;

          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minSep - dist;

          if (a.paused) {
            bCenter.x += nx * overlap;
            bCenter.y += ny * overlap;
            const reflected = reflectVelocity(b.vx, b.vy, nx, ny, collisionRestitution);
            b.vx = reflected.vx;
            b.vy = reflected.vy;
            setDotCenterPx(b, bCenter.x, bCenter.y, width, height);
            continue;
          }

          if (b.paused) {
            aCenter.x -= nx * overlap;
            aCenter.y -= ny * overlap;
            const reflected = reflectVelocity(a.vx, a.vy, -nx, -ny, collisionRestitution);
            a.vx = reflected.vx;
            a.vy = reflected.vy;
            setDotCenterPx(a, aCenter.x, aCenter.y, width, height);
            continue;
          }

          aCenter.x -= nx * overlap * 0.5;
          aCenter.y -= ny * overlap * 0.5;
          bCenter.x += nx * overlap * 0.5;
          bCenter.y += ny * overlap * 0.5;

          const dvx = b.vx - a.vx;
          const dvy = b.vy - a.vy;
          const velAlongNormal = dvx * nx + dvy * ny;

          if (velAlongNormal < 0) {
            const impulse = (-(1 + collisionRestitution) * velAlongNormal) / 2;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }

          setDotCenterPx(a, aCenter.x, aCenter.y, width, height);
          setDotCenterPx(b, bCenter.x, bCenter.y, width, height);
        }
      }
    }
  }

  window.__wwDotsCleanup = function () {
    if (frameId) cancelAnimationFrame(frameId);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("touchstart", onTouchStart, true);
    window.removeEventListener("touchmove", onTouchMove, true);
    window.removeEventListener("touchend", onTouchEnd, true);
    window.removeEventListener("touchcancel", onTouchEnd, true);
    document.removeEventListener("click", onDocumentClick);
    closeAllTriggers();
  };

  if (reduceMotion) return;

  function tick() {
    const { width, height } = getCanvasSize();

    for (const dot of dotsState) {
      if (dot.paused) continue;

      let fleeing = false;

      if (dot.isHollow) {
        fleeing = applyFleeForce(dot);
      }

      if (!fleeing) {
        dot.phase += 0.004 + Math.random() * 0.002;
        dot.vx += Math.sin(dot.phase) * 0.00008;
        dot.vy += Math.cos(dot.phase * 1.3) * 0.00008;
      }

      const speedCap =
        dot.isHollow && fleeing
          ? fleeTouchId !== null
            ? touchHollowFleeSpeed
            : hollowFleeSpeed
          : maxSpeed;
      const speed = Math.hypot(dot.vx, dot.vy);
      if (speed > speedCap) {
        dot.vx = (dot.vx / speed) * speedCap;
        dot.vy = (dot.vy / speed) * speedCap;
      }

      if (dot.isHollow && fleeing) {
        dot.vx *= 0.985;
        dot.vy *= 0.985;
      }

      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dot.x < 1 || dot.x > 99) dot.vx *= -1;
      if (dot.y < 1 || dot.y > 99) dot.vy *= -1;

      dot.x = Math.max(1, Math.min(99, dot.x));
      dot.y = Math.max(1, Math.min(99, dot.y));
    }

    resolveDotCollisions(width, height);

    for (const dot of dotsState) {
      dot.x = Math.max(1, Math.min(99, dot.x));
      dot.y = Math.max(1, Math.min(99, dot.y));

      dot.el.style.left = dot.x + "%";
      dot.el.style.top = dot.y + "%";
    }

    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
})();
