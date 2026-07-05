/* Status Bar Composer — 3D card ring.
   Cards sit on a cylinder (rotateY(i·step) translateZ(R)); the ring container
   counter-rotates so the focused card faces the viewer. Focus changes by
   click / drag / arrow keys / dots — hover only lifts (user's choice).
   Falls back to a flat scroll-snap strip under 960px and honors
   prefers-reduced-motion (no inertia, no parallax). */
window.SBC = window.SBC || {};
(function (S) {
  "use strict";

  const mod = (a, n) => ((a % n) + n) % n;
  const PX_PER_CARD = 190;          // horizontal drag distance for one card step
  const flatMq = matchMedia("(max-width: 960px)");
  const rmMq = matchMedia("(prefers-reduced-motion: reduce)");

  const ring = {
    rot: 0,                          // continuous position, in card units
    get N() { return S.CARDS.length; },
    get step() { return 360 / this.N; },
  };
  S.ring = ring;

  let ringEl, stageEl, sceneEl, cardEls = [];
  let R = 640;
  let onFocus = null;
  let lastFocus = -1;

  ring.focusIndex = function () { return mod(Math.round(ring.rot), ring.N); };
  ring.isFlat = function () { return flatMq.matches; };

  ring.init = function (opts) {
    ringEl = document.getElementById("ring");
    stageEl = document.getElementById("stage");
    sceneEl = document.getElementById("scene");
    cardEls = Array.from(ringEl.children);
    onFocus = opts.onFocus || function () {};
    R = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ring-r")) || 640;

    bindDrag();
    bindKeys();
    bindParallax();
    cardEls.forEach((el, i) => {
      el.addEventListener("click", (e) => {
        if (dragMoved) return;
        if (ring.focusIndex() !== i) { ring.goTo(i); e.preventDefault(); }
      });
    });
    const onMq = () => { ring.layout(); ring.goTo(ring.focusIndex(), false); };
    if (flatMq.addEventListener) flatMq.addEventListener("change", onMq);
    ringEl.classList.add("boot");           // land instantly, animate afterwards
    ring.layout();
    ring.goTo(opts.start || 0, false);
    requestAnimationFrame(() => requestAnimationFrame(() => ringEl.classList.remove("boot")));
  };

  /* ---- transforms ---- */
  ring.layout = function () {
    if (ring.isFlat()) {
      ringEl.style.transform = "";
      sceneEl.style.transform = "";
      cardEls.forEach((el) => { el.style.transform = ""; });
      applyDepth();
      return;
    }
    applyRing();
    applyCards();
    applyDepth();
  };

  function applyRing() {
    ringEl.style.transform = "translateZ(" + (-R) + "px) rotateY(" + (-ring.rot * ring.step) + "deg)";
  }
  function applyCards() {
    const f = ring.focusIndex();
    cardEls.forEach((el, i) => {
      let k = mod(i - f, ring.N);
      if (k > ring.N / 2) k -= ring.N;
      const focused = k === 0;
      // coverflow lean: side cards angle away so the ring reads as a gallery
      const lean = focused ? 0 : Math.sign(k) * Math.min(Math.abs(k), 2) * 11;
      el.style.transform =
        "rotateY(" + (i * ring.step) + "deg) translateZ(" + (R + (focused ? 56 : 0)) + "px)" +
        " rotateY(" + lean + "deg)" +
        (focused ? " translateY(-6px) scale(1.05)" : "");
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
    if (f !== lastFocus) { lastFocus = f; if (!ring.isFlat()) applyCards(); onFocus(f); }
  }

  /* ---- programmatic moves ---- */
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
    ring.rot = base + k;
    ringEl.classList.toggle("no-anim", animate === false);
    applyRing();
    applyCards();
    applyDepth();
    if (animate === false) requestAnimationFrame(() => ringEl.classList.remove("no-anim"));
  };
  ring.next = function () { ring.goTo(mod(Math.round(ring.rot) + 1, ring.N)); };
  ring.prev = function () { ring.goTo(mod(Math.round(ring.rot) - 1, ring.N)); };

  /* ---- drag rotation ---- */
  let dragging = false, dragMoved = false, dragX = 0, dragRot = 0, lastX = 0, lastT = 0, vel = 0;

  function dragStartAllowed(t) {
    if (ring.isFlat()) return false;
    if (t.closest("button, input, select, label, a, .terminal")) return false;
    const card = t.closest(".card");
    if (card && card.classList.contains("d0")) return false;   // focused card is for its controls
    return true;
  }

  function bindDrag() {
    stageEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !dragStartAllowed(e.target)) return;
      dragging = true; dragMoved = false;
      dragX = lastX = e.clientX; dragRot = ring.rot; lastT = e.timeStamp; vel = 0;
      stageEl.setPointerCapture(e.pointerId);
      ringEl.classList.add("no-anim");
    });
    stageEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) > 4) dragMoved = true;
      const dt = Math.max(1, e.timeStamp - lastT);
      vel = 0.8 * vel + 0.2 * ((e.clientX - lastX) / dt);
      lastX = e.clientX; lastT = e.timeStamp;
      ring.rot = dragRot - dx / PX_PER_CARD;
      applyRing();
      applyDepth();
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      stageEl.classList.remove("is-grabbing");
      ringEl.classList.remove("no-anim");
      let extra = rmMq.matches ? 0 : -vel * 130 / PX_PER_CARD;
      extra = Math.max(-2.4, Math.min(2.4, extra));
      ring.rot = Math.round(ring.rot + extra);
      applyRing();
      applyCards();
      applyDepth();
      setTimeout(() => { dragMoved = false; }, 0);   // let the click handler read it first
    };
    stageEl.addEventListener("pointerup", end);
    stageEl.addEventListener("pointercancel", end);
    stageEl.addEventListener("pointerdown", () => { if (dragging) stageEl.classList.add("is-grabbing"); });
  }

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

  /* ---- parallax tilt (ambience only) ---- */
  function bindParallax() {
    let tx = 0, ty = 0, gx = 0, gy = 0, raf = null;
    const tick = () => {
      gx += (tx - gx) * 0.08;
      gy += (ty - gy) * 0.08;
      sceneEl.style.transform = "rotateX(" + gy.toFixed(3) + "deg) rotateY(" + gx.toFixed(3) + "deg)";
      if (Math.abs(gx - tx) > 0.01 || Math.abs(gy - ty) > 0.01) raf = requestAnimationFrame(tick);
      else raf = null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    stageEl.addEventListener("pointermove", (e) => {
      if (rmMq.matches || ring.isFlat() || dragging) return;
      const r = stageEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 4;    // deg
      ty = ((e.clientY - r.top) / r.height - 0.5) * -3;
      kick();
    });
    stageEl.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }
})(window.SBC);
