/* Status Bar Composer — terminal preview renderer.
   A faithful port of the generated script's rendering rules (generate.py):
   same separator handling, emoji map, gradient math, desaturation, emphasis
   and link styling, so the preview pixel-matches the real terminal output. */
window.SBC = window.SBC || {};
(function (S) {
  "use strict";

  const SEP_COLOR = "#565f89"; // muted separator tone used by the terminal theme

  /* usage gradient: hsl(120..0, 45%, 55%), identical to grad_rgb() */
  S.gradHex = function (pct) {
    pct = Math.max(0, Math.min(100, pct));
    const h = 120 * (1 - pct / 100), s = 0.45, l = 0.55;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const hx = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return "#" + hx(r) + hx(g) + hx(b);
  };

  /* final on-screen color of a segment, honoring gradient > palette > legacy */
  S.colorFor = function (id, state) {
    if (S.GRAD.has(id)) return S.gradHex(S.gradPct(id));
    const name = state.seg[id].color;
    const pal = S.PALETTES[state.palette] || S.PALETTES.tokyo;
    return pal.colors[name] || pal.colors.default;
  };

  /* sample text for a segment in its current mode/options */
  S.textFor = function (id, state) {
    const seg = S.SEGMAP[id], st = state.seg[id];
    if (seg.modes) {
      const m = seg.modes.find((x) => x[0] === st.mode) || seg.modes[0];
      return typeof m[1] === "function" ? m[1]() : m[1];
    }
    if (typeof seg.sample === "function") return seg.sample(st);
    return seg.sample !== undefined ? seg.sample : "";
  };

  /* ids on a line, in order */
  S.lineIds = function (state, ln) {
    return S.SEG.filter((s) => state.seg[s.id].on && state.seg[s.id].line === ln)
      .sort((a, b) => state.seg[a.id].order - state.seg[b.id].order)
      .map((s) => s.id);
  };

  /* one styled segment span (shared by terminal, dock pills, panel pills) */
  S.segSpan = function (id, state, opts) {
    const seg = S.SEGMAP[id], st = state.seg[id];
    const span = document.createElement("span");
    span.className = "pseg";
    span.dataset.seg = id;
    let txt = S.textFor(id, state);
    if (state.emoji && seg.emoji) txt = seg.emoji + " " + txt;
    span.textContent = txt;
    const em = S.EMPH[st.emph] || S.EMPH.bold;
    span.style.color = S.colorFor(id, state);
    span.style.fontWeight = em.w;
    span.style.opacity = em.o;
    if (seg.link) span.style.textDecoration = "underline";
    if (opts && opts.title) span.title = seg.name;
    return span;
  };

  /* render the full status line(s) into the terminal element */
  S.renderTerminal = function (termEl, state) {
    termEl.textContent = "";
    const pad = " ".repeat(Math.max(0, state.padding | 0));
    let any = false;
    [1, 2].forEach((ln) => {
      const ids = S.lineIds(state, ln);
      if (!ids.length) return;
      any = true;
      const line = document.createElement("div");
      line.className = "term-line";
      if (pad) line.appendChild(document.createTextNode(pad));
      let first = true, prevPlain = false;
      ids.forEach((id) => {
        const seg = S.SEGMAP[id];
        if (!first && !seg.plain && !prevPlain) {
          const sp = document.createElement("span");
          sp.className = "psep";
          sp.style.color = SEP_COLOR;
          sp.textContent = state.separator;
          line.appendChild(sp);
        }
        first = false;
        prevPlain = !!seg.plain;
        line.appendChild(S.segSpan(id, state, { title: true }));
      });
      if (ln === 1) {
        line.appendChild(document.createTextNode(" "));
        const cur = document.createElement("span");
        cur.className = "term-cursor";
        cur.textContent = " ";
        line.appendChild(cur);
      }
      termEl.appendChild(line);
    });
    if (!any) {
      const empty = document.createElement("div");
      empty.className = "term-empty";
      empty.textContent = "Nothing selected yet. Turn on a field from any card, or pick a preset.";
      termEl.appendChild(empty);
    }
  };

  /* tiny single-segment pill (detail panel, card previews) */
  S.segPill = function (id, state) {
    const pill = document.createElement("span");
    pill.className = "seg-pill";
    pill.appendChild(S.segSpan(id, state));
    return pill;
  };
})(window.SBC);
