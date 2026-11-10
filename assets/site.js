// Atlased, getatlased.com. Small, dependency-free scroll animations.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---- Reveal on scroll (content is visible without JavaScript) ----
  const reveals = $$(".rv");
  const showVisible = () => reveals.forEach(el => {
    if (!el.classList.contains("in") && el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add("in");
  });
  if (reduce) reveals.forEach(el => el.classList.add("in"));
  else setTimeout(() => reveals.forEach(el => el.classList.add("in")), 6000);

  // ---- Hero slideshow ----
  const slides = $$(".slide"), chip = $("#placeChip");
  if (slides.length) {
    let i = 0;
    const show = n => {
      slides.forEach((s, k) => s.classList.toggle("on", k === n));
      if (chip) {
        chip.style.opacity = 0;
        setTimeout(() => {
          chip.querySelector("img").src = `assets/flags/${slides[n].dataset.flag}.svg`;
          chip.querySelector("span").textContent = slides[n].dataset.place;
          chip.style.opacity = 1;
        }, 350);
      }
    };
    show(0);
    if (!reduce) setInterval(() => { i = (i + 1) % slides.length; show(i); }, 6000);
  }

  // ---- Postcards: duplicate each lane once for a seamless loop ----
  $$(".lane").forEach(lane => [...lane.children].forEach(c => lane.appendChild(c.cloneNode(true))));
  // Two things could leave a row empty on a phone. The photos were lazy, and a browser only
  // loads a lazy photo once it is nearly on screen, which a card sliding in sideways reaches too
  // late. And each row is one very wide layer that a CSS animation moved without the page ever
  // being drawn again, so Safari could skip painting the part that slid into view. So every
  // photo loads as the section gets close, and the rows are moved here, a frame at a time, only
  // while they are on screen. Without JavaScript the CSS animation still runs.
  const postcards = $(".postcards");
  if (postcards) {
    const loadCards = () => $$(".lane img.photo", postcards).forEach(im => { im.loading = "eager"; });
    const rows = $$(".lane", postcards).map(el => ({ el, rev: el.classList.contains("rev"), dur: el.classList.contains("rev") ? 95000 : 80000, period: 0 }));
    // One loop is exactly the distance from a card to its copy.
    const measure = () => rows.forEach(r => { const c = r.el.children; r.period = c.length > 1 ? c[c.length / 2].offsetLeft - c[0].offsetLeft : 0; });
    let t = 0, last = 0, raf = 0, onScreen = false;
    const tick = now => {
      raf = 0;
      if (!onScreen || document.hidden) return;
      t += Math.min(now - last, 100); last = now;
      rows.forEach(r => { const k = (t / r.dur) % 1; r.el.style.transform = `translate3d(${(-(r.rev ? 1 - k : k) * r.period).toFixed(2)}px,0,0)`; });
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && onScreen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    if ("IntersectionObserver" in window) {
      const near = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { loadCards(); near.disconnect(); } }, { rootMargin: "250% 0px" });
      near.observe(postcards);
      if (!reduce) {
        document.documentElement.classList.add("lanes-js");
        measure();
        rows.forEach(r => { r.el.style.transform = `translate3d(${r.rev ? -r.period : 0}px,0,0)`; });
        new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); start(); }, { rootMargin: "120px 0px" }).observe(postcards);
        document.addEventListener("visibilitychange", start);
        addEventListener("resize", measure);
      }
    } else loadCards();
  }

  // ---- Map: the app's own projection, so dots land exactly on the picture ----
  const svg = $("#journeys");
  const steps = [];
  if (svg) {
    const project = (lat, lon) => {
      const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180, p2 = phi * phi, p4 = p2 * p2;
      return {
        x: lambda * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
        y: phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
      };
    };
    const top = project(84, 0).y, bottom = project(-57, 0).y, half = project(0, 180).x;
    const point = (lat, lon) => { const v = project(lat, lon); return [(v.x + half) / (2 * half) * 1000, (top - v.y) / (top - bottom) * 480]; };
    // An example journal from a home in New York: every trip goes out and back.
    const home = [40.71, -74.0];
    const journeys = [
      [[19.43, -99.13], [17.07, -96.72], [21.16, -86.85]],
      [[38.72, -9.14], [41.15, -8.61], [40.42, -3.70], [41.39, 2.17]],
      [[48.86, 2.35], [52.37, 4.90], [52.52, 13.40], [50.08, 14.44], [48.21, 16.37]],
      [[41.90, 12.50], [43.77, 11.25], [45.44, 12.32], [37.98, 23.73], [36.39, 25.46]],
      [[41.01, 28.98], [38.64, 34.83], [25.20, 55.27]],
      [[64.15, -21.94]],
      [[-33.92, 18.42], [-26.20, 28.05]],
      [[35.68, 139.69], [35.01, 135.77], [34.69, 135.50]],
      [[37.57, 126.98], [35.18, 129.08]],
      [[22.32, 114.17], [25.03, 121.56], [13.76, 100.50]],
      [[1.35, 103.82], [-8.51, 115.26]],
      [[-33.87, 151.21], [-45.03, 168.66], [-36.85, 174.76]],
      [[-12.05, -77.04], [-13.53, -71.97]],
      [[-34.60, -58.38], [-22.91, -43.17]],
      [[31.63, -7.99], [33.57, -7.59]],
      [[49.28, -123.12], [51.18, -115.57]],
      [[37.77, -122.42], [34.05, -118.24]],
      [[30.04, 31.24], [30.33, 35.44]]
    ];
    const NS = "http://www.w3.org/2000/svg";
    const H = point(...home);
    const arc = ([x1, y1], [x2, y2], out) => {
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const lift = Math.min(len * (out ? 0.32 : 0.25), out ? 110 : 40);
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - (len ? lift : 0);
      return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    };
    const add = (d, cls) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("class", cls); svg.appendChild(p); steps.push({ kind: "route", el: p, d });
    };
    journeys.forEach(trip => {
      const pts = trip.map(([a, b]) => point(a, b));
      add(arc(H, pts[0], true), "route home-route");
      for (let k = 1; k < pts.length; k++) add(arc(pts[k - 1], pts[k], false), "route");
      if (pts.length > 1) add(arc(pts[pts.length - 1], H, true), "route home-route back");
      pts.forEach(([x, y]) => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 3.4); c.setAttribute("class", "city");
        svg.appendChild(c); steps.push({ kind: "city", el: c });
      });
    });
    // Home: a bright dot with a slow pulse.
    const pulse = document.createElementNS(NS, "circle");
    pulse.setAttribute("cx", H[0]); pulse.setAttribute("cy", H[1]); pulse.setAttribute("r", 6); pulse.setAttribute("class", "home-pulse");
    const homeDot = document.createElementNS(NS, "circle");
    homeDot.setAttribute("cx", H[0]); homeDot.setAttribute("cy", H[1]); homeDot.setAttribute("r", 5.2); homeDot.setAttribute("class", "home-dot");
    svg.appendChild(pulse); svg.appendChild(homeDot);
    // Small lights travelling along the routes from home, once the map has drawn.
    svg.addComets = () => steps.filter(s => s.kind === "route" && s.el.classList.contains("home-route")).forEach((s, k) => {
      if (k % 2) return;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", 2.2); c.setAttribute("class", "comet");
      const m = document.createElementNS(NS, "animateMotion");
      m.setAttribute("dur", `${3.5 + (k % 5) * 0.7}s`); m.setAttribute("repeatCount", "indefinite"); m.setAttribute("begin", `${(k % 7) * 0.45}s`);
      m.setAttribute("path", s.d);
      c.appendChild(m); svg.appendChild(c);
    });
  }
  const counters = $$("[data-count]");
  let mapPlayed = false;
  const playMap = () => {
    if (mapPlayed || !svg) return; mapPlayed = true;
    if (reduce) return;
    steps.forEach((s, k) => {
      const delay = k * 45;
      if (s.kind === "route") {
        const L = s.el.getTotalLength();
        s.el.style.strokeDasharray = L;
        s.el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 750, delay, easing: "cubic-bezier(.3,.7,.2,1)", fill: "both" });
      } else {
        s.el.animate([{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.7)", opacity: 1, offset: .6 }, { transform: "scale(1)", opacity: 1 }],
                     { duration: 560, delay, easing: "ease-out", fill: "both" });
      }
    });
    setTimeout(() => svg.addComets && svg.addComets(), steps.length * 45 + 600);
  };
  // The numbers count up when the stats row itself comes into view.
  const statsRow = counters.length ? counters[0].closest(".stats") : null;
  let countersPlayed = false;
  const playCounters = () => {
    if (countersPlayed) return; countersPlayed = true;
    counters.forEach((n, k) => {
      const to = Number(n.dataset.count), t0 = performance.now() + k * 120;
      const tick = now => { const t = clamp((now - t0) / 2200), e = 1 - Math.pow(1 - t, 3); n.textContent = Math.round(to * e).toLocaleString(); if (t < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  };
  if (!reduce) {
    counters.forEach(n => n.textContent = "0");
    steps.forEach(s => s.el.style.opacity = "0");
    // Each element appears through its own animation, which takes over from opacity 0.
    steps.forEach(s => s.el.style.opacity = "");
    steps.forEach(s => { if (s.kind === "route") { const L = s.el.getTotalLength(); s.el.style.strokeDasharray = L; s.el.style.strokeDashoffset = L; } else s.el.style.transform = "scale(0)"; });
  }

  // ---- Scroll-driven pieces ----
  const nav = $(".nav"), heroPhone = $("#heroPhone"), heroBadge = $("#get");
  const storySteps = $$(".story-steps .step"), storyShots = $$(".story-phone .sv"), bar = $("#storyBar"), story = $(".story");
  const storyTints = $$(".story-phone .tint"), storyFloats = $$(".story-phone .floats");
  // ---- Clips in the frames: load when close, play only while on screen ----
  const storyVids = $$(".story-phone video.sv"), duoVid = $("#duoVid");
  const playVid = v => { if (reduce) return; if (v.preload !== "auto") v.preload = "auto"; const p = v.play(); if (p) p.catch(() => {}); };
  if (!reduce && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting && v.dataset.active !== "0" && v !== duoVid) playVid(v); else if (!e.isIntersecting) v.pause();
    }), { rootMargin: "300px 0px" });
    $$("video.vid").forEach(v => { if (v.classList.contains("sv")) v.dataset.active = v.classList.contains("on") ? "1" : "0"; seen.observe(v); });
  }
  // Phones show every step at once, so each step's panel gets a copy of its cards.
  $$(".mstage").forEach(m => {
    const f = $(`.story-phone .floats[data-step="${m.dataset.step}"]`);
    if (f) { const copy = f.cloneNode(true); copy.classList.add("on"); m.appendChild(copy); }
  });
  const duoSec = $("#duo"), duoLeft = $("#duoLeft"), duoBody = $("#duoBody"), duoHinge = $("#duoHinge"), duoLabel = $("#duoLabel");
  const duoStage = duoSec ? $(".stage", duoSec) : null;
  const duoWrap = duoSec ? $(".duo-wrap", duoSec) : null, phoneDuo = matchMedia("(max-width: 760px)");
  // Safari's toolbar changes innerHeight while scrolling; only a width change (rotation) updates this.
  let steadyVh = innerHeight, steadyW = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== steadyW) { steadyW = innerWidth; steadyVh = innerHeight; measureHero(); } });
  // Where the browser can tie an animation to scrolling itself (Safari 26, Chrome), it moves
  // the Duo and the Year wrap card in step with the finger; doing it here lags a frame behind
  // on iPhone and shakes. Older browsers get the same motion from this script.
  const nativeScroll = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
  if (nativeScroll) document.documentElement.classList.add("scroll-native");
  const wrapSec = $(".wrapsec"), tilt = $("#tilt"), finalBg = $("#finalBg");
  // ---- Screens that scroll with the page ----
  // Each .reel-img is one tall capture of the app. It moves up inside its frame, under the app's
  // own pinned header and tab bar, by --reel-to (a share of its own height) from first to last.
  const storyPhone = $(".story-phone");
  const reels = $$(".reel-img").map(el => {
    const sv = el.closest(".story-phone .sv");
    return { el, to: parseFloat(getComputedStyle(el).getPropertyValue("--reel-to")) || 0, hero: !!el.closest(".hero-phone"), stage: el.closest(".mstage"), step: sv ? Number(sv.dataset.step) : -1 };
  });
  // The hero's list runs from the top of the page until its phone has left the screen.
  let heroEnd = 1200;
  const measureHero = () => {
    if (!heroPhone) return;
    let top = 0;
    for (let n = heroPhone; n; n = n.offsetParent) top += n.offsetTop;
    heroEnd = Math.max(600, top + heroPhone.offsetHeight);
    document.documentElement.style.setProperty("--hero-end", `${Math.round(heroEnd)}px`);
  };
  measureHero();
  addEventListener("load", measureHero);
  let current = -1;

  const frame = () => {
    const y = scrollY, vh = innerHeight;
    nav && nav.classList.toggle("solid", y > 40);
    // A page with no badge of its own (privacy, support, credits) shows the pill from the start.
    nav && nav.classList.toggle("past", heroBadge ? heroBadge.getBoundingClientRect().bottom < 64 : true);
    if (!reduce) {
      showVisible();

      // Hero phone rises a little faster than the page.
      // (only a little, so it never slides up over the App Store badge)
      if (heroPhone) heroPhone.style.transform = `translateY(${-Math.min(y * 0.18, innerWidth < 760 ? 0 : 44)}px)`;

      // Story: the step nearest the middle of the screen leads.
      if (storySteps.length) {
        let best = 0, bestD = Infinity;
        storySteps.forEach((s, k) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bestD) { bestD = d; best = k; } });
        if (best !== current) {
          current = best;
          storySteps.forEach((s, k) => s.classList.toggle("active", k === best));
          storyShots.forEach(im => im.classList.toggle("on", Number(im.dataset.step) === best));
          storyTints.forEach((t, k) => t.classList.toggle("on", k === best));
          storyVids.forEach(v => { const on = Number(v.dataset.step) === best; v.dataset.active = on ? "1" : "0"; on ? playVid(v) : v.pause(); });
          storyFloats.forEach((f, k) => f.classList.toggle("on", k === best));
        }
        if (bar && story) { const r = story.getBoundingClientRect(); bar.style.height = `${clamp((vh / 2 - r.top) / r.height) * 100}%`; }
      }

      // Screens: the pinned story phone is always moved from here. The hero and the panels on
      // phones only where the browser can't tie them to scrolling itself.
      if (reels.length) {
        const wide = storyPhone && storyPhone.offsetParent !== null;
        reels.forEach(r => {
          let p = -1;
          if (r.step >= 0) {
            const s = wide && storySteps[r.step];
            if (s) { const b = s.getBoundingClientRect(), lead = r.step ? .5 : .8; p = clamp((vh / 2 + lead * b.height - (b.top + b.height / 2)) / ((lead + .5) * b.height)); }
          } else if (!nativeScroll) {
            if (r.hero) p = clamp(y / heroEnd);
            else if (r.stage && r.stage.offsetParent !== null) { const b = r.stage.getBoundingClientRect(); p = clamp(((vh - b.top) / (vh + b.height) - .12) / .76); }
          }
          if (p >= 0) r.el.style.transform = `translate3d(0,${(r.to * p).toFixed(3)}%,0)`;
        });
      }

      // Duo: fold angle follows scroll through the section.
      if (duoSec && duoLeft) {
        let p;
        if (phoneDuo.matches) {
          // Phones: the Duo isn't pinned; it starts to open once half of it is on screen and is
          // flat a little above the middle (the same range as phone.css).
          const w = duoWrap.getBoundingClientRect();
          p = clamp((steadyVh + w.height * 0.5 - w.bottom) / Math.max(1, w.height * 0.5 + (steadyVh - w.height) * 0.55));
        } else {
          // The section is 2.6 screens tall and the Duo opens while it crosses the screen. Taking the
          // screen's height from the section's own keeps this steady when Safari's toolbar shows or hides.
          const r = duoSec.getBoundingClientRect(), span = r.height * (1 - 1 / 2.6);
          p = clamp(-r.top / (span * 0.75));
        }
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        if (!nativeScroll) {
          duoLeft.style.transform = `rotateY(${180 * (1 - e)}deg)`;
          duoBody.style.transform = `translateX(${-25 * (1 - e)}%) rotateX(${8 * (1 - e)}deg) scale(${0.86 + 0.14 * e})`;
          duoHinge.style.setProperty("--hinge", e > .9 ? (e - .9) * 10 : 0);
          if (duoLabel) duoLabel.style.opacity = 1 - clamp(p * 3);
        }
        if (duoVid) { const open = e > 0.97; duoVid.classList.toggle("on", open); if (open && duoVid.paused) playVid(duoVid); else if (!open && !duoVid.paused) duoVid.pause(); }
      }

      // Map starts drawing when it's well in view.
      if (svg && !mapPlayed) { const r = svg.getBoundingClientRect(); if (r.top < vh * 0.78 && r.bottom > 0) playMap(); }
      if (statsRow && !countersPlayed) { const r = statsRow.getBoundingClientRect(); if (r.top < vh * 0.92 && r.bottom > 0) playCounters(); }

      // Year wrap: tilt with scroll, flags pop in.
      if (wrapSec && tilt) {
        const r = wrapSec.getBoundingClientRect(), p = clamp((vh - r.top) / (vh + r.height));
        if (!nativeScroll) tilt.style.transform = `rotateY(${(0.5 - p) * 28}deg) rotateX(${(p - 0.5) * 10}deg) translateZ(0)`;
        if (r.top < vh * 0.7) wrapSec.classList.add("in");
      }

      // The closing picture drifts a little slower than its card: nothing when the card is in the
      // middle of the screen, and never more than the 40px the picture has to spare.
      if (finalBg) {
        const r = finalBg.parentElement.getBoundingClientRect();
        finalBg.style.transform = `translate3d(0, ${Math.max(-38, Math.min(38, (r.top + r.height / 2 - steadyVh / 2) * -0.06)).toFixed(1)}px, 0)`;
      }
    }
  };
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
  if (reduce) { playMap(); counters.forEach(n => n.textContent = Number(n.dataset.count).toLocaleString()); if (wrapSec) wrapSec.classList.add("in"); }
})();
