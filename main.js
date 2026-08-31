(function () {
  "use strict";

  var safe = function (fn) {
    try { fn(); } catch (err) { /* fail silent, never break the page */ }
  };

  window.__BRAND__ = { name: "Julen Calboechene" };

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // hero entrance — fired by the splash as it wipes away (see initSplash), or as
  // a fallback if the splash is absent. Idempotent.
  var heroRevealed = false;
  function revealHero() {
    if (heroRevealed) return;
    heroRevealed = true;
    var c = document.querySelector(".hero-content");
    var f = document.querySelector(".hero-figure");
    if (c) c.classList.add("in-view");
    if (f) f.classList.add("in-view");
  }

  safe(function () {
    document.getElementById("year").textContent = new Date().getFullYear();
  });

  // smooth in-page scroll with a header offset so anchors don't land under the nav
  safe(function () {
    var HEADER_OFFSET = 76;
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top: top, behavior: prefersReduced ? "auto" : "smooth" });
    });
  });

  // splash / preloader — fake progress, then wipe away. Never allowed to get stuck.
  safe(function () {
    var splash = document.getElementById("splash");
    if (!splash) return;
    var pctEl = document.getElementById("splashPct");
    var done = false;

    document.body.style.overflow = "hidden";

    var hide = function () {
      if (done) return;
      done = true;
      if (pctEl) pctEl.textContent = "100";
      splash.style.animation = "none";     // kill the CSS safety-anim so it can't flash back
      splash.classList.add("is-out");
      document.body.style.overflow = "";
      setTimeout(revealHero, 260);          // hand off: hero animates in as the wipe clears
      setTimeout(function () {
        if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      }, 1000);
    };

    // count 0 -> 100 over ~1.85s, synced with the CSS bar
    if (pctEl && !prefersReduced) {
      var start = performance.now();
      var DUR = 1850;
      var tick = function (now) {
        if (done) return;
        var p = Math.min(1, (now - start) / DUR);
        pctEl.textContent = String(Math.round(p * 100));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else if (pctEl) {
      pctEl.textContent = "100";
    }

    // fixed timing — not tied to window.load, which waits on the big hero images
    setTimeout(hide, prefersReduced ? 400 : 2400);
    setTimeout(hide, 5000); // hard safety cap
  });

  // solid header on scroll
  safe(function () {
    var header = document.getElementById("siteHeader");
    if (!header) return;
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add("solid");
      else header.classList.remove("solid");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });

  // mobile nav toggle (hamburger <-> X)
  safe(function () {
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileNav");
    if (!toggle || !menu) return;

    var close = function () {
      menu.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", function () {
      var isOpen = menu.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) close();
    });
  });

  // placeholder links (href="#") shouldn't jump the page to the top —
  // once a real URL is pasted in by hand, this stops applying automatically
  safe(function () {
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) { e.preventDefault(); });
    });
  });

  // active nav link while scrolling (scroll-spy)
  safe(function () {
    var navLinks = document.querySelectorAll("[data-nav]");
    var targets = Array.prototype.slice.call(navLinks).map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    }).filter(Boolean);

    if (!navLinks.length || !targets.length || !("IntersectionObserver" in window)) return;

    var setActive = function (id) {
      navLinks.forEach(function (link) {
        var match = link.getAttribute("href") === "#" + id;
        link.classList.toggle("active", match);
        if (match) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    targets.forEach(function (t) { spy.observe(t); });
  });

  // hero entrance: normally the splash triggers revealHero() as it wipes away.
  // If there's no splash (or it failed), reveal here instead.
  safe(function () {
    if (!document.querySelector(".hero-content")) return;
    if (prefersReduced || !document.getElementById("splash")) {
      revealHero();
      return;
    }
    setTimeout(revealHero, 6000); // safety: never leave the hero hidden
  });

  // count-up: the Community stats tick from 0 to their value when scrolled into view
  safe(function () {
    var cm = document.getElementById("cm");
    if (!cm) return;
    var nodes = cm.querySelectorAll(".case-stats strong, .post-stats strong");
    if (!nodes.length) return;

    var fmt = function (n) {
      try { return n.toLocaleString("es-AR"); } catch (e) { return String(n); }
    };

    var items = [];
    nodes.forEach(function (el) {
      var raw = el.textContent.trim();
      var m = raw.match(/^(\D*)([\d.,]+)(\D*)$/);
      if (!m) return;
      var value = parseInt(m[2].replace(/[.,]/g, ""), 10);
      if (!isFinite(value)) return;
      items.push({ el: el, prefix: m[1], suffix: m[3], value: value, raw: raw, started: false });
    });
    if (!items.length) return;

    // reduced motion / no IO support: leave the final numbers as written
    if (prefersReduced || !("IntersectionObserver" in window)) return;

    var ease = function (p) { return 1 - Math.pow(1 - p, 3); };
    var animate = function (it) {
      if (it.started) return;
      it.started = true;
      // park at 0 only now, so if this never runs the real number stays visible
      it.el.textContent = it.prefix + "0" + it.suffix;
      var DUR = 1300, t0 = 0;
      var tick = function (now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / DUR);
        it.el.textContent = it.prefix + fmt(Math.round(ease(p) * it.value)) + it.suffix;
        if (p < 1) requestAnimationFrame(tick);
        else it.el.textContent = it.raw;
      };
      requestAnimationFrame(tick);
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === entry.target) { animate(items[i]); break; }
        }
        io.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -18% 0px" });

    items.forEach(function (it) { io.observe(it.el); });
  });

  // scroll reveal for sections
  safe(function () {
    var sections = document.querySelectorAll(".section");
    if (!sections.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      sections.forEach(function (s) { s.classList.add("in-view"); });
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

    sections.forEach(function (s) { observer.observe(s); });

    // safety net: reveal everything after a timeout in case observer misfires
    setTimeout(function () {
      sections.forEach(function (s) { s.classList.add("in-view"); });
    }, 4000);
  });

  // staggered reveal for repeating groups (skills, cases, reel tiles, contact links)
  safe(function () {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".stagger-group").forEach(function (g) {
        g.classList.add("in-view");
      });
      return;
    }

    var groups = document.querySelectorAll(".stagger-group");
    if (!groups.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var children = entry.target.children;
            for (var i = 0; i < children.length; i++) {
              children[i].style.transitionDelay = (i * 70) + "ms";
            }
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    groups.forEach(function (g) { observer.observe(g); });
  });

  // reel: click a video -> abrir grande y centrado en un overlay
  safe(function () {
    var viewer = document.getElementById("videoViewer");
    var vEl = document.getElementById("videoViewerEl");
    var vClose = document.getElementById("videoViewerClose");
    if (!viewer || !vEl || !vClose) return;

    var frames = document.querySelectorAll(".reel-frame");
    if (!frames.length) return;

    var lastFocused = null;

    var open = function (src) {
      if (!src) return;
      lastFocused = document.activeElement;
      vEl.src = src;
      viewer.hidden = false;
      document.body.style.overflow = "hidden";
      var p = vEl.play();
      if (p && p.catch) p.catch(function () {});
      vClose.focus();
    };

    var close = function () {
      viewer.hidden = true;
      try { vEl.pause(); } catch (e) {}
      vEl.removeAttribute("src");
      vEl.load();
      document.body.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    frames.forEach(function (frame) {
      var v = frame.querySelector("video");
      if (!v) return;
      frame.setAttribute("role", "button");
      frame.tabIndex = 0;
      frame.setAttribute("aria-label", "Reproducir video");
      var go = function () { open(v.getAttribute("src")); };
      frame.addEventListener("click", go);
      frame.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });

    vClose.addEventListener("click", close);
    viewer.addEventListener("click", function (e) { if (e.target === viewer) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !viewer.hidden) close();
    });
  });
})();
