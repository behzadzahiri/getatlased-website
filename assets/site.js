// Atlased — getatlased.com. Small, dependency-free scroll animations.
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
    counters.forEach(n => {
      const to = Number(n.dataset.count), t0 = performance.now();
      const tick = now => { const t = clamp((now - t0) / 2000), e = 1 - Math.pow(1 - t, 3); n.textContent = Math.round(to * e).toLocaleString(); if (t < 1) requestAnimationFrame(tick); };
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
  const nav = $(".nav"), heroPhone = $("#heroPhone");
  const storySteps = $$(".story-steps .step"), storyShots = $$(".story-phone .sv"), bar = $("#storyBar"), story = $(".story");
  const duoSec = $("#duo"), duoLeft = $("#duoLeft"), duoBody = $("#duoBody"), duoHinge = $("#duoHinge"), duoLabel = $("#duoLabel");
  const wrapSec = $(".wrapsec"), tilt = $("#tilt"), finalBg = $("#finalBg"), finalSec = $(".final");
  let current = -1;

  const frame = () => {
    const y = scrollY, vh = innerHeight;
    nav && nav.classList.toggle("solid", y > 40);
    if (!reduce) {
      showVisible();

      // Hero phone rises a little faster than the page.
      if (heroPhone) heroPhone.style.transform = `translateY(${-Math.min(y, vh) * 0.18}px)`;

      // Story: the step nearest the middle of the screen leads.
      if (storySteps.length) {
        let best = 0, bestD = Infinity;
        storySteps.forEach((s, k) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bestD) { bestD = d; best = k; } });
        if (best !== current) {
          current = best;
          storySteps.forEach((s, k) => s.classList.toggle("active", k === best));
          storyShots.forEach((im, k) => im.classList.toggle("on", k === best));
        }
        if (bar && story) { const r = story.getBoundingClientRect(); bar.style.height = `${clamp((vh / 2 - r.top) / r.height) * 100}%`; }
      }

      // Duo: fold angle follows scroll through the section.
      if (duoSec && duoLeft) {
        const r = duoSec.getBoundingClientRect(), span = r.height - vh;
        const p = clamp(-r.top / (span * 0.75));
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        duoLeft.style.transform = `rotateY(${180 * (1 - e)}deg)`;
        duoBody.style.transform = `translateX(${-25 * (1 - e)}%) rotateX(${8 * (1 - e)}deg) scale(${0.86 + 0.14 * e})`;
        duoHinge.style.setProperty("--hinge", e > .9 ? (e - .9) * 10 : 0);
        if (duoLabel) duoLabel.style.opacity = 1 - clamp(p * 3);
      }

      // Map starts drawing when it's well in view.
      if (svg && !mapPlayed) { const r = svg.getBoundingClientRect(); if (r.top < vh * 0.78 && r.bottom > 0) playMap(); }

      // Year wrap: tilt with scroll, flags pop in.
      if (wrapSec && tilt) {
        const r = wrapSec.getBoundingClientRect(), p = clamp((vh - r.top) / (vh + r.height));
        tilt.style.transform = `rotateY(${(0.5 - p) * 28}deg) rotateX(${(p - 0.5) * 10}deg) translateZ(0)`;
        if (r.top < vh * 0.7) wrapSec.classList.add("in");
      }

      // Final photo drifts slower than the page.
      if (finalBg && finalSec) { const r = finalSec.getBoundingClientRect(); finalBg.style.transform = `translateY(${(r.top) * -0.12}px)`; }
    }
  };
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
  if (reduce) { playMap(); counters.forEach(n => n.textContent = Number(n.dataset.count).toLocaleString()); if (wrapSec) wrapSec.classList.add("in"); }
})();
