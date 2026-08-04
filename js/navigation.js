(function () {
  if (window.__wwNavigationBootstrapped) return;
  window.__wwNavigationBootstrapped = true;

  let navigating = false;

  const PROJECT_ROOTS = [
    "wanderwonder-project.github.io",
    "wanderwonder18.06",
    "260625_wanderwonder",
    "wanderwonder",
  ];

  function pageKey(url) {
    const u = new URL(url, location.href);
    const parts = u.pathname.split("/").filter(Boolean);
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

  function jsPrefix(url) {
    const key = pageKey(url);
    const depth = key.includes("/") ? key.split("/").length - 1 : 0;
    return depth ? "../".repeat(depth) : "";
  }

  function siteRoot(pageUrl = location.href) {
    const u = new URL(pageUrl, location.href);
    const parts = u.pathname.split("/").filter(Boolean);

    for (const root of PROJECT_ROOTS) {
      const rootIndex = parts.lastIndexOf(root);
      if (rootIndex >= 0) {
        return `${u.origin}/${parts.slice(0, rootIndex + 1).join("/")}/`;
      }
    }

    return `${u.origin}/`;
  }

  function homeUrl(pageUrl = location.href) {
    return new URL("index.html", siteRoot(pageUrl)).href;
  }

  function syncLogoHref(pageUrl = location.href) {
    document.querySelectorAll(".page .col-left-header .logo").forEach((logo) => {
      logo.setAttribute("href", homeUrl(pageUrl));
    });
  }

  function isSamePage(a, b) {
    return pageKey(a) === pageKey(b);
  }

  function preloadSiteFont() {
    if (document.querySelector("link[data-ww-font-preload]")) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/ttf";
    link.crossOrigin = "anonymous";
    link.href = new URL(
      `${jsPrefix(location.href)}assets/Arial Narrow.ttf`,
      location.href
    ).href;
    link.dataset.wwFontPreload = "true";
    document.head.appendChild(link);
  }

  preloadSiteFont();

  function isInternal(url) {
    try {
      const target = new URL(url, location.href);
      return (
        target.origin === location.origin &&
        !target.pathname.match(/\.(pdf|zip|docx)$/i)
      );
    } catch (_) {
      return false;
    }
  }

  function shouldNavigate(link) {
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      return false;
    }
    return isInternal(href);
  }

  function isRoutesHref(href) {
    return Boolean(href && href.includes("routes.html"));
  }

  function storeRoutesBackdrop() {
    if (!document.body.classList.contains("page-routes")) {
      sessionStorage.setItem("ww-routes-backdrop", pageKey(location.href));
    }
  }

  function cleanupPage() {
    if (typeof window.__wwDotsCleanup === "function") {
      window.__wwDotsCleanup();
      window.__wwDotsCleanup = null;
    }
    document
      .querySelectorAll('script[data-ww-page="true"]')
      .forEach((node) => node.remove());
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}${src.includes("?") ? "&" : "?"}ww=${Date.now()}`;
      script.dataset.wwPage = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function pageScripts(body, pageUrl) {
    const prefix = `${jsPrefix(pageUrl)}js/`;
    const scripts = [];

    if (body.classList.contains("page-home") || body.classList.contains("page-about")) {
      scripts.push(`${prefix}dots.js`);
    }
    if (body.classList.contains("page-overview")) {
      scripts.push(`${prefix}overview-images.js`);
      scripts.push(`${prefix}overview-click.js`);
    }
    if (body.querySelector(".gallery-scroll")) {
      scripts.push(`${prefix}gallery.js`);
    }
    if (body.querySelector(".col-center-scroll")) {
      scripts.push(`${prefix}scroll-fade.js`);
    }

    return scripts.map((path) => new URL(path, pageUrl).href);
  }

  async function initPage(doc, pageUrl) {
    if (typeof window.__wwInitRoutesBackdrop === "function") {
      window.__wwInitRoutesBackdrop();
    }
    if (typeof window.__wwInitPageArrows === "function") {
      window.__wwInitPageArrows();
    }
    if (typeof window.__wwSyncRouteIntroWidths === "function") {
      window.__wwSyncRouteIntroWidths();
    }

    for (const src of pageScripts(doc.body, pageUrl)) {
      try {
        await loadScript(src);
      } catch (_) {
        /* keep navigation usable if one page script fails */
      }
    }

    syncLogoHref(pageUrl);
  }

  function isPersistentNode(node, canvas) {
    if (node === canvas) return true;
    if (node.tagName !== "SCRIPT") return false;

    const src = node.getAttribute("src") || "";
    return (
      src.includes("cursor-draw.js") ||
      src.includes("navigation.js") ||
      src.includes("routes.js")
    );
  }

  async function swapPage(doc, pageUrl, push) {
    cleanupPage();

    document.title = doc.title;
    document.body.className = doc.body.className;

    const canvas = document.getElementById("draw-canvas");
    [...document.body.children].forEach((node) => {
      if (isPersistentNode(node, canvas)) return;
      node.remove();
    });

    [...doc.body.children].forEach((node) => {
      if (node.tagName === "SCRIPT" || node.id === "draw-canvas") return;
      document.body.appendChild(document.importNode(node, true));
    });

    if (push) {
      history.pushState({ wwUrl: pageUrl }, "", pageUrl);
    }

    syncLogoHref(pageUrl);
    await initPage(doc, pageUrl);
  }

  async function navigateTo(href, push = true) {
    if (navigating) return;

    const url = new URL(href, location.href).href;
    if (isSamePage(url, location.href)) return;

    navigating = true;

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Navigation fetch failed");

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      await swapPage(doc, url, push);
    } catch (_) {
      location.href = href;
    } finally {
      navigating = false;
    }
  }

  function prefetchOverviewFromTarget(target) {
    const link = target.closest("a[href], .dot--trigger[data-href]");
    if (!link || !window.__wwOverviewImages) return;

    const href = link.dataset.href || link.getAttribute("href");
    if (!href || !/overview_|Overview_/i.test(href)) return;

    window.__wwOverviewImages.prefetchOverview(href);
  }

  document.addEventListener("mouseover", (event) => {
    prefetchOverviewFromTarget(event.target);
  }, { passive: true });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const dot = event.target.closest(".dot--trigger[data-href]");
    if (dot) {
      event.preventDefault();
      prefetchOverviewFromTarget(dot);
      navigateTo(dot.dataset.href);
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) return;

    // Let the browser handle the homepage logo natively.
    if (link.classList.contains("logo")) return;

    if (!shouldNavigate(link)) return;

    event.preventDefault();
    const href = link.getAttribute("href");
    if (isRoutesHref(href)) storeRoutesBackdrop();
    if (/overview_|Overview_/i.test(href || "")) prefetchOverviewFromTarget(link);
    navigateTo(href);
  });

  window.addEventListener("popstate", (event) => {
    if (event.state?.wwUrl) {
      navigateTo(event.state.wwUrl, false);
    }
  });

  history.replaceState({ wwUrl: location.href }, "", location.href);
  syncLogoHref();
})();
