/* Status Bar Composer - 3D coverflow engine.
   Slot-based: every card's transform is a continuous function of its offset
   k = wrap(i - rot). The focused card (k = 0) gets a 2D-only transform so its
   text rasterizes 1:1 (crisp); side cards turn hard (42 deg per step) and
   recede. No blur filters: depth reads through projection size, opacity and
   a background-tinted veil (--veil). Motion is JS-driven (rAF ease-out), so
   there are no CSS transform transitions to fight and reduced-motion can
   simply jump. Parallax is a perspective-origin drift, which never touches
   the crisp focused card. Falls back to a flat scroll strip under 960px. */
window.SBC = window.SBC || {};
(function (S) {
  "use strict";

  const mod = (a, n) => ((a % n) + n) % n;
  const PX_PER_CARD = 230;      // horizontal drag distance for one card step
  const MAXK = 3.6;             // cards beyond this offset are hidden
  const SNAP_MS = 380;
  const flatMq = matchMedia("(max-width: 960px)");
  const rmMq = matchMedia("(prefers-reduced-motion: reduce)");

  const ring = {
    rot: 0,                      // continuous position, in card units
    get N() { return S.CARDS.length; },
  };
  S.ring = ring;

  let ringEl, bandEl, cardEls = [];
  let onFocus = null;
  let lastFocus = -1;
  let spreadScale = 1;
  let animRaf = null;

  ring.focusIndex = function () { return mod(Math.round(ring.rot), ring.N); };
  ring.isFlat = function () { return flatMq.matches; };

  /* piecewise-linear helper: y at x over given stops */
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
        return ys[i - 1] + t * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  }

  /* slot geometry for a continuous offset k */
  function slot(k) {
    const a = Math.abs(k), s = Math.sign(k);
    return {
      x: s * interp(a, [0, 1, 2, 3, MAXK], [0, 370, 630, 800, 880]) * spreadScale,
      z: -interp(a, [0, 1, 2, 3, MAXK], [0, 230, 460, 690, 830]),
      ry: -s * Math.min(a * 42, 55),
      op: interp(a, [0, 1, 2, 3, MAXK], [1, 0.95, 0.78, 0.5, 0]),
      veil: interp(a, [0, 1, 2, 3, MAXK], [0, 0.1, 0.28, 0.46, 0.6]),
      zi: 200 - Math.round(a * 20),
    };
  }

  function wrapK(i) {
    let k = mod(i - ring.rot, ring.N);
    if (k > ring.N / 2) k -= ring.N;
    return k;
  }

  function apply() {
    if (ring.isFlat()) return;
    cardEls.forEach((el, i) => {
      const k = wrapK(i);
      if (Math.abs(k) > MAXK) {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      const t = slot(k);
      el.style.visibility = "visible";
      el.style.pointerEvents = "auto";
      el.style.opacity = String(t.op);
      el.style.zIndex = String(t.zi);
      el.style.setProperty("--veil", t.veil.toFixed(3));
      el.style.transform = Math.abs(k) < 0.004
        ? "translate(-50%, -50%)"   // 2D only: razor-sharp focused card
        : "translate(-50%, -50%) translate3d(" + t.x.toFixed(1) + "px, 0, " + t.z.toFixed(1) + "px) rotateY(" + t.ry.toFixed(2) + "deg)";
    });
  }

  function applyDepth() {
    const f = ring.focusIndex();
    cardEls.forEach((el, i) => {
      const d = Math.min(mod(i - f, ring.N), mod(f - i, ring.N));
      el.className = "card d" + Math.min(d, 4) + (d > 0 ? " is-aside" : "");
      const body = el.querySelector(".card-body");
      if (body && "inert" in body) body.inert = d > 0;   // keep tab order inside the focused card
      el.setAttribute("aria-hidden", d > 2 ? "true" : "false");
    });
    if (f !== lastFocus) { lastFocus = f; onFocus(f); }
  }

  /* ---- init ---- */
  ring.init = function (opts) {
    ringEl = document.getElementById("ring");
    bandEl = document.getElementById("band");
    cardEls = Array.from(ringEl.children);
    onFocus = opts.onFocus || function () {};

    bindDrag();
    bindWheel();
    bindKeys();
    bindParallax();
    const onMq = () => { ring.layout(); ring.goTo(ring.focusIndex(), false); };
    if (flatMq.addEventListener) flatMq.addEventListener("change", onMq);
    addEventListener("resize", () => { measure(); apply(); });

    measure();
    ring.rot = opts.start || 0;
    ring.layout();
    if (ring.isFlat()) ring.goTo(ring.focusIndex(), false);   // scroll the strip to the start card
  };

  function measure() {
    spreadScale = Math.min(1, Math.max(0.62, (bandEl ? bandEl.clientWidth : 1440) / 1500));
  }

  ring.layout = function () {
    if (ring.isFlat()) {
      cardEls.forEach((el) => {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
        el.style.visibility = "";
        el.style.pointerEvents = "";
        el.style.removeProperty("--veil");
      });
      ringEl.style.perspectiveOrigin = "";
      applyDepth();
      return;
    }
    apply();
    applyDepth();
  };

  /* ---- programmatic moves (JS-animated) ---- */
  function animateTo(target) {
    if (animRaf) cancelAnimationFrame(animRaf);
    if (rmMq.matches) {
      ring.rot = target;
      apply();
      applyDepth();
      return;
    }
    const from = ring.rot, delta = target - from;
    if (Math.abs(delta) < 0.001) { ring.rot = target; apply(); applyDepth(); return; }
    const t0 = performance.now();
    const dur = Math.min(560, SNAP_MS + Math.abs(delta) * 40);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);          // ease-out cubic
      ring.rot = from + delta * e;
      apply();
      applyDepth();
      if (t < 1) animRaf = requestAnimationFrame(step);
      else { animRaf = null; ring.rot = target; apply(); }
    };
    animRaf = requestAnimationFrame(step);
  }

  ring.goTo = function (idx, animate) {
    if (ring.isFlat()) {
      ring.rot = idx;
      applyDepth();
      const el = cardEls[idx];
      if (el) el.scrollIntoView({ behavior: rmMq.matches || animate === false ? "auto" : "smooth", inline: "center", block: "nearest" });
      return;
    }
    const base = Math.round(ring.rot);
    let k = mod(idx - base, ring.N);
    if (k > ring.N / 2) k -= ring.N;
    if (animate === false) {
      ring.rot = base + k;
      apply();
      applyDepth();
      return;
    }
    animateTo(base + k);
  };
  ring.next = function () { ring.goTo(mod(Math.round(ring.rot) + 1, ring.N)); };
  ring.prev = function () { ring.goTo(mod(Math.round(ring.rot) - 1, ring.N)); };

  /* ---- drag + reliable side-card click ---- */
  let dragging = false, downX = 0, downRot = 0, maxDelta = 0, lastX = 0, lastT = 0, vel = 0, downCard = -1;

  function bindDrag() {
    bandEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || ring.isFlat()) return;
      if (e.target.closest("button, input, select, label, a")) return;
      const card = e.target.closest(".card");
      if (card && card.classList.contains("d0")) return;   // focused card is for its controls
      downCard = card ? cardEls.indexOf(card) : -1;
      dragging = true; maxDelta = 0;
      downX = lastX = e.clientX; downRot = ring.rot; lastT = e.timeStamp; vel = 0;
      if (animRaf) { cancelAnimationFrame(animRaf); animRaf = null; }
      bandEl.setPointerCapture(e.pointerId);
      bandEl.classList.add("is-grabbing");
    });
    bandEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - downX;
      maxDelta = Math.max(maxDelta, Math.abs(dx));
      const dt = Math.max(1, e.timeStamp - lastT);
      vel = 0.8 * vel + 0.2 * ((e.clientX - lastX) / dt);
      lastX = e.clientX; lastT = e.timeStamp;
      ring.rot = downRot - dx / PX_PER_CARD;
      apply();
      applyDepth();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      bandEl.classList.remove("is-grabbing");
      if (maxDelta < 8 && downCard >= 0) {       // a click, not a drag: center that card
        ring.goTo(downCard);
      } else {
        let extra = rmMq.matches ? 0 : -vel * 140 / PX_PER_CARD;
        extra = Math.max(-2.4, Math.min(2.4, extra));
        animateTo(Math.round(ring.rot + extra));
      }
      downCard = -1;
    };
    bandEl.addEventListener("pointerup", end);
    bandEl.addEventListener("pointercancel", end);
  }

  /* ---- two-finger trackpad swipe (horizontal wheel) ----
     Only horizontal intent is captured; vertical deltas keep scrolling the
     page. Snap to the nearest card once the gesture (and its inertia tail)
     goes quiet for a beat. */
  let wheelTimer = null;
  function bindWheel() {
    bandEl.addEventListener("wheel", (e) => {
      if (ring.isFlat()) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (animRaf) { cancelAnimationFrame(animRaf); animRaf = null; }
      const d = e.deltaMode === 1 ? e.deltaX * 18 : e.deltaX;   // lines -> px
      ring.rot += d / 480;
      apply();
      applyDepth();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => animateTo(Math.round(ring.rot)), 140);
    }, { passive: false });
  }

  /* clicking a side card in flat mode (native click; no drag there) */
  ring.bindFlatClicks = function () {
    cardEls.forEach((el, i) => {
      el.addEventListener("click", (e) => {
        if (!ring.isFlat()) return;
        if (e.target.closest("button, input, select, label, a")) return;
        if (ring.focusIndex() !== i) ring.goTo(i);
      });
    });
  };

  /* ---- keyboard ---- */
  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") { ring.prev(); e.preventDefault(); }
      else if (e.key === "ArrowRight") { ring.next(); e.preventDefault(); }
    });
  }

  /* ---- parallax: perspective-origin drift (never touches the 2D focused card) ---- */
  function bindParallax() {
    let tx = 0, ty = 0, gx = 0, gy = 0, raf = null;
    const tick = () => {
      gx += (tx - gx) * 0.07;
      gy += (ty - gy) * 0.07;
      ringEl.style.perspectiveOrigin = (50 + gx).toFixed(2) + "% " + (30 + gy).toFixed(2) + "%";
      if (Math.abs(gx - tx) > 0.02 || Math.abs(gy - ty) > 0.02) raf = requestAnimationFrame(tick);
      else raf = null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    bandEl.addEventListener("pointermove", (e) => {
      if (rmMq.matches || ring.isFlat() || dragging) return;
      const r = bandEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 9;    // percent drift
      ty = ((e.clientY - r.top) / r.height - 0.5) * 6;
      kick();
    });
    bandEl.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }
})(window.SBC);
