(function () {
  if (typeof window.__wwScrollFadeCleanup === "function") {
    window.__wwScrollFadeCleanup();
    window.__wwScrollFadeCleanup = null;
  }

  const threshold = 16;
  const scrollEls = [];

  function updateWindowScroll() {
    const scrolled = window.scrollY > threshold || document.documentElement.scrollTop > threshold;
    document.body.classList.toggle("ww-scrolled", scrolled);
  }

  document.querySelectorAll(".col-center-scroll").forEach((el) => {
    function update() {
      el.classList.toggle("is-scrolled", el.scrollTop > threshold);
    }

    el.addEventListener("scroll", update, { passive: true });
    scrollEls.push({ el, update });
    update();
  });

  window.addEventListener("scroll", updateWindowScroll, { passive: true });
  updateWindowScroll();

  window.__wwScrollFadeCleanup = function () {
    window.removeEventListener("scroll", updateWindowScroll);
    scrollEls.forEach(({ el, update }) => {
      el.removeEventListener("scroll", update);
      el.classList.remove("is-scrolled");
    });
    document.body.classList.remove("ww-scrolled");
  };
})();
