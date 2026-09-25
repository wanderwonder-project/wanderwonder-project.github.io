(function () {
  const imageSets = {
    eka: [
      "assets/EKA/EKA_ARCHIL0007.jpg",
      "assets/EKA/EKA(IG)/487770583_18059732300039683_8008377844106969067_n.jpg",
      "assets/EKA/EKA_ARCHIL1271.jpeg",
      "assets/EKA/EKA(IG)/IMG_3182.jpg",
      "assets/EKA/EKA_ARCHIL1304.jpeg",
      "assets/EKA/EKA(IG)/IMG_3183.jpg",
      "assets/EKA/EKA_ARCHIL2371.JPG",
      "assets/EKA/EKA(IG)/IMG_3184.jpg",
      "assets/EKA/EKA_ARCHIL2546.jpeg",
      "assets/EKA/EKA(IG)/IMG_3185.jpg",
      "assets/EKA/EKA_ARCHIL2585.jpeg",
      "assets/EKA/EKA_ARCHIL3330.jpeg",
    ],
    umprum: [
      "assets/UMPRUM x HEAD GENEVA/From students/IMG_2213.jpeg",
      "assets/UMPRUM x HEAD GENEVA/From students/Exhibition-3.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/Exhibition-7.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/Exhibition-12.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/Exhibition-16.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/IMG_1735.jpeg",
      "assets/UMPRUM x HEAD GENEVA/From students/IMG_1912.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/IMG_2469.jpeg",
      "assets/UMPRUM x HEAD GENEVA/From students/Workshop.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/toman-purslova-margiotta-allemand_bts_krkonose_01.jpg",
      "assets/UMPRUM x HEAD GENEVA/From students/toman-purslova-margiotta-allemand_bts_krkonose_04.JPG",
    ],
    dai: [
      "assets/DAI/zhuang/DAI_02.jpeg",
      "assets/DAI/zhuang/DAI_06.jpeg",
      "assets/DAI/zhuang/DAI_07.jpeg",
      "assets/DAI/zhuang/DAI_09.jpeg",
      "assets/DAI/zhuang/DAI_10.jpeg",
      "assets/DAI/zhuang/DAI_13.jpeg",
      "assets/DAI/zhuang/DAI_14.jpeg",
      "assets/DAI/zhuang/DAI_17.jpeg",
      "assets/DAI/zhuang/DAI_19.jpeg",
      "assets/DAI/flip_driest_performing_the_living_berlin_jpg_2400x_d17b71a1e988bd74de4bdc7bbb7d.jpg(2400x)(D465B4CEC4020DBEF67FCDA3CFD423CF).jpg",
    ],
    basel: [
      { src: "assets/Basel/Basel_01.jpg", scale: 1.0 },
      { src: "assets/Basel/Basel_02.jpg", scale: 0.88 },
      { src: "assets/Basel/Basel_03.jpeg", scale: 0.62 },
      { src: "assets/Basel/Basel_04.jpeg", scale: 0.68 },
      { src: "assets/Basel/Basel_05.jpeg", scale: 0.55 },
      { src: "assets/Basel/Basel_06.jpeg", scale: 0.95 },
      { src: "assets/Basel/Basel_07.jpeg", scale: 0.6 },
      { src: "assets/Basel/Basel_08.jpeg", scale: 0.7 },
      { src: "assets/Basel/Basel_09.jpg", scale: 0.65 },
      { src: "assets/Basel/Basel_10.jpeg", scale: 0.72 },
    ],
    rietveld: [
      "assets/Rietveld/rietveld_01.jpg",
      "assets/Rietveld/VELKO/Velko (3) 2.jpeg",
      "assets/Rietveld/rietveld_02.jpg",
      "assets/Rietveld/Habitat/Habitat_1.JPG",
      "assets/Rietveld/rietveld_03.jpg",
      "assets/Rietveld/Habitat/habitat_02.jpg",
      "assets/Rietveld/rietveld_04.jpg",
      "assets/Rietveld/rietveld_05.jpg",
      "assets/Rietveld/Habitat/Habitat_03.jpg",
      "assets/Rietveld/rietveld_07.jpg",
      "assets/Rietveld/rietveld_08.jpg",
    ],
  };

  const overviewPages = {
    "Rietveld/overview_Rietveld.html": "rietveld",
    "EKA/Overview_EKA.html": "eka",
    "Basel/overview_Basel.html": "basel",
    "UMPRUM/overview_UMPRUM.html": "umprum",
    "DAI/overview_DAI.html": "dai",
  };

  const prefetched = new Set();
  const preloadCache = new Map();

  function creditForSrc(src) {
    const path = String(src || "").replace(/\\/g, "/");
    const file = path.split("/").pop() || "";
    const lower = path.toLowerCase();

    const byFile = {
      "Basel_01.jpg": "ⓒVíctor Martin Castro",
      "Basel_02.jpg": "ⓒVíctor Martin Castro",
      "Basel_03.jpeg": "ⓒJeonghyeon Kong",
      "Basel_04.jpeg": "ⓒJeonghyeon Kong",
      "Basel_05.jpeg": "ⓒJeonghyeon Kong",
      "Basel_06.jpeg": "ⓒJeonghyeon Kong",
      "Basel_07.jpeg": "ⓒJeonghyeon Kong",
      "Basel_08.jpeg": "ⓒVíctor Martin Castro, Antonina Alekseeva",
      "Basel_09.jpg": "ⓒSohee Ryan",
      "Basel_10.jpeg": "ⓒVíctor Martin Castro",
      "rietveld_01.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_02.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_03.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_04.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_05.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_07.jpg": "ⓒGerrit Rietveld Academie students",
      "rietveld_08.jpg": "ⓒHabitat",
      "Velko (3) 2.jpeg": "ⓒVelko Kalchev",
      "Habitat_1.JPG": "ⓒHabitat",
      "habitat_02.jpg": "ⓒHabitat",
      "Habitat_03.jpg": "ⓒHabitat",
    };

    if (byFile[file]) return byFile[file];

    if (lower.includes("/habitat/") || /habitat/i.test(file)) return "ⓒHabitat";
    if (lower.includes("/velko/") || /velko/i.test(file)) return "ⓒVelko Kalchev";
    if (lower.includes("eka(ig)")) return "ⓒEKA students";
    if (/eka_archil/i.test(file) || lower.includes("archil")) return "ⓒArchil Tsereteli";
    if (lower.includes("/zhuang/") || lower.includes("/dai/")) return "ⓒZhang Leng";
    if (lower.includes("umprum") || lower.includes("head geneva")) {
      return "ⓒUMPRUM & HEAD Geneve students";
    }
    if (lower.includes("rietveld")) return "ⓒGerrit Rietveld Academie students";
    if (lower.includes("basel")) return "ⓒJeonghyeon Kong";
    return "";
  }

  function parseImageEntry(item) {
    if (typeof item === "string") {
      return { src: item, scale: null, credit: creditForSrc(item) };
    }
    return {
      src: item.src,
      scale: item.scale ?? null,
      credit: item.credit || creditForSrc(item.src),
    };
  }

  function assetRoot(pageUrl = location.href) {
    const pathname = new URL(pageUrl, location.href).pathname;
    return /\/(Basel|Rietveld|EKA|UMPRUM|DAI)\//.test(pathname) ? "../" : "";
  }

  function overviewKeyFromHref(href) {
    if (!href) return null;
    const normalized = href.replace(/^\.\//, "").replace(/^\.\.\//, "");
    for (const [page, key] of Object.entries(overviewPages)) {
      if (normalized.endsWith(page) || normalized === page) return key;
    }
    return null;
  }

  function getSetForBody(body) {
    if (body.classList.contains("page-overview-eka")) return imageSets.eka;
    if (body.classList.contains("page-overview-umprum")) return imageSets.umprum;
    if (body.classList.contains("page-overview-dai")) return imageSets.dai;
    if (body.classList.contains("page-overview-basel")) return imageSets.basel;
    return imageSets.rietveld;
  }

  function preloadImage(src) {
    if (preloadCache.has(src)) return preloadCache.get(src);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });

    preloadCache.set(src, promise);
    return promise;
  }

  function prefetchOverview(href, pageUrl = location.href) {
    const key = overviewKeyFromHref(href);
    if (!key) return;

    const root = assetRoot(pageUrl);
    const cacheKey = `${key}:${root}`;
    if (prefetched.has(cacheKey)) return;
    prefetched.add(cacheKey);

    imageSets[key].forEach((item) => {
      preloadImage(root + parseImageEntry(item).src).catch(() => {});
    });
  }

  window.__wwOverviewImages = {
    imageSets,
    parseImageEntry,
    assetRoot,
    getSetForBody,
    preloadImage,
    prefetchOverview,
  };
})();
