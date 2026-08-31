(function () {
  "use strict";

  var safe = function (fn) {
    try { fn(); } catch (err) { console.error(err); }
  };

  var foldersContainer = document.getElementById("galleryFolders");
  var emptyState = document.getElementById("galleryEmpty");
  var lightbox = document.getElementById("lightbox");
  var lightboxTitle = document.getElementById("lightboxTitle");
  var lightboxGrid = document.getElementById("lightboxGrid");
  var lightboxClose = document.getElementById("lightboxClose");
  var viewer = document.getElementById("imageViewer");
  var viewerImg = document.getElementById("imageViewerImg");
  var viewerClose = document.getElementById("imageViewerClose");

  if (!foldersContainer) return;

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastFocused = null;

  // ---------- full-size image viewer (click/enter a photo inside a folder) ----------
  function openViewer(src, alt) {
    lastFocused = document.activeElement;
    viewerImg.src = src;
    viewerImg.alt = alt || "";
    viewer.hidden = false;
    viewerClose.focus();
  }
  function closeViewer() {
    viewer.hidden = true;
    viewerImg.src = "";
    if (lastFocused) lastFocused.focus();
  }

  safe(function () {
    if (viewerClose) viewerClose.addEventListener("click", closeViewer);
    if (viewer) {
      viewer.addEventListener("click", function (e) {
        if (e.target === viewer) closeViewer();
      });
    }
  });

  // ---------- folder lightbox (click/enter a folder cover) ----------
  function openLightbox(folder, triggerEl) {
    lastFocused = triggerEl || document.activeElement;
    lightboxTitle.textContent = folder.name;
    lightboxGrid.innerHTML = "";

    var imgs = folder.images || [];
    // same row-first fix as the folder grid: build columns, hand out round-robin
    var n = window.innerWidth <= 720 ? 2 : 3;
    if (imgs.length && imgs.length < n) n = imgs.length;
    var cols = [];
    for (var c = 0; c < n; c++) {
      var col = document.createElement("div");
      col.className = "lightbox-col";
      cols.push(col);
      lightboxGrid.appendChild(col);
    }

    imgs.forEach(function (img, i) {
      var el = document.createElement("img");
      el.src = img.file;
      el.loading = "lazy";
      el.alt = img.name || folder.name;
      el.onerror = function () { el.remove(); }; // no dejar el ícono de imagen rota
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", "Ver " + (img.name || folder.name) + " en grande");
      var open = function () { openViewer(img.file, img.name || folder.name); };
      el.addEventListener("click", open);
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      cols[i % n].appendChild(el);
    });
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  safe(function () {
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (viewer && !viewer.hidden) { closeViewer(); return; }
      if (lightbox && !lightbox.hidden) closeLightbox();
    });
  });

  // ---------- folder grid (masonry, row-first order) ----------
  // CSS multi-column fills each column top-to-bottom, so 1,2,3 read downward.
  // Instead we build N column elements and hand out cards round-robin
  // (1->col1, 2->col2, 3->col3, 4->col1 ...) so the order reads left-to-right.
  function columnCount() {
    var w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 860) return 2;
    return 3;
  }

  function createCard(folder) {
    var card = document.createElement("div");
    card.className = "folder-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Ver proyecto " + folder.name);

    var cover = document.createElement("div");
    cover.className = "folder-cover";

    if (folder.cover) {
      var img = document.createElement("img");
      img.src = folder.cover;
      img.alt = folder.name;
      img.loading = "lazy";
      cover.appendChild(img);
    } else {
      var empty = document.createElement("div");
      empty.className = "folder-cover-empty";
      empty.textContent = "Sin portada";
      cover.appendChild(empty);
    }

    var meta = document.createElement("div");
    meta.className = "folder-meta";
    var name = document.createElement("span");
    name.className = "folder-name";
    name.textContent = folder.name;
    var count = document.createElement("span");
    count.className = "folder-count";
    var n = (folder.images || []).length;
    count.textContent = n + (n === 1 ? " imagen" : " imágenes");
    meta.appendChild(name);
    meta.appendChild(count);

    cover.appendChild(meta);
    card.appendChild(cover);

    var open = function () { openLightbox(folder, card); };
    card.addEventListener("click", open);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    return card;
  }

  var gridFolders = [];
  var gridCols = 0;

  function layoutGrid(animate) {
    var n = columnCount();
    if (n === gridCols && foldersContainer.children.length) return; // same breakpoint, nothing to do
    gridCols = n;
    foldersContainer.innerHTML = "";

    if (!gridFolders.length) {
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    var cols = [];
    for (var c = 0; c < n; c++) {
      var col = document.createElement("div");
      col.className = "gallery-col";
      cols.push(col);
      foldersContainer.appendChild(col);
    }

    var cards = [];
    gridFolders.forEach(function (folder, i) {
      var card = createCard(folder);
      if (animate && !prefersReduced) card.style.transitionDelay = ((i % n) * 60) + "ms";
      cols[i % n].appendChild(card);
      cards.push(card);
    });

    if (!animate || prefersReduced || !("IntersectionObserver" in window)) {
      cards.forEach(function (c) { c.classList.add("in-view"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    cards.forEach(function (c) { observer.observe(c); });
    setTimeout(function () {
      cards.forEach(function (c) { c.classList.add("in-view"); });
    }, 4000);
  }

  function renderFolders(folders) {
    gridFolders = folders || [];
    gridCols = 0;
    layoutGrid(true);
  }

  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { layoutGrid(false); }, 200);
  });

  safe(function () {
    fetch("data/gallery.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("no gallery.json");
        return res.json();
      })
      .then(function (data) {
        renderFolders(data.folders || []);
      })
      .catch(function () {
        if (emptyState) emptyState.hidden = false;
      });
  });
})();
