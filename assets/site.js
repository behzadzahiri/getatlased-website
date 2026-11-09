// Atlased — small, dependency-free behaviour for getatlased.com
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav border once the page scrolls.
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  // Fade sections in as they arrive. Content is visible without JavaScript; the
  // fade is only armed here, and a scroll check backs up the observer.
  const reveals = [...document.querySelectorAll(".reveal")];
  const showVisible = () => reveals.forEach(el => {
    if (!el.classList.contains("in") && el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("in");
  });
  if (reduce) {
    reveals.forEach(el => el.classList.add("in"));
  } else {
    document.documentElement.classList.add("js");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(el => io.observe(el));
    }
    showVisible();
    window.addEventListener("scroll", showVisible, { passive: true });
    setTimeout(() => reveals.forEach(el => el.classList.add("in")), 4000);
  }

  // The world map: the app's own projection, so dots land on the picture exactly.
  const svg = document.getElementById("journeys");
  if (!svg) return;
  const project = (lat, lon) => {
    const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180;
    const p2 = phi * phi, p4 = p2 * p2;
    const x = lambda * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return { x, y };
  };
  const top = project(84, 0).y, bottom = project(-57, 0).y, half = project(0, 180).x;
  const point = (lat, lon) => {
    const v = project(Math.max(-90, Math.min(90, lat)), lon);
    return [(v.x + half) / (2 * half) * 1000, (top - v.y) / (top - bottom) * 480];
  };

  // An example journal: each list is one journey, in order.
  const journeys = [
    [[19.43, -99.13], [21.16, -86.85]],
    [[40.71, -74.0], [25.76, -80.19]],
    [[64.15, -21.94]],
    [[38.72, -9.14], [40.42, -3.70], [48.86, 2.35], [52.37, 4.90]],
    [[41.90, 12.50], [43.77, 11.25], [45.44, 12.32], [37.98, 23.73]],
    [[41.01, 28.98], [38.64, 34.83], [25.20, 55.27]],
    [[-33.92, 18.42]],
    [[22.32, 114.17], [25.03, 121.56]],
    [[37.57, 126.98], [35.68, 139.69], [35.01, 135.77]],
    [[-33.87, 151.21], [-45.03, 168.66]]
  ];
  const NS = "http://www.w3.org/2000/svg";
  const steps = [];
  journeys.forEach(trip => {
    const pts = trip.map(([la, lo]) => point(la, lo));
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const lift = Math.min(len * 0.25, 40);
      const cx = (x1 + x2) / 2 + (len ? dy / len * lift : 0), cy = (y1 + y2) / 2 - (len ? Math.abs(dx) / len * lift : 0);
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`);
      path.setAttribute("class", "route");
      svg.appendChild(path);
      steps.push({ kind: "route", el: path });
    }
    pts.forEach(([x, y]) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 3.4);
      c.setAttribute("class", "city");
      svg.appendChild(c);
      steps.push({ kind: "city", el: c });
    });
  });

  const countUp = (el, to, ms) => {
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / ms), eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const numbers = document.querySelectorAll("[data-count]");

  const play = () => {
    steps.forEach((s, i) => {
      const delay = i * 70;
      if (s.kind === "route") {
        const L = s.el.getTotalLength();
        s.el.style.strokeDasharray = L; s.el.style.strokeDashoffset = L;
        s.el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
                     { duration: 700, delay, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
      } else {
        s.el.animate([{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.6)", opacity: 1, offset: .6 }, { transform: "scale(1)", opacity: 1 }],
                     { duration: 520, delay, easing: "ease-out", fill: "backwards" });
      }
    });
    numbers.forEach(n => countUp(n, Number(n.dataset.count), 1800));
  };

  if (reduce || !("IntersectionObserver" in window)) {
    numbers.forEach(n => n.textContent = Number(n.dataset.count).toLocaleString());
    return;
  }
  numbers.forEach(n => n.textContent = "0");
  steps.forEach(s => { if (s.kind === "route") s.el.style.opacity = "0"; });
  let played = false;
  const start = () => {
    if (played) return; played = true;
    steps.forEach(s => { if (s.kind === "route") s.el.style.opacity = "1"; });
    play();
  };
  const mapObserver = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { mapObserver.disconnect(); start(); }
  }, { threshold: 0.35 });
  mapObserver.observe(svg);
  const mapCheck = () => {
    const r = svg.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.8 && r.bottom > 0) { window.removeEventListener("scroll", mapCheck); start(); }
  };
  window.addEventListener("scroll", mapCheck, { passive: true }); mapCheck();
})();
