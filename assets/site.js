// A picture that fails to arrive (a weak connection, a lazy load the phone gave up on) is
// fetched once more, then hidden, so a broken-image mark never shows.
(() => {
  const retry = img => {
    if (img.dataset.retried) { img.style.visibility = "hidden"; return; }
    img.dataset.retried = "1";
    const src = (img.currentSrc || img.src).split("#")[0];
    setTimeout(() => { img.loading = "eager"; img.src = src + (src.includes("?") ? "&" : "?") + "r=1"; }, 700);
  };
  document.addEventListener("error", e => { if (e.target instanceof HTMLImageElement) retry(e.target); }, true);
  const sweep = () => document.querySelectorAll("img").forEach(img => {
    // SVGs can report no natural size even when fine, so only the error event judges them.
    const src = img.getAttribute("src") || "";
    if (img.complete && src && !/\.svg(\?|$)/.test(src) && img.naturalWidth === 0) retry(img);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sweep); else sweep();
  window.addEventListener("load", sweep);
})();

// Atlased, getatlased.com. Small, dependency-free scroll animations.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---- A refresh starts at the top, like a first visit. Coming back with the Back button
  // still returns to where you were, so the browser's own behaviour is put back on leaving. ----
  const [arrival] = performance.getEntriesByType("navigation");
  if (arrival && arrival.type === "reload" && !location.hash && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
    scrollTo(0, 0);
    addEventListener("pagehide", () => { history.scrollRestoration = "auto"; });
  }

  // ---- Reveal on scroll (content is visible without JavaScript) ----
  const reveals = $$(".rv");
  const showVisible = () => reveals.forEach(el => {
    if (!el.classList.contains("in") && el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add("in");
  });
  if (reduce) reveals.forEach(el => el.classList.add("in"));
  else setTimeout(() => reveals.forEach(el => el.classList.add("in")), 6000);

  // ---- Photos slip into the phone at the pace of the scroll, then the padlock slams shut ----
  // --p runs from 0, as the phone rises into view, to 1 once it stands clear in the lower half of
  // the screen. The photos follow --p. At 1 the lock plays, on its own clock so it is always seen
  // whole; scrolling back up opens it again, so it plays each time the phone comes back.
  const lockArt = $(".lockart");
  if (lockArt) {
    if (reduce) { lockArt.style.setProperty("--p", "1"); lockArt.classList.add("shut"); }
    else {
      let queued = false, locked = false;
      const step = () => {
        queued = false;
        const r = lockArt.getBoundingClientRect(), vh = innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.96 - (r.top + r.height / 2)) / (vh * 0.34)));
        if (!locked && p >= 1) { locked = true; lockArt.classList.add("shut"); }
        else if (locked && p <= 0.55) { locked = false; lockArt.classList.remove("shut"); }
        // While it is locked the photos stay inside, however the page is nudged.
        lockArt.style.setProperty("--p", locked ? "1" : p.toFixed(3));
      };
      const on = () => { if (!queued) { queued = true; requestAnimationFrame(step); } };
      addEventListener("scroll", on, { passive: true });
      addEventListener("resize", on);
      step();
    }
  }

  // ---- Year wrap: the flags around the card pop in one by one as each reaches the screen ----
  // Scrolling back up tucks them away again, so they replay.
  const wrapFlags = $$(".wrapsec .flagfly");
  if (wrapFlags.length) {
    if (reduce) wrapFlags.forEach(f => f.classList.add("show"));
    else {
      let flagsQueued = false;
      const flagsStep = () => {
        flagsQueued = false;
        const vh = innerHeight; let k = 0;
        wrapFlags.forEach(f => {
          const r = f.getBoundingClientRect(), mid = r.top + r.height / 2, shown = f.classList.contains("show");
          // Several at once (a fast fling) still arrive in turn.
          if (!shown && mid < vh * 0.86) { f.style.transitionDelay = (k++ * 0.32) + "s"; f.classList.add("show"); }
          else if (shown && mid > vh * 0.96) { f.style.transitionDelay = "0s"; f.classList.remove("show"); }
        });
      };
      const flagsOn = () => { if (!flagsQueued) { flagsQueued = true; requestAnimationFrame(flagsStep); } };
      addEventListener("scroll", flagsOn, { passive: true });
      addEventListener("resize", flagsOn);
      flagsStep();
    }
  }

  // ---- Share: photos are picked one by one as you scroll, and the picker's share icon grows louder ----
  // Scrolling back up unpicks them in turn, so it plays again.
  const shareArt = $(".share-art");
  if (shareArt && !reduce) {
    const picks = $$(".ph", shareArt).filter(ph => ph.classList.contains("on"));
    const pics = $(".pics", shareArt), count = $(".pics .bar b", shareArt), shareIcon = $(".pics .act", shareArt);
    const say = n => n === 0 ? "Select photos" : n === 1 ? "1 photo selected" : n + " photos selected";
    if (picks.length && pics && count) {
      let shareQueued = false, shownPicks = -1;
      const shareStep = () => {
        shareQueued = false;
        const r = shareArt.getBoundingClientRect(), vh = innerHeight;
        const p = clamp((vh * 0.98 - (r.top + r.height / 2)) / (vh * 0.62));
        shareArt.style.setProperty("--p", p.toFixed(3));
        const n = picks.filter((ph, i) => p >= 0.18 + i * 0.24).length;
        if (n === shownPicks) return;
        picks.forEach((ph, i) => ph.classList.toggle("on", i < n));
        count.textContent = say(n);
        pics.classList.toggle("has", n > 0);
        pics.style.setProperty("--n", n);
        // Each new pick nudges the share icon, so it feels the photos arrive.
        if (shareIcon && shownPicks >= 0 && n > shownPicks) {
          shareIcon.classList.remove("bump"); void shareIcon.offsetWidth; shareIcon.classList.add("bump");
        }
        shareArt.classList.toggle("done", n === picks.length);
        shownPicks = n;
      };
      const shareOn = () => { if (!shareQueued) { shareQueued = true; requestAnimationFrame(shareStep); } };
      addEventListener("scroll", shareOn, { passive: true });
      addEventListener("resize", shareOn);
      shareStep();
    }
  }

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
    const W = 1000, HEIGHT = 480, EQUATOR = point(0, 0)[1];
    const H = point(...home);
    const make = (name, attrs, parent) => {
      const el = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      return parent.appendChild(el);
    };
    const xy = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
    // Routes are drawn as in the app's Recap map. Each takes the shorter way round the world and
    // bows toward the nearer pole. Long routes that run side by side share one curvature, so the
    // longer one flies higher and they nest instead of crossing.
    const makeArc = (a, b) => {
      let dx = b[0] - a[0];
      dx -= Math.round(dx / W) * W;
      const dy = b[1] - a[1], span = Math.abs(dx), midY = a[1] + dy / 2;
      const pole = midY < EQUATOR ? -1 : 1, room = pole < 0 ? midY : HEIGHT - midY;
      return {
        a, dx, dy, span, pole, room, midX: a[0] + dx / 2,
        bend: pole * Math.min(room, span * 0.36, W * 0.094),
        westX: Math.min(a[0], a[0] + dx), eastX: Math.max(a[0], a[0] + dx),
        westY: dx >= 0 ? a[1] : a[1] + dy, eastY: dx >= 0 ? a[1] + dy : a[1]
      };
    };
    const sameCorridor = (p, q) => {
      if (p.pole !== q.pole) return false;
      const shift = Math.round((p.midX - q.midX) / W) * W;
      const overlap = Math.min(p.eastX, q.eastX + shift) - Math.max(p.westX, q.westX + shift);
      const westGap = Math.abs(p.westX - q.westX - shift), eastGap = Math.abs(p.eastX - q.eastX - shift);
      return overlap >= Math.min(p.span, q.span) * 0.68 && Math.min(westGap, eastGap) <= W * 0.055
        && Math.max(westGap, eastGap) <= W * 0.15 && Math.abs(p.westY - q.westY) <= W * 0.10
        && Math.abs(p.eastY - q.eastY) <= W * 0.13;
    };
    // blossom(arc, t, t) is the curve's point at t, and blossom(arc, s, e) the middle control
    // point of its piece from s to e, so a piece is still the exact curve.
    const blossom = (arc, s, e, shift = 0) => {
      const w1 = (1 - s) * e + s * (1 - e), along = w1 / 2 + s * e;
      return [arc.a[0] + along * arc.dx + shift, arc.a[1] + along * arc.dy + w1 * arc.bend];
    };
    // The pieces of a route, as [from, to, shift]: one that leaves an edge of the map comes back
    // in at the other.
    const pieces = arc => {
      const end = arc.a[0] + arc.dx;
      if (end >= 0 && end <= W) return [[0, 1, 0]];
      const cut = ((end < 0 ? 0 : W) - arc.a[0]) / arc.dx;
      return [[0, cut, 0], [cut, 1, end < 0 ? W : -W]];
    };
    // Each trip leaves home, takes its stops in turn and comes home again. A route and the same
    // route back share one line.
    const routes = new Map();
    const trips = journeys.map(trip => {
      const stops = trip.map(([lat, lon]) => point(lat, lon)), ends = [H, ...stops, H], legs = [];
      for (let k = 1; k < ends.length; k++) {
        const there = xy(ends[k - 1]) + ">" + xy(ends[k]), back = xy(ends[k]) + ">" + xy(ends[k - 1]);
        if (routes.has(back)) legs.push({ arc: routes.get(back), reversed: true });
        else {
          if (!routes.has(there)) routes.set(there, makeArc(ends[k - 1], ends[k]));
          legs.push({ arc: routes.get(there), reversed: false });
        }
      }
      return { stops, legs };
    });
    // Long routes in the same corridor share one curvature.
    const waiting = [...routes.values()].filter(arc => arc.span >= W * 0.12);
    while (waiting.length) {
      const corridor = [waiting.shift()];
      for (let k = 0; k < corridor.length; k++) {
        for (let j = 0; j < waiting.length;) {
          if (sameCorridor(corridor[k], waiting[j])) corridor.push(...waiting.splice(j, 1)); else j++;
        }
      }
      const longest = Math.max(...corridor.map(arc => arc.span));
      const curvature = Math.min(1.65 / W, W * 0.15 / (longest * longest));
      corridor.forEach(arc => { arc.bend = arc.pole * Math.min(arc.room, curvature * arc.span * arc.span); });
    }
    const lines = make("g", { class: "routes" }, svg), places = make("g", { class: "places" }, svg);
    const drawn = new Set();
    trips.forEach(trip => {
      trip.legs.forEach(({ arc }) => {
        if (drawn.has(arc)) return;
        drawn.add(arc);
        pieces(arc).forEach(([s, e, shift]) => {
          const d = `M${xy(blossom(arc, s, s, shift))}Q${xy(blossom(arc, s, e, shift))} ${xy(blossom(arc, e, e, shift))}`;
          steps.push({ kind: "route", el: make("path", { d, class: "route" }, lines), d });
        });
      });
      trip.stops.forEach(([x, y]) => steps.push({ kind: "city", el: make("circle", { cx: x, cy: y, r: 3.4, class: "city" }, places) }));
    });
    // Home is a place like the others, with a slow pulse round it.
    const pulse = make("circle", { cx: H[0], cy: H[1], r: 4, class: "home-pulse" }, places);
    make("circle", { cx: H[0], cy: H[1], r: 3.4, class: "city" }, places);
    // On a narrow screen, lines, dots and lights are drawn a little heavier so they still read.
    let weight = 1;
    const fit = () => {
      weight = Math.min(2, Math.max(1, Math.sqrt(980 / (svg.getBoundingClientRect().width || 980))));
      lines.setAttribute("stroke-width", (1.15 * weight).toFixed(2));
      places.setAttribute("stroke-width", (0.75 * weight).toFixed(2));
      pulse.setAttribute("stroke-width", (1.2 * weight).toFixed(2));
      places.querySelectorAll("circle").forEach(c => c.setAttribute("r", ((c === pulse ? 4 : 3.4) * weight).toFixed(2)));
    };
    fit();
    addEventListener("resize", fit);
    // Once the map has drawn, a soft amber light travels each trip, as in the app: out from home,
    // round its stops and back. Every lap takes the same time, so a longer trip moves faster.
    const glowFill = make("radialGradient", { id: "glowFill" }, make("defs", {}, svg));
    [[0, 0.98], [0.36, 0.66], [0.67, 0.24], [1, 0]].forEach(([offset, alpha]) =>
      make("stop", { offset, "stop-color": "#FFBF6E", "stop-opacity": alpha }, glowFill));
    const track = legs => {
      const runs = [];
      legs.forEach(({ arc, reversed }) => {
        const parts = pieces(arc).map(([s, e, shift]) => {
          const n = Math.max(2, Math.ceil((e - s) * 64));
          return Array.from({ length: n + 1 }, (_, i) => blossom(arc, s + (e - s) * i / n, s + (e - s) * i / n, shift));
        });
        if (reversed) parts.reverse().forEach(part => part.reverse());
        runs.push(...parts);
      });
      const marks = [];
      let length = 0;
      runs.forEach(run => run.forEach((to, i) => {
        if (!i) return;
        const from = run[i - 1], step = Math.hypot(to[0] - from[0], to[1] - from[1]);
        if (step > 0) { marks.push({ from, to, start: length, end: length + step }); length += step; }
      }));
      return {
        length,
        at: progress => {
          const goal = length * progress;
          let lo = 0, hi = marks.length - 1;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (marks[mid].end < goal) lo = mid + 1; else hi = mid; }
          const { from, to, start, end } = marks[lo], f = (goal - start) / (end - start);
          return [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f];
        }
      };
    };
    svg.startGlows = () => {
      const tracks = trips.map(trip => track(trip.legs)).sort((p, q) => p.length - q.length);
      const count = tracks.length, layer = make("g", { class: "glows" }, svg);
      const travel = 1.6 * Math.min(6.3, Math.max(3.5, tracks[count - 1].length / (W * 0.145)));
      const cycle = travel + (count > 1 ? 0.25 : 0), shorter = Math.ceil(count / 2);
      // Short and long trips take turns, so lights set out all through the lap.
      const glows = tracks.map((path, rank) => {
        const slot = rank < shorter ? 2 * rank : 2 * (count - 1 - rank) + 1;
        const el = make("g", { opacity: 0 }, layer);
        make("circle", { r: 7, fill: "url(#glowFill)" }, el);
        make("circle", { r: 1.8, fill: "#FFF5DB", stroke: "#A8400F", "stroke-opacity": 0.82, "stroke-width": 0.5 }, el);
        return { path, el, phase: count > 1 ? (slot + 0.25) * cycle / count : 0 };
      });
      let clock = 0, last = 0, ticking = 0, shown = true;
      const wake = () => { if (!ticking && shown && !document.hidden) ticking = requestAnimationFrame(tick); };
      const tick = now => {
        ticking = 0;
        clock += Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        glows.forEach(({ path, el, phase }) => {
          // Each light first sets out from home, so they leave one by one.
          const t = clock + phase, lap = t % cycle;
          if (t < cycle || lap >= travel) { el.setAttribute("opacity", 0); return; }
          const [x, y] = path.at(lap / travel), fade = Math.min(1, lap / 0.18, (travel - lap) / 0.25);
          el.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${weight.toFixed(3)})`);
          el.setAttribute("opacity", (fade * fade * (3 - 2 * fade)).toFixed(3));
        });
        wake();
      };
      // The lights rest while the map is off screen.
      if ("IntersectionObserver" in window) new IntersectionObserver(entries => { shown = entries.some(e => e.isIntersecting); wake(); }).observe(svg);
      document.addEventListener("visibilitychange", wake);
      wake();
    };
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
    setTimeout(() => svg.startGlows && svg.startGlows(), steps.length * 45 + 600);
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
  // Phones show every step at once, so each step's panel gets a copy of its cards. The cards come in
  // one by one as each reaches the screen, and go again when scrolled back below, ready to replay.
  const mCards = [];
  $$(".mstage").forEach(m => {
    const f = $(`.story-phone .floats[data-step="${m.dataset.step}"]`);
    if (f) { const copy = f.cloneNode(true); m.appendChild(copy); mCards.push(...$$(".fc", copy)); }
  });
  if (mCards.length) {
    if (reduce) mCards.forEach(c => c.classList.add("show"));
    else {
      let cardsQueued = false;
      const cardsStep = () => {
        cardsQueued = false;
        const vh = innerHeight; let k = 0;
        mCards.forEach(c => {
          const r = c.getBoundingClientRect(), mid = r.top + r.height / 2, shown = c.classList.contains("show");
          if (!r.height) return;
          // Several at once (a fast fling) still arrive in turn.
          if (!shown && mid < vh * 0.84) { c.style.transitionDelay = (k++ * 0.2) + "s"; c.classList.add("show"); }
          else if (shown && mid > vh * 0.95) { c.style.transitionDelay = "0s"; c.classList.remove("show"); }
        });
      };
      const cardsOn = () => { if (!cardsQueued) { cardsQueued = true; requestAnimationFrame(cardsStep); } };
      addEventListener("scroll", cardsOn, { passive: true });
      addEventListener("resize", cardsOn);
      cardsStep();
    }
  }
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
