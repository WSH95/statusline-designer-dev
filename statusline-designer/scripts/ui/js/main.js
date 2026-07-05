/* Status Bar Composer - application state, card faces, dock, panel, actions.
   State shape and the exported choice.json match the v3 designer exactly, so
   generate.py / apply_settings.py consume it unchanged; palette + clock are
   strictly additive. */
window.SBC = window.SBC || {};
(function (S) {
  "use strict";

  S.BOOT = window.BOOT && typeof window.BOOT === "object" ? window.BOOT : {};

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  /* per-card accent tints (icon badge + focus identity) */
  const TINT = {
    directory: "#3b82f6", model: "#a855f7", effortthink: "#8b5cf6", context: "#10b981",
    lim5h: "#22c55e", lim7d: "#3b82f6", git: "#f59e0b", github: "#64748b",
    cost: "#eab308", tokens: "#06b6d4", session: "#8e8e93", identity: "#34c759",
    clock: "#ff9f0a", theme: "#ec4899", layout: "#6b7280",
  };

  /* ---------- state ---------- */
  const state = { seg: {}, separator: " ", emoji: true, padding: 0, refresh: "auto", palette: "tokyo" };
  S.state = state;

  const defaultsFor = (seg) => ({
    on: !!seg.on, line: seg.line || 1, order: 0,
    color: seg.color, emph: seg.emph || "bold",
    mode: seg.modes ? seg.modes[0][0] : null,
    bar: !!seg.bar, reset: !!seg.reset,
  });

  function resetState() {
    S.SEG.forEach((s) => { state.seg[s.id] = defaultsFor(s); });
    state.separator = " "; state.emoji = true; state.padding = 0;
    state.refresh = "auto"; state.palette = "tokyo";
    normalizeOrders();
  }

  /* hydrate from an applied layout (legacy v3 or v4 with palette) */
  function hydrate(applied) {
    resetState();
    if (!applied || !Array.isArray(applied.segments)) return;
    S.SEG.forEach((s) => { state.seg[s.id].on = false; });
    applied.segments.forEach((a) => {
      const st = state.seg[a.id];
      if (!st) return;
      st.on = true;
      st.line = a.line === 2 ? 2 : 1;
      st.order = a.order || 0;
      if (a.mode != null) st.mode = a.mode;
      st.bar = !!a.bar; st.reset = !!a.reset;
      if (a.color && S.COLORS[a.color]) st.color = a.color;
      if (a.emph && S.EMPH[a.emph]) st.emph = a.emph;
    });
    if (applied.separator != null) state.separator = applied.separator;
    state.emoji = !!applied.emoji;
    if (applied.settings) {
      state.padding = applied.settings.padding || 0;
      const ri = applied.settings.refreshInterval;
      state.refresh = [0, 1, 2, 5].indexOf(ri) >= 0 ? ri : "auto";
    }
    if (applied.palette && S.PALETTES[applied.palette]) state.palette = applied.palette;
    normalizeOrders();
  }

  function normalizeOrders() {
    [1, 2].forEach((ln) => {
      S.SEG.filter((s) => state.seg[s.id].on && state.seg[s.id].line === ln)
        .sort((a, b) => state.seg[a.id].order - state.seg[b.id].order)
        .forEach((s, i) => { state.seg[s.id].order = i; });
    });
  }

  function applyPreset(p) {
    resetState();
    S.SEG.forEach((s) => { state.seg[s.id].on = false; });
    const counts = { 1: 0, 2: 0 };
    p.segs.forEach(([id, line, over]) => {
      const st = state.seg[id];
      if (!st) return;
      st.on = true; st.line = line; st.order = counts[line]++;
      Object.assign(st, over || {});
    });
    state.separator = p.sep != null ? p.sep : " ";
    state.emoji = !!p.emoji;
  }

  /* ---------- choice.json (the contract) ---------- */
  function autoRefresh() {
    const clockSec = state.seg.clock.on && /\+s$/.test(state.seg.clock.mode || "");
    if (clockSec) return 1;
    return S.SEG.some((s) => s.live && state.seg[s.id].on) ? 2 : 0;
  }

  function buildChoice() {
    const pal = S.PALETTES[state.palette];
    const segments = S.SEG.filter((s) => state.seg[s.id].on).map((s) => {
      const st = state.seg[s.id];
      const seg = {
        id: s.id, line: st.line, order: st.order || 0, mode: st.mode,
        bar: st.bar, reset: st.reset,
        color: st.color, colorCode: S.COLORS[st.color].c,
        emph: st.emph, emphCode: S.EMPH[st.emph].c,
      };
      if (!pal.legacy) seg.colorHex = pal.colors[st.color] || pal.colors.default;
      return seg;
    }).sort((a, b) => a.line - b.line || a.order - b.order);
    const choice = {
      separator: state.separator,
      emoji: state.emoji,
      settings: {
        padding: +state.padding || 0,
        refreshInterval: state.refresh === "auto" ? autoRefresh() : +state.refresh,
        hideVimMode: state.seg.vim.on,
      },
      segments,
    };
    if (!pal.legacy) choice.palette = state.palette;
    return choice;
  }

  /* ---------- small control builders ---------- */
  function mkSwitch(checked, cls, label, onchange) {
    const w = el("label", "switch" + (cls ? " " + cls : ""));
    const i = document.createElement("input");
    i.type = "checkbox"; i.checked = checked; i.setAttribute("role", "switch");
    if (label) i.setAttribute("aria-label", label);
    i.addEventListener("change", () => onchange(i.checked));
    w.appendChild(i); w.appendChild(el("span", "knob"));
    return w;
  }

  function mkSegmented(options, value, label, onpick) {
    const g = el("div", "segmented");
    g.setAttribute("role", "group");
    if (label) g.setAttribute("aria-label", label);
    options.forEach(([v, name]) => {
      const b = el("button", null, name);
      b.type = "button";
      b.dataset.v = v;
      b.setAttribute("aria-pressed", String(v === value));
      b.addEventListener("click", () => {
        g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        onpick(v);
      });
      g.appendChild(b);
    });
    return g;
  }

  function mkSelect(options, value, label, onchange) {
    const s = el("select", "mini-select");
    if (label) s.setAttribute("aria-label", label);
    options.forEach(([v, name]) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = name;
      s.appendChild(o);
    });
    s.value = value;
    s.addEventListener("change", () => onchange(s.value));
    return s;
  }

  function mkSwatch(segId, small) {
    const b = el("button", "swatch" + (small ? " sm" : ""));
    b.type = "button";
    b.dataset.swatch = segId;
    const grad = S.GRAD.has(segId);
    b.setAttribute("aria-label", (grad ? "Usage-colored field: " : "Color for ") + S.SEGMAP[segId].name);
    if (grad) { b.classList.add("auto"); b.title = "Colors itself by usage: green when ample, red when critical"; }
    else b.addEventListener("click", () => openColorPicker(b, segId));
    return b;
  }

  function paintSwatches() {
    document.querySelectorAll(".swatch[data-swatch]").forEach((b) => {
      const id = b.dataset.swatch;
      if (S.GRAD.has(id)) return;
      b.style.setProperty("--sw", S.colorFor(id, state));
    });
  }

  /* ---------- card faces ---------- */
  function heroFor(card) {
    return card.segs.map((id) => S.SEGMAP[id]).find((s) => s.hero);
  }

  function buildCardFace(cardEl, card) {
    cardEl.innerHTML = "";
    cardEl.style.setProperty("--ci", TINT[card.id] || "#0a84ff");
    cardEl.dataset.card = card.id;

    const head = el("div", "card-head");
    head.appendChild(el("span", "card-icon", S.ICONS[card.icon] || ""));
    head.appendChild(el("span", "card-title", card.name));
    const hero = card.kind === "fields" ? heroFor(card) : null;
    if (hero) {
      head.appendChild(mkSwitch(state.seg[hero.id].on, "", card.name + " on or off", (v) => {
        state.seg[hero.id].on = v; touchOrder(hero.id); syncCard(card); render();
      }));
    }
    cardEl.appendChild(head);

    const body = el("div", "card-body");
    cardEl.appendChild(body);

    if (card.kind === "theme") return buildThemeFace(body);
    if (card.kind === "layout") return buildLayoutFace(body);

    if (hero) buildHeroBlock(body, card, hero);
    card.segs.forEach((id) => {
      const seg = S.SEGMAP[id];
      if (hero && id === hero.id) return;
      body.appendChild(buildSegRow(card, seg));
    });
    const foot = el("div", "card-foot");
    foot.dataset.cardFoot = card.id;
    body.appendChild(foot);
  }

  function buildHeroBlock(body, card, seg) {
    const st = state.seg[seg.id];
    const wrap = el("div", "hero");
    wrap.dataset.hero = seg.id;

    if (S.GRAD.has(seg.id)) {
      wrap.appendChild(el("div", "hero-label", "Display"));
      const val = !st.on ? "off" : st.bar ? "bar" : "pct";
      wrap.appendChild(mkSegmented([["off", "Off"], ["pct", "Percent"], ["bar", "Bar"]], val, seg.name + " display", (v) => {
        if (v === "off") st.on = false;
        else { st.on = true; st.bar = v === "bar"; touchOrder(seg.id); }
        syncCard(card); render();
      }));
      if (seg.reset !== undefined && seg.id !== "ctxpct") {
        const opt = el("div", "opt-row");
        opt.appendChild(el("span", null, "Show time to reset"));
        opt.appendChild(mkSwitch(st.reset, "sm", "Show time to reset", (v) => { st.reset = v; render(); }));
        wrap.appendChild(opt);
      }
      if (card.scrub || seg.id === "ctxpct") {
        const key = card.scrub || "ctx";
        const sc = el("div", "scrub");
        const range = document.createElement("input");
        range.type = "range"; range.min = 0; range.max = 100; range.value = S.sample[key];
        range.setAttribute("aria-label", "Simulate " + seg.name + " usage");
        const val2 = el("span", "scrub-val", S.sample[key] + "%");
        range.addEventListener("input", () => { S.sample[key] = +range.value; val2.textContent = range.value + "%"; render(); });
        sc.appendChild(range); sc.appendChild(val2);
        wrap.appendChild(el("div", "hero-label", "Try a usage level"));
        wrap.appendChild(sc);
      }
    } else if (seg.id === "clock") {
      wrap.appendChild(el("div", "hero-label", "Format"));
      const base = (st.mode || "24h").replace("+s", "");
      wrap.appendChild(mkSegmented([["24h", "24-hour"], ["12h", "12-hour"]], base, "Clock format", (v) => {
        state.seg.clock.mode = v + (/\+s$/.test(state.seg.clock.mode || "") ? "+s" : "");
        render();
      }));
      const opt = el("div", "opt-row");
      opt.appendChild(el("span", null, "Show seconds"));
      opt.appendChild(mkSwitch(/\+s$/.test(st.mode || ""), "sm", "Show seconds", (v) => {
        state.seg.clock.mode = (state.seg.clock.mode || "24h").replace("+s", "") + (v ? "+s" : "");
        render();
      }));
      wrap.appendChild(opt);
      wrap.appendChild(colorRow(seg.id));
    } else if (seg.modes) {
      wrap.appendChild(el("div", "hero-label", seg.id === "cwd" ? "Show as" : "Show"));
      wrap.appendChild(mkSegmented(seg.modes.map((m) => [m[0], m[0]]), st.mode, seg.name + " format", (v) => {
        st.mode = v; render();
      }));
      wrap.appendChild(colorRow(seg.id));
    }

    body.appendChild(wrap);
  }

  function colorRow(segId) {
    const opt = el("div", "opt-row");
    opt.appendChild(el("span", null, "Color"));
    opt.appendChild(mkSwatch(segId));
    return opt;
  }

  function buildSegRow(card, seg) {
    const st = state.seg[seg.id];
    const row = el("div", "seg-row" + (st.on ? "" : " is-off"));
    row.dataset.segRow = seg.id;
    row.appendChild(mkSwitch(st.on, "sm", seg.name + " on or off", (v) => {
      st.on = v; touchOrder(seg.id);
      row.classList.toggle("is-off", !v);
      render();
    }));
    const name = el("span", "rname", seg.name);
    if (seg.contextual) {
      name.appendChild(el("span", "rnote", " ●"));
      name.title = "Appears only when the session has this data";
    }
    row.appendChild(name);
    if (seg.modes) {
      row.appendChild(mkSelect(seg.modes.map((m) => [m[0], m[0]]), st.mode, seg.name + " format", (v) => { st.mode = v; render(); }));
    }
    row.appendChild(mkSwatch(seg.id, true));
    return row;
  }

  function buildThemeFace(body) {
    S.PALETTE_KEYS.forEach((key) => {
      const p = S.PALETTES[key];
      const b = el("button", "pal-row");
      b.type = "button";
      b.dataset.pal = key;
      b.setAttribute("aria-pressed", String(state.palette === key));
      b.appendChild(el("span", null, p.name));
      const dots = el("span", "pal-dots");
      ["blue", "green", "yellow", "red", "magenta"].forEach((c) => {
        const i = el("i");
        i.style.background = p.colors[c];
        dots.appendChild(i);
      });
      b.appendChild(dots);
      b.addEventListener("click", () => {
        state.palette = key;
        body.querySelectorAll(".pal-row").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
      body.appendChild(b);
    });
    body.appendChild(el("div", "rnote", "Fields keep their color roles; the palette retunes every hue."));
  }

  function buildLayoutFace(body) {
    const sepRow = el("div", "form-row");
    sepRow.appendChild(el("span", "fr-label", "Separator"));
    sepRow.appendChild(mkSelect(S.SEPARATORS.map((s) => [s.v, s.label]), state.separator, "Separator between fields", (v) => { state.separator = v; render(); }));
    body.appendChild(sepRow);

    const emRow = el("div", "form-row");
    emRow.appendChild(el("span", "fr-label", "Emoji icons"));
    emRow.appendChild(mkSwitch(state.emoji, "sm", "Emoji icons", (v) => { state.emoji = v; render(); }));
    body.appendChild(emRow);

    const padRow = el("div", "form-row");
    padRow.appendChild(el("span", "fr-label", "Left padding"));
    const stp = el("span", "stepper");
    const dec = el("button", null, "−"); dec.type = "button"; dec.setAttribute("aria-label", "Less padding");
    const val = el("span", "st-val", String(state.padding));
    const inc = el("button", null, "+"); inc.type = "button"; inc.setAttribute("aria-label", "More padding");
    dec.addEventListener("click", () => { state.padding = Math.max(0, state.padding - 1); val.textContent = state.padding; render(); });
    inc.addEventListener("click", () => { state.padding = Math.min(12, state.padding + 1); val.textContent = state.padding; render(); });
    stp.appendChild(dec); stp.appendChild(val); stp.appendChild(inc);
    padRow.appendChild(stp);
    body.appendChild(padRow);

    const rfRow = el("div", "form-row");
    rfRow.appendChild(el("span", "fr-label", "Refresh"));
    rfRow.appendChild(mkSelect([["auto", "auto"], ["0", "off"], ["1", "1s"], ["2", "2s"], ["5", "5s"]], String(state.refresh), "Refresh interval", (v) => {
      state.refresh = v === "auto" ? "auto" : +v; render();
    }));
    body.appendChild(rfRow);

    const note = el("div", "rnote");
    note.dataset.refreshNote = "1";
    body.appendChild(note);
  }

  /* when a segment turns on, put it at the end of its line */
  function touchOrder(id) {
    const st = state.seg[id];
    if (!st.on) { normalizeOrders(); return; }
    st.order = S.SEG.filter((s) => s.id !== id && state.seg[s.id].on && state.seg[s.id].line === st.line).length;
    normalizeOrders();
  }

  /* re-sync one card's controls from state (after preset/hydrate/toggles) */
  function syncCard(card) {
    const cardEl = document.querySelector('.card[data-card="' + card.id + '"]');
    if (cardEl) buildCardFace(cardEl, card);
  }
  function syncAllCards() { S.CARDS.forEach(syncCard); }

  /* ---------- dock ---------- */
  function buildDock() {
    [1, 2].forEach((ln) => {
      const lane = $("lane" + ln);
      lane.textContent = "";
      const ids = S.lineIds(state, ln);
      if (!ids.length) {
        lane.appendChild(el("span", "dock-empty", ln === 1 ? "Drag fields here" : "Empty. Keep it empty for a one-line status."));
        return;
      }
      ids.forEach((id) => {
        const chip = el("span", "chip");
        chip.draggable = true;
        chip.dataset.chip = id;
        chip.setAttribute("title", "Drag to reorder. Click to open its card.");
        const dot = el("span", "chip-dot");
        dot.style.background = S.colorFor(id, state);
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(S.SEGMAP[id].name));
        lane.appendChild(chip);
      });
    });
  }

  let dragChip = null;
  function bindDock() {
    const lanes = [$("lane1"), $("lane2")];
    document.addEventListener("dragstart", (e) => {
      const chip = e.target.closest && e.target.closest(".chip");
      if (!chip) return;
      dragChip = chip;
      chip.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", chip.dataset.chip); } catch (err) {}
    });
    document.addEventListener("dragend", () => {
      if (!dragChip) return;
      dragChip.classList.remove("dragging");
      dragChip = null;
      lanes.forEach((l) => l.classList.remove("over"));
      commitDock();
    });
    lanes.forEach((lane) => {
      lane.addEventListener("dragover", (e) => {
        if (!dragChip) return;
        e.preventDefault();
        lane.classList.add("over");
        const after = chipAfter(lane, e.clientX);
        const ph = lane.querySelector(".dock-empty");
        if (ph) ph.remove();
        if (after == null) lane.appendChild(dragChip);
        else lane.insertBefore(dragChip, after);
      });
      lane.addEventListener("dragleave", (e) => { if (!lane.contains(e.relatedTarget)) lane.classList.remove("over"); });
      lane.addEventListener("drop", (e) => { e.preventDefault(); lane.classList.remove("over"); });
      lane.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (chip) focusSeg(chip.dataset.chip);
      });
    });
  }

  function chipAfter(lane, x) {
    const chips = Array.from(lane.querySelectorAll(".chip:not(.dragging)"));
    let best = null, bestOff = -Infinity;
    chips.forEach((c) => {
      const b = c.getBoundingClientRect();
      const off = x - b.left - b.width / 2;
      if (off < 0 && off > bestOff) { bestOff = off; best = c; }
    });
    return best;
  }

  function commitDock() {
    [1, 2].forEach((ln) => {
      Array.from($("lane" + ln).querySelectorAll(".chip")).forEach((c, i) => {
        state.seg[c.dataset.chip].line = ln;
        state.seg[c.dataset.chip].order = i;
      });
    });
    render();
  }

  /* ---------- detail panel ---------- */
  let focusedCard = 0;

  function buildPanel() {
    const card = S.CARDS[focusedCard];
    $("panelIcon").innerHTML = S.ICONS[card.icon] || "";
    $("panelIcon").style.setProperty("--ci", TINT[card.id] || "#0a84ff");
    $("panelName").textContent = card.name;
    $("panelBlurb").textContent = card.blurb;
    const wrap = $("panelSegs");
    wrap.textContent = "";
    if (card.kind !== "fields") {
      const note = el("p", "panel-note", card.kind === "theme"
        ? "Palettes retint the whole line at once. Tokyo Night is the classic look; the others bake their exact colors into the generated script."
        : "These settings shape the whole line: the separator drawn between fields, emoji icons, left padding, and how often the terminal re-runs the script.");
      wrap.appendChild(note);
      return;
    }
    card.segs.forEach((id) => wrap.appendChild(buildPanelRow(id)));
  }

  function buildPanelRow(id) {
    const seg = S.SEGMAP[id], st = state.seg[id];
    const row = el("div", "prow" + (st.on ? "" : " is-off"));
    row.dataset.prow = id;
    row.appendChild(mkSwitch(st.on, "sm", seg.name + " visible in the status line", (v) => {
      st.on = v; touchOrder(id);
      syncCard(S.CARDMAP[seg.card]);
      render();
    }));
    row.appendChild(el("span", "pname", seg.name));

    const lineSeg = mkSegmented([["1", "1"], ["2", "2"]], String(st.line), seg.name + " line", (v) => {
      st.line = +v;
      touchOrder(id);
      render();
    });
    lineSeg.classList.add("line-seg");
    row.appendChild(lineSeg);

    const stp = el("span", "stepper");
    const dec = el("button", null, "‹"); dec.type = "button"; dec.setAttribute("aria-label", "Move " + seg.name + " earlier");
    const pos = el("span", "st-val");
    const inc = el("button", null, "›"); inc.type = "button"; inc.setAttribute("aria-label", "Move " + seg.name + " later");
    const ids = () => S.lineIds(state, st.line);
    const setPos = () => {
      const list = ids();
      pos.textContent = st.on ? (list.indexOf(id) + 1) + " of " + list.length : "-";
    };
    setPos();
    const move = (dir) => {
      const list = ids();
      const i = list.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      state.seg[list[j]].order = i;
      st.order = j;
      render();
    };
    dec.addEventListener("click", () => move(-1));
    inc.addEventListener("click", () => move(1));
    stp.appendChild(dec); stp.appendChild(pos); stp.appendChild(inc);
    row.appendChild(stp);

    row.appendChild(mkSelect([["bold", "bold"], ["normal", "normal"], ["dim", "dim"]], st.emph, seg.name + " weight", (v) => {
      st.emph = v; render();
    }));

    const pill = el("span", "seg-pill");
    pill.dataset.pill = id;
    row.appendChild(pill);
    return row;
  }

  /* ---------- popovers ---------- */
  const pop = $("popover"), scrim = $("scrim");
  function openPopover(anchor, content) {
    pop.textContent = "";
    pop.appendChild(content);
    pop.hidden = false; scrim.hidden = false;
    const a = anchor.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    let x = Math.min(Math.max(8, a.left + a.width / 2 - p.width / 2), innerWidth - p.width - 8);
    let y = a.bottom + 8;
    if (y + p.height > innerHeight - 8) y = a.top - p.height - 8;
    pop.style.left = x + "px";
    pop.style.top = Math.max(8, y) + "px";
    const first = pop.querySelector("button, input, select");
    if (first) first.focus({ preventScroll: true });
  }
  function closePopover() { pop.hidden = true; scrim.hidden = true; }
  scrim.addEventListener("click", closePopover);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePopover(); closeMenu(); } });

  function openColorPicker(anchor, segId) {
    const wrap = el("div");
    wrap.appendChild(el("div", "pop-title", "Color for " + S.SEGMAP[segId].name));
    const grid = el("div", "color-grid");
    grid.setAttribute("role", "group");
    S.COLOR_KEYS.forEach((key) => {
      const b = el("button", "swatch");
      b.type = "button";
      b.style.setProperty("--sw", (S.PALETTES[state.palette] || S.PALETTES.tokyo).colors[key]);
      b.setAttribute("aria-label", key);
      b.setAttribute("aria-pressed", String(state.seg[segId].color === key));
      b.title = key;
      b.addEventListener("click", () => {
        state.seg[segId].color = key;
        closePopover();
        render();
      });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    openPopover(anchor, wrap);
  }

  function openResetConfirm(anchor) {
    const wrap = el("div");
    wrap.appendChild(el("div", "pop-title", "Start over?"));
    wrap.appendChild(el("p", "panel-note", "Every field, color, and setting returns to its default."));
    const row = el("div", null);
    row.style.cssText = "display:flex;gap:8px;margin-top:10px;justify-content:flex-end";
    const cancel = el("button", "soft-btn", "Cancel"); cancel.type = "button";
    const ok = el("button", "primary-btn", "Reset"); ok.type = "button";
    cancel.addEventListener("click", closePopover);
    ok.addEventListener("click", () => {
      closePopover();
      resetState();
      syncAllCards();
      buildPanel();
      render();
    });
    row.appendChild(cancel); row.appendChild(ok);
    wrap.appendChild(row);
    openPopover(anchor, wrap);
  }

  function openHelp(anchor) {
    const wrap = el("div");
    wrap.appendChild(el("div", "pop-title", "Getting around"));
    const list = el("div", "help-list");
    [
      ["Rotate the ring", "drag, or <kbd>←</kbd> <kbd>→</kbd>"],
      ["Focus a card", "click it, or a dot"],
      ["Jump to a field's card", "click it in the preview"],
      ["Reorder fields", "drag the chips below the preview"],
      ["Line 2", "set per field in the bottom panel"],
    ].forEach(([k, v]) => {
      const d = el("div");
      d.appendChild(el("span", null, k));
      d.insertAdjacentHTML("beforeend", "<b>" + v + "</b>");
      list.appendChild(d);
    });
    wrap.appendChild(list);
    openPopover(anchor, wrap);
  }

  /* ---------- presets menu ---------- */
  const menu = $("presetsMenu"), presetsBtn = $("presetsBtn");
  function buildMenu() {
    menu.textContent = "";
    if (S.BOOT.applied) {
      const b = el("button", "menu-item", "Current status line");
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.addEventListener("click", () => { pickPreset(null); });
      menu.appendChild(b);
      menu.appendChild(el("div", "menu-sep"));
    }
    S.PRESETS.forEach((p) => {
      const b = el("button", "menu-item", p.name + '<span class="mi-sub">' + p.segs.length + " fields</span>");
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.addEventListener("click", () => pickPreset(p));
      menu.appendChild(b);
    });
  }
  function pickPreset(p) {
    closeMenu();
    if (p) applyPreset(p); else hydrate(S.BOOT.applied);
    syncAllCards();
    buildPanel();
    render();
  }
  function openMenu() {
    menu.hidden = false;
    presetsBtn.setAttribute("aria-expanded", "true");
    scrim.hidden = false;
  }
  function closeMenu() {
    menu.hidden = true;
    presetsBtn.setAttribute("aria-expanded", "false");
    if (pop.hidden) scrim.hidden = true;
  }
  presetsBtn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
  scrim.addEventListener("click", closeMenu);

  /* ---------- top-level actions ---------- */
  function bindActions() {
    $("helpBtn").innerHTML = S.ICONS.help;
    $("prevBtn").innerHTML = S.ICONS.chevL;
    $("nextBtn").innerHTML = S.ICONS.chevR;
    document.querySelectorAll(".btn-ic").forEach((b) => { b.innerHTML = S.ICONS[b.dataset.icon] || ""; });
    setThemeIcon();

    $("helpBtn").addEventListener("click", (e) => openHelp(e.currentTarget));
    $("resetBtn").addEventListener("click", (e) => openResetConfirm(e.currentTarget));
    $("themeBtn").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = cur;
      try { localStorage.setItem("sbc-theme", cur); } catch (err) {}
      setThemeIcon();
    });
    $("prevBtn").addEventListener("click", () => S.ring.prev());
    $("nextBtn").addEventListener("click", () => S.ring.next());

    $("exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(buildChoice(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "statusline-design.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    });

    $("applyBtn").addEventListener("click", async () => {
      const btn = $("applyBtn"), status = $("applyStatus");
      btn.disabled = true;
      status.textContent = "Applying…";
      try {
        const res = await fetch("/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildChoice()),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        status.innerHTML = '<span class="ok">Applied.</span> Switch back to your terminal.';
      } catch (err) {
        status.textContent = "Could not apply: " + err.message + ". Try again.";
        btn.disabled = false;
        return;
      }
      setTimeout(() => { btn.disabled = false; }, 1200);
    });

    // click a preview segment -> rotate to its card
    $("termStatus").addEventListener("click", (e) => {
      const seg = e.target.closest(".pseg");
      if (seg) focusSeg(seg.dataset.seg);
    });
  }

  function setThemeIcon() {
    $("themeBtn").innerHTML = document.documentElement.dataset.theme === "dark" ? S.ICONS.sun : S.ICONS.moon;
  }

  function focusSeg(id) {
    const card = S.CARDMAP[S.SEGMAP[id].card];
    S.ring.goTo(card.index);
  }

  /* ---------- dots ---------- */
  function buildDots() {
    const dots = $("dots");
    S.CARDS.forEach((c, i) => {
      const d = el("button", "dot");
      d.type = "button";
      d.setAttribute("aria-label", c.name);
      d.setAttribute("aria-pressed", "false");
      d.title = c.name;
      d.addEventListener("click", () => S.ring.goTo(i));
      dots.appendChild(d);
    });
  }
  function syncDots() {
    Array.from($("dots").children).forEach((d, i) => d.setAttribute("aria-pressed", String(i === focusedCard)));
  }

  /* ---------- render ---------- */
  function render() {
    S.renderTerminal($("termStatus"), state);
    highlightFocused();
    buildDock();
    paintSwatches();
    updateHeroPreviews();
    updatePanelDynamic();
    updateRefreshNote();
  }

  function highlightFocused() {
    const cardId = S.CARDS[focusedCard].id;
    $("termStatus").querySelectorAll(".pseg").forEach((p) => {
      p.classList.toggle("is-hi", S.SEGMAP[p.dataset.seg].card === cardId);
    });
  }

  function updateHeroPreviews() {
    document.querySelectorAll("[data-card-foot]").forEach((foot) => {
      const card = S.CARDMAP[foot.dataset.cardFoot];
      const ids = card.segs.filter((id) => state.seg[id].on);
      foot.textContent = "";
      ids.forEach((id, i) => {
        if (i) {
          const sp = el("span", "psep");
          sp.textContent = " · ";
          foot.appendChild(sp);
        }
        foot.appendChild(S.segSpan(id, state));
      });
    });
  }

  function updatePanelDynamic() {
    document.querySelectorAll("[data-prow]").forEach((row) => {
      const id = row.dataset.prow, st = state.seg[id];
      row.classList.toggle("is-off", !st.on);
      const pill = row.querySelector("[data-pill]");
      if (pill) {
        pill.textContent = "";
        if (st.on) pill.appendChild(S.segSpan(id, state));
        else { const off = el("span"); off.textContent = "hidden"; off.style.color = "#565f89"; pill.appendChild(off); }
      }
      const pos = row.querySelector(".st-val");
      if (pos) {
        const list = S.lineIds(state, st.line);
        pos.textContent = st.on ? (list.indexOf(id) + 1) + " of " + list.length : "-";
      }
    });
  }

  function updateRefreshNote() {
    const note = document.querySelector("[data-refresh-note]");
    if (!note) return;
    if (state.refresh === "auto") {
      const r = autoRefresh();
      note.textContent = r ? "Auto picks " + r + "s: live fields are on." : "Auto picks off: nothing here needs a timer.";
    } else note.textContent = "";
  }

  /* ---------- clock tick ---------- */
  setInterval(() => {
    if (!state.seg.clock || !state.seg.clock.on) return;
    const span = $("termStatus").querySelector('.pseg[data-seg="clock"]');
    if (span) {
      let txt = S.textFor("clock", state);
      if (state.emoji) txt = "🕐 " + txt;
      span.textContent = txt;
    }
    const pv = document.querySelector('[data-hero-preview="clock"] .pseg');
    if (pv) pv.textContent = S.textFor("clock", state);
  }, 1000);

  /* ---------- boot ---------- */
  function boot() {
    // terminal chrome text from the real environment
    const B = S.BOOT;
    $("termTitle").textContent = (B.cwd && B.cwd.tilde) || "~";
    $("termPrompt").innerHTML = "";
    $("termPrompt").appendChild(document.createTextNode((B.user || "you") + "@" + (B.host || "mac") + " "));
    const p = el("span", "tp-accent", null);
    p.textContent = (B.cwd && B.cwd.tilde) || "~";
    $("termPrompt").appendChild(p);
    $("termPrompt").appendChild(document.createTextNode(" %"));

    hydrate(S.BOOT.applied);

    // deep link: #card=<index|id>&theme=dark|light (also used by headless QA)
    const hash = {};
    location.hash.slice(1).split("&").forEach((kv) => {
      const i = kv.indexOf("=");
      if (i > 0) hash[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    if (hash.theme === "dark" || hash.theme === "light") document.documentElement.dataset.theme = hash.theme;
    if (hash.preset) {
      const p = S.PRESETS.find((x) => x.id === hash.preset);
      if (p) applyPreset(p);
    }
    if (hash.palette && S.PALETTES[hash.palette]) state.palette = hash.palette;
    let start = 0;
    if (hash.card != null) {
      const byId = S.CARDMAP[hash.card];
      start = byId ? byId.index : Math.max(0, Math.min(S.CARDS.length - 1, parseInt(hash.card, 10) || 0));
    }

    // card shells for the ring, faces built from state
    const ringEl = $("ring");
    S.CARDS.forEach((card) => {
      const shell = el("article", "card");
      shell.setAttribute("aria-label", card.name + " card");
      ringEl.appendChild(shell);
      buildCardFace(shell, card);
    });

    buildDots();
    buildMenu();
    bindActions();
    bindDock();

    S.ring.init({
      start: start,
      onFocus: (i) => {
        focusedCard = i;
        syncDots();
        buildPanel();
        render();
      },
    });
    render();

    // headless QA: #debug=1 appends live geometry numbers to the DOM
    if (hash.debug != null) {
      (() => {
        const ringN = $("ring"), sceneN = $("scene"), stageN = $("stage");
        const winN = document.querySelector(".window");
        const meas = () => {
          const a = ringN.children[0].getBoundingClientRect();
          const b = ringN.children[1].getBoundingClientRect();
          return "c0 x" + Math.round(a.x) + " w" + Math.round(a.width) + " | c1 x" + Math.round(b.x) + " w" + Math.round(b.width);
        };
        void sceneN; void stageN; void winN;
        const out = { w: innerWidth, cards: meas(), choice: buildChoice() };
        const dbg = el("pre");
        dbg.id = "dbg";
        dbg.textContent = JSON.stringify(out, null, 1);
        document.body.appendChild(dbg);
      })();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})(window.SBC);
