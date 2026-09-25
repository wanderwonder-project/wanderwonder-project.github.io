(function () {
  const layer = document.getElementById("overview-images");
  if (!layer || !document.body.classList.contains("page-overview")) return;

  const overviewImages = window.__wwOverviewImages;
  if (!overviewImages) return;

  const {
    parseImageEntry,
    assetRoot,
    getSetForBody,
    preloadImage,
  } = overviewImages;

  const isEkaOverview = document.body.classList.contains("page-overview-eka");
  const isUmprumOverview = document.body.classList.contains("page-overview-umprum");
  const isDaiOverview = document.body.classList.contains("page-overview-dai");
  const isBaselOverview = document.body.classList.contains("page-overview-basel");
  const assetRootPath = assetRoot();

  const selectedSet = getSetForBody(document.body);
  const imageEntries = selectedSet.map(parseImageEntry);
  const images = imageEntries.map((entry) => assetRootPath + entry.src);
  const isMobileOverview = window.matchMedia("(max-width: 900px)").matches;

  function initMobileGallery() {
    const main = document.querySelector(".overview-main");
    if (!main || !images.length) return;

    layer.hidden = true;
    layer.replaceChildren();

    const gallery = document.createElement("div");
    gallery.className = "overview-mobile-gallery";
    gallery.setAttribute("role", "region");
    gallery.setAttribute("aria-label", "Photo gallery");

    const total = images.length;

    images.forEach((src, index) => {
      const figure = document.createElement("figure");
      figure.className = "overview-mobile-slide";

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      preloadImage(src).catch(() => {});

      const meta = document.createElement("div");
      meta.className = "overview-mobile-meta";

      const credit = document.createElement("figcaption");
      credit.className = "overview-mobile-credit";
      credit.textContent = imageEntries[index].credit || "";

      const count = document.createElement("span");
      count.className = "overview-mobile-count";
      count.textContent = `${index + 1}/${total}`;

      meta.appendChild(credit);
      meta.appendChild(count);
      figure.appendChild(img);
      figure.appendChild(meta);
      gallery.appendChild(figure);
    });

    main.appendChild(gallery);
  }

  if (isMobileOverview) {
    initMobileGallery();
    return;
  }

  const sizeRange = (() => {
    if (isBaselOverview) {
      return { min: 0.72, max: 1.15, baseMax: 310, baseVw: 0.28 };
    }
    if (isUmprumOverview) {
      return { min: 0.7, max: 1.05, baseMax: 290, baseVw: 0.26 };
    }
    if (isEkaOverview || isDaiOverview) {
      return { min: 0.6, max: 1.0, baseMax: 280, baseVw: 0.25 };
    }
    return { min: 0.65, max: 1.15, baseMax: 280, baseVw: 0.25 };
  })();
  const MIN_VISIBLE = 0.72;
  const MIN_DISPLAY_HEIGHT = 150;
  let topZ = 1;

  function bringToFront(img) {
    topZ += 1;
    img.style.zIndex = String(topZ);
  }

  function randomScale() {
    return sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function getScatterBounds() {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }

  function getLeftColumnZone() {
    const colLeft = document.querySelector(".page--overview .col-left");
    return colLeft ? colLeft.getBoundingClientRect() : null;
  }

  function getOtherTextZones() {
    const zones = [];
    document.querySelectorAll(".page--overview .overview-top-nav").forEach((el) => {
      zones.push(el.getBoundingClientRect());
    });
    return zones;
  }

  function overlapsLeftColumn(x, y, w, h, leftColumnZone) {
    if (!leftColumnZone) return false;
    return rectsOverlap(imageRect(x, y, w, h), leftColumnZone);
  }

  function cellOverlapsLeftColumn(cell, leftColumnZone) {
    if (!leftColumnZone) return false;
    return rectsOverlap(cell, leftColumnZone);
  }

  function getDisplayDimensions(naturalWidth, naturalHeight, fixedScale = null) {
    const isPortrait = naturalHeight > naturalWidth;
    const baseMaxW = Math.min(
      window.innerWidth * sizeRange.baseVw,
      sizeRange.baseMax
    );
    let maxW = baseMaxW * (fixedScale ?? randomScale());
    if (isPortrait) {
      maxW *= 0.65;
    }
    const fitScale = Math.min(1, maxW / naturalWidth);
    let w = Math.round(naturalWidth * fitScale);
    let h = Math.round(naturalHeight * fitScale);

    if (h < MIN_DISPLAY_HEIGHT) {
      const minScale = MIN_DISPLAY_HEIGHT / naturalHeight;
      w = Math.round(naturalWidth * minScale);
      h = Math.round(naturalHeight * minScale);
    }

    return { w, h };
  }

  function imageRect(x, y, w, h) {
    return {
      left: x - w / 2,
      top: y - h / 2,
      right: x + w / 2,
      bottom: y + h / 2,
    };
  }

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function overlapsText(x, y, w, h, textZones) {
    const rect = imageRect(x, y, w, h);
    return textZones.some((zone) => rectsOverlap(rect, zone));
  }

  function visibleRatio(x, y, w, h, bounds) {
    const rect = imageRect(x, y, w, h);
    const visibleLeft = Math.max(rect.left, bounds.left);
    const visibleTop = Math.max(rect.top, bounds.top);
    const visibleRight = Math.min(rect.right, bounds.right);
    const visibleBottom = Math.min(rect.bottom, bounds.bottom);

    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return 0;

    const visibleArea =
      (visibleRight - visibleLeft) * (visibleBottom - visibleTop);
    return visibleArea / (w * h);
  }

  function buildGridCells(bounds, count) {
    const cols = count <= 6 ? 3 : 5;
    const rows = Math.ceil(count / cols);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const cellW = width / cols;
    const cellH = height / rows;
    const cells = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        cells.push({
          left: bounds.left + col * cellW,
          top: bounds.top + row * cellH,
          right: bounds.left + (col + 1) * cellW,
          bottom: bounds.top + (row + 1) * cellH,
        });
      }
    }

    return cells;
  }

  function assignCells(cells, count, leftColumnZone) {
    const openCells = shuffle(
      cells.filter((cell) => !cellOverlapsLeftColumn(cell, leftColumnZone))
    );
    const leftCells = shuffle(
      cells.filter((cell) => cellOverlapsLeftColumn(cell, leftColumnZone))
    );
    const assignments = [];

    while (assignments.length < count) {
      const cell = openCells.pop() || leftCells.pop();
      if (!cell) break;
      assignments.push(cell);
    }

    return shuffle(assignments);
  }

  function randomPointInCell(cell, w, h) {
    const insetX = w * 0.15;
    const insetY = h * 0.15;
    const spanX = Math.max(1, cell.right - cell.left - insetX * 2);
    const spanY = Math.max(1, cell.bottom - cell.top - insetY * 2);

    return {
      x: cell.left + insetX + Math.random() * spanX,
      y: cell.top + insetY + Math.random() * spanY,
    };
  }

  function isValidPosition(x, y, w, h, leftColumnZone, otherTextZones) {
    if (overlapsLeftColumn(x, y, w, h, leftColumnZone)) return false;
    if (overlapsText(x, y, w, h, otherTextZones)) return false;
    return true;
  }

  function pickPosition(cell, w, h, bounds, leftColumnZone, otherTextZones) {
    let best = null;
    let bestScore = -1;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const { x, y } = randomPointInCell(cell, w, h);
      const visibility = visibleRatio(x, y, w, h, bounds);
      if (visibility < MIN_VISIBLE) continue;
      if (!isValidPosition(x, y, w, h, leftColumnZone, otherTextZones)) continue;

      const score = visibility + Math.random() * 0.08;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }

    if (best) return best;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const { x, y } = randomPointInCell(cell, w, h);
      const visibility = visibleRatio(x, y, w, h, bounds);
      if (visibility < 0.6) continue;
      if (!isValidPosition(x, y, w, h, leftColumnZone, otherTextZones)) continue;

      return { x, y };
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const { x, y } = randomPointInCell(cell, w, h);
      if (visibleRatio(x, y, w, h, bounds) < 0.55) continue;
      if (!isValidPosition(x, y, w, h, leftColumnZone, otherTextZones)) continue;

      return { x, y };
    }

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const { x, y } = randomPointInCell(cell, w, h);
      if (!isValidPosition(x, y, w, h, leftColumnZone, otherTextZones)) continue;

      return { x, y };
    }

    const marginX = w / 2;
    const marginY = h / 2;
    const minX = (leftColumnZone ? leftColumnZone.right : bounds.left) + marginX;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const x = minX + Math.random() * (bounds.right - marginX - minX);
      const y = bounds.top + marginY + Math.random() * (bounds.bottom - marginY * 2);
      if (!isValidPosition(x, y, w, h, leftColumnZone, otherTextZones)) continue;

      return { x, y };
    }

    const { x, y } = randomPointInCell(cell, w, h);
    return { x, y };
  }

  function placeImage(source, index, cells, assignments, bounds, leftColumnZone, otherTextZones) {
    const img = document.createElement("img");
    const { w, h } = getDisplayDimensions(
      source.naturalWidth,
      source.naturalHeight,
      imageEntries[index].scale
    );
    const cell = assignments[index] || cells[index % cells.length];
    const { x, y } = pickPosition(
      cell,
      w,
      h,
      bounds,
      leftColumnZone,
      otherTextZones
    );

    img.className = "overview-placed-img";
    img.src = images[index];
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    img.style.width = `${w}px`;
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;

    makeDraggable(img);
    layer.appendChild(img);
    requestAnimationFrame(() => img.classList.add("is-visible"));
  }

  function scatterImages() {
    if (!images.length) return;

    const bounds = getScatterBounds();
    const leftColumnZone = getLeftColumnZone();
    const otherTextZones = getOtherTextZones();
    const cells = buildGridCells(bounds, images.length);
    const assignments = assignCells(cells, images.length, leftColumnZone);

    images.forEach((src, index) => {
      preloadImage(src)
        .then((source) => {
          placeImage(
            source,
            index,
            cells,
            assignments,
            bounds,
            leftColumnZone,
            otherTextZones
          );
        })
        .catch(() => {});
    });
  }

  function makeDraggable(img) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function onMove(e) {
      if (!dragging) return;
      img.style.left = `${e.clientX - offsetX}px`;
      img.style.top = `${e.clientY - offsetY}px`;
    }

    function onEnd(e) {
      if (!dragging) return;
      dragging = false;
      img.classList.remove("is-dragging");
      document.body.classList.remove("is-dragging-image");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      try {
        img.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* pointer already released */
      }
    }

    img.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      bringToFront(img);
      img.setPointerCapture(e.pointerId);
      img.classList.add("is-dragging");
      document.body.classList.add("is-dragging-image");

      const rect = img.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      offsetX = e.clientX - cx;
      offsetY = e.clientY - cy;

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onEnd);
      document.addEventListener("pointercancel", onEnd);
    });
  }

  scatterImages();
})();
