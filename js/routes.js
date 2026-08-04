(function () {
  const STORAGE_KEY = "ww-routes-backdrop";

  const ROUTE_OVERVIEWS = [
    "Rietveld/overview_Rietveld.html",
    "EKA/Overview_EKA.html",
    "Basel/overview_Basel.html",
    "UMPRUM/overview_UMPRUM.html",
    "DAI/overview_DAI.html",
  ];

  const SCHOOL_TO_INDEX = {
    Rietveld: 0,
    EKA: 1,
    Basel: 2,
    UMPRUM: 3,
    DAI: 4,
  };

  const PROJECT_ROOTS = [
    "wanderwonder-project.github.io",
    "wanderwonder18.06",
    "260625_wanderwonder",
    "wanderwonder",
  ];

  function currentPage() {
    const parts = location.pathname.split("/").filter(Boolean);
    let start = 0;

    for (const root of PROJECT_ROOTS) {
      const rootIndex = parts.lastIndexOf(root);
      if (rootIndex >= 0) {
        start = rootIndex + 1;
        break;
      }
    }

    return parts.slice(start).join("/") || "index.html";
  }

  function isRoutesPage(page) {
    return page === "routes.html" || page.endsWith("/routes.html");
  }

  function jsPrefix() {
    const key = currentPage();
    const depth = key.includes("/") ? key.split("/").length - 1 : 0;
    return depth ? "../".repeat(depth) : "";
  }

  function routeIndexForPage(page) {
    const parts = page.split("/");
    for (let i = 0; i < parts.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(SCHOOL_TO_INDEX, parts[i])) {
        return SCHOOL_TO_INDEX[parts[i]];
      }
    }
    return -1;
  }

  function isOverviewPage(page) {
    if (!page.includes("/")) return false;
    const file = page.split("/").pop() || "";
    return (
      routeIndexForPage(page) >= 0 &&
      (file.startsWith("overview_") || file.startsWith("Overview_"))
    );
  }

  function ensureArrowLink(el, href, label) {
    let link = el;
    if (el.tagName !== "A") {
      link = document.createElement("a");
      link.className = el.className;
      link.textContent = el.textContent;
      el.replaceWith(link);
    }
    link.href = href;
    link.classList.add("nav-arrow");
    link.removeAttribute("aria-hidden");
    if (label) link.setAttribute("aria-label", label);
    return link;
  }

  window.__wwInitPageArrows = function initPageArrows() {
    const page = currentPage();
    if (!isOverviewPage(page)) return;

    const idx = routeIndexForPage(page);
    const prefix = jsPrefix();
    const left = document.querySelector(".page-arrows__left");
    const right = document.querySelector(".page-arrows__right");
    if (!left && !right) return;

    const prevHref = `${prefix}${
      ROUTE_OVERVIEWS[(idx - 1 + ROUTE_OVERVIEWS.length) % ROUTE_OVERVIEWS.length]
    }`;
    const nextHref = `${prefix}${
      ROUTE_OVERVIEWS[(idx + 1) % ROUTE_OVERVIEWS.length]
    }`;

    if (left) {
      ensureArrowLink(left, prevHref, "Previous route");
    }
    if (right) {
      ensureArrowLink(right, nextHref, "Next route");
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href*="routes.html"]');
    if (!link || isRoutesPage(currentPage())) return;
    sessionStorage.setItem(STORAGE_KEY, currentPage());
  });

  window.__wwInitRoutesBackdrop = function initRoutesBackdrop() {
    const iframe = document.getElementById("routes-backdrop");
    if (!iframe) return;

    let src = sessionStorage.getItem(STORAGE_KEY);
    if (src && isRoutesPage(src)) src = null;

    if (!src && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === location.origin) {
          const refParts = ref.pathname.split("/").filter(Boolean);
          const rootIndex = refParts.findIndex((part) =>
            PROJECT_ROOTS.includes(part)
          );
          const rel =
            rootIndex >= 0 ? refParts.slice(rootIndex + 1) : refParts;
          const refPage = rel.join("/") || "index.html";
          if (!isRoutesPage(refPage)) src = refPage;
        }
      } catch (_) {}
    }

    const prefix = (() => {
      const key = currentPage();
      const depth = key.includes("/") ? key.split("/").length - 1 : 0;
      return depth ? "../".repeat(depth) : "";
    })();

    iframe.src = src ? `${prefix}${src}` : `${prefix}index.html`;
  };

  window.__wwInitRoutesBackdrop();
  window.__wwInitPageArrows();

  function syncRouteIntroWidth(intro) {
    intro.style.width = "";

    const range = document.createRange();
    range.selectNodeContents(intro);

    for (let pass = 0; pass < 4; pass += 1) {
      const rects = range.getClientRects();
      if (!rects.length) return;

      let maxWidth = 0;
      for (let i = 0; i < rects.length; i += 1) {
        maxWidth = Math.max(maxWidth, rects[i].width);
      }

      const nextWidth = `${Math.ceil(maxWidth)}px`;
      if (intro.style.width === nextWidth) return;
      intro.style.width = nextWidth;
    }
  }

  window.__wwSyncRouteIntroWidths = function syncRouteIntroWidths() {
    requestAnimationFrame(() => {
      document.querySelectorAll(".route-intro").forEach(syncRouteIntroWidth);
    });
  };

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(window.__wwSyncRouteIntroWidths, 100);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(window.__wwSyncRouteIntroWidths);
  } else {
    window.__wwSyncRouteIntroWidths();
  }
})();
