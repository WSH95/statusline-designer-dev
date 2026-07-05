/* Status Bar Composer — data catalog.
   Segment definitions mirror generate.py exactly: every id, mode, flag and color
   here has a counterpart in the generator, so what the preview shows is what the
   terminal gets. */
window.SBC = window.SBC || {};
(function (S) {
  "use strict";

  /* ---- colors ---------------------------------------------------------- */
  // Named ANSI-ish colors; hex values are the Tokyo Night set from generate.py
  // COLORS_HEX (pre-desaturation), c = classic SGR code kept for compatibility.
  S.COLORS = {
    default:       { hex: "#c0caf5", c: 39 },
    gray:          { hex: "#7a83a6", c: 90 },
    white:         { hex: "#ffffff", c: 37 },
    red:           { hex: "#f7768e", c: 31 },
    green:         { hex: "#9ece6a", c: 32 },
    yellow:        { hex: "#e0af68", c: 33 },
    blue:          { hex: "#7aa2f7", c: 34 },
    magenta:       { hex: "#bb9af7", c: 35 },
    cyan:          { hex: "#7dcfff", c: 36 },
    brightred:     { hex: "#ff7a93", c: 91 },
    brightgreen:   { hex: "#b9f27c", c: 92 },
    brightyellow:  { hex: "#ffd479", c: 93 },
    brightblue:    { hex: "#9db8ff", c: 94 },
    brightmagenta: { hex: "#d2a8ff", c: 95 },
    brightcyan:    { hex: "#a4e8ff", c: 96 },
  };
  S.COLOR_KEYS = Object.keys(S.COLORS);

  // generate.py mixes each color toward its own luma (k=0.4) before printing.
  S.desat = function (hex, k) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const y = 0.3 * r + 0.59 * g + 0.11 * b;
    const h2 = (v) => Math.round(v + (y - v) * k).toString(16).padStart(2, "0");
    return "#" + h2(r) + h2(g) + h2(b);
  };

  /* ---- palettes --------------------------------------------------------- */
  // "tokyo" is the legacy path: named colors, desaturated by the generator itself
  // (no colorHex in choice.json, so old layouts render byte-identically).
  // Other palettes bake pre-tuned colorHex values into choice.json verbatim.
  S.PALETTES = {
    tokyo: {
      name: "Tokyo Night", legacy: true,
      colors: Object.fromEntries(S.COLOR_KEYS.map((k) => [k, S.desat(S.COLORS[k].hex, 0.4)])),
    },
    dracula: {
      name: "Dracula",
      colors: {
        default: "#f8f8f2", gray: "#6272a4", white: "#ffffff",
        red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c", blue: "#bd93f9",
        magenta: "#ff79c6", cyan: "#8be9fd", brightred: "#ff6e6e", brightgreen: "#69ff94",
        brightyellow: "#ffffa5", brightblue: "#d6acff", brightmagenta: "#ff92df", brightcyan: "#a4ffff",
      },
    },
    nord: {
      name: "Nord",
      colors: {
        default: "#d8dee9", gray: "#616e88", white: "#eceff4",
        red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b", blue: "#81a1c1",
        magenta: "#b48ead", cyan: "#88c0d0", brightred: "#d08770", brightgreen: "#b8d09b",
        brightyellow: "#f0d399", brightblue: "#5e81ac", brightmagenta: "#c895bf", brightcyan: "#8fbcbb",
      },
    },
    catppuccin: {
      name: "Catppuccin Mocha",
      colors: {
        default: "#cdd6f4", gray: "#7f849c", white: "#f5f5f7",
        red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af", blue: "#89b4fa",
        magenta: "#cba6f7", cyan: "#94e2d5", brightred: "#eba0ac", brightgreen: "#bcefb7",
        brightyellow: "#fab387", brightblue: "#74c7ec", brightmagenta: "#f5c2e7", brightcyan: "#89dceb",
      },
    },
  };
  S.PALETTE_KEYS = Object.keys(S.PALETTES);

  /* ---- emphasis --------------------------------------------------------- */
  S.EMPH = {
    bold:   { w: 700, o: 1,    c: 1 },
    normal: { w: 400, o: 1,    c: 0 },
    dim:    { w: 400, o: 0.55, c: 2 },
  };

  /* ---- scrubbable sample data ------------------------------------------ */
  // The preview renders these; usage scrubbers on the gauge cards adjust them
  // so the green-to-red gradient can be explored. Never exported.
  S.sample = { ctx: 24, lim5h: 62, lim7d: 28, reset5h: "2h11m", reset7d: "3d4h" };

  S.GRAD = new Set(["ctxpct", "lim5h", "lim7d"]);
  S.gradPct = (id) => (id === "ctxpct" ? S.sample.ctx : id === "lim5h" ? S.sample.lim5h : id === "lim7d" ? S.sample.lim7d : 0);

  /* ---- segment catalog --------------------------------------------------
     One entry per field the generator understands. `card` groups segments onto
     composer cards; everything else matches the v3 designer semantics. */
  const B = () => S.BOOT || { user: "user", host: "host", cwd: { tilde: "~/project", base: "project", full: "/home/user/project" }, model: { ver: "Opus 4.8", name: "Opus 4.8", id: "claude-opus-4-8" } };
  const bar10 = (pct) => { const f = Math.max(0, Math.min(10, Math.round(pct / 10))); return "█".repeat(f) + "░".repeat(10 - f); };

  S.SEG = [
    // ---- Directory ----
    { id: "cwd", card: "directory", name: "Working dir", ds: "workspace.current_dir", color: "blue", on: true, line: 1, emoji: "📁", hero: true,
      modes: [["~", () => B().cwd.tilde], ["basename", () => B().cwd.base], ["full", () => B().cwd.full]] },
    { id: "projectdir", card: "directory", name: "Project dir", ds: "workspace.project_dir", color: "blue", on: false, line: 1, emoji: "📂",
      sample: () => B().cwd.base },
    { id: "addeddirs", card: "directory", name: "Added dirs", ds: "workspace.added_dirs", color: "blue", on: false, line: 1, contextual: true, sample: () => "+2 dirs" },

    // ---- Model ----
    { id: "model", card: "model", name: "Model", ds: "model.display_name / id", color: "magenta", on: true, line: 1, hero: true,
      modes: [["version", () => B().model.ver], ["name", () => B().model.name], ["id", () => B().model.id]] },
    { id: "fastmode", card: "model", name: "Fast mode", ds: "fast_mode", color: "brightyellow", on: false, line: 2, contextual: true, emoji: "⚡", sample: () => "fast" },

    // ---- Effort & Thinking ----
    { id: "effort", card: "effortthink", name: "Effort level", ds: "effort.level", color: "magenta", on: false, line: 2, contextual: true, sample: () => "max" },
    { id: "thinking", card: "effortthink", name: "Thinking", ds: "thinking.enabled", color: "magenta", on: false, line: 2, contextual: true, emoji: "🧠", sample: () => "on" },

    // ---- Context window ----
    { id: "ctxpct", card: "context", name: "Context used", ds: "context_window.used_percentage", color: "green", on: false, line: 2, bar: true, hero: true,
      sample: (st) => (st.bar ? bar10(S.sample.ctx) + " " + S.sample.ctx + "%" : S.sample.ctx + "% ctx") },
    { id: "ctxremain", card: "context", name: "Context left", ds: "context_window.remaining_percentage", color: "green", on: false, line: 2,
      sample: () => (100 - S.sample.ctx) + "% left" },
    { id: "ctxtokens", card: "context", name: "Context tokens", ds: "total_input / window size", color: "cyan", on: false, line: 2, sample: () => "48k/200k" },
    { id: "exceeds", card: "context", name: "200k+ flag", ds: "exceeds_200k_tokens", color: "red", on: false, line: 1, contextual: true, sample: () => "⚠ 200k+" },

    // ---- 5-hour limit ----
    { id: "lim5h", card: "lim5h", name: "5-hour tokens", ds: "rate_limits.five_hour", color: "yellow", on: false, line: 2, bar: true, contextual: true, reset: true, live: true, hero: true,
      sample: (st) => "5h " + (st.bar ? bar10(S.sample.lim5h) + " " : "") + Math.round(S.sample.lim5h) + "%" + (st.reset ? " (" + S.sample.reset5h + ")" : "") },

    // ---- 7-day limit ----
    { id: "lim7d", card: "lim7d", name: "7-day tokens", ds: "rate_limits.seven_day", color: "red", on: false, line: 2, bar: true, contextual: true, reset: true, live: true, hero: true,
      sample: (st) => "7d " + (st.bar ? bar10(S.sample.lim7d) + " " : "") + Math.round(S.sample.lim7d) + "%" + (st.reset ? " (" + S.sample.reset7d + ")" : "") },

    // ---- Git ----
    { id: "gitbranch", card: "git", name: "Branch", ds: "git branch --show-current", color: "yellow", on: false, line: 1, emoji: "🌿", contextual: true, sample: () => "main" },
    { id: "gitstatus", card: "git", name: "Changes", ds: "staged / modified counts", color: "green", on: false, line: 1, contextual: true, sample: () => "+2 ~5" },
    { id: "worktree", card: "git", name: "Worktree", ds: "worktree.name / branch", color: "magenta", on: false, line: 1, contextual: true, sample: () => "my-feature" },

    // ---- GitHub ----
    { id: "repo", card: "github", name: "Repository", ds: "workspace.repo (linked)", color: "cyan", on: false, line: 1, emoji: "🔗", contextual: true, link: true, sample: () => "anthropics/claude-code" },
    { id: "pr", card: "github", name: "Pull request", ds: "pr.number / review_state", color: "cyan", on: false, line: 1, emoji: "⇡", contextual: true, link: true, sample: () => "PR #1234 (pending)" },

    // ---- Cost & activity ----
    { id: "cost", card: "cost", name: "Session cost", ds: "cost.total_cost_usd", color: "yellow", on: false, line: 2, emoji: "💰", sample: () => "$0.42" },
    { id: "duration", card: "cost", name: "Duration", ds: "cost.total_duration_ms", color: "cyan", on: false, line: 2, emoji: "⏱️", live: true, sample: () => "12m 3s" },
    { id: "apidur", card: "cost", name: "API wait", ds: "cost.total_api_duration_ms", color: "gray", on: false, line: 2, live: true, sample: () => "api 2.3s" },
    { id: "lines", card: "cost", name: "Lines changed", ds: "lines added / removed", color: "green", on: false, line: 2, sample: () => "+156 -23" },

    // ---- Token totals ----
    { id: "tokin", card: "tokens", name: "Input tokens", ds: "session Σ input", color: "green", on: false, line: 2, sample: () => "in 39k" },
    { id: "tokout", card: "tokens", name: "Output tokens", ds: "session Σ output", color: "yellow", on: false, line: 2, sample: () => "out 1.2M" },
    { id: "cachetok", card: "tokens", name: "Cached tokens", ds: "Σ 5m / 1h writes / hits", color: "cyan", on: false, line: 2, sample: () => "cache 1M/2.7M/72M" },

    // ---- Session ----
    { id: "sesname", card: "session", name: "Session name", ds: "session_name", color: "magenta", on: false, line: 1, contextual: true, sample: () => "my-session" },
    { id: "sesid", card: "session", name: "Session id", ds: "session_id (short)", color: "gray", on: false, line: 2, emph: "dim", sample: () => "a1b2c3d4" },
    { id: "agent", card: "session", name: "Agent name", ds: "agent.name", color: "red", on: false, line: 1, contextual: true, sample: () => "security-reviewer" },
    { id: "style", card: "session", name: "Output style", ds: "output_style.name", color: "cyan", on: false, line: 2, sample: () => "default" },
    { id: "version", card: "session", name: "CC version", ds: "version", color: "gray", on: false, line: 2, emph: "dim", sample: () => "v2.1.90" },
    { id: "vim", card: "session", name: "Vim mode", ds: "vim.mode", color: "yellow", on: false, line: 1, contextual: true, sample: () => "NORMAL" },

    // ---- Identity ----
    { id: "userhost", card: "identity", name: "user@host", ds: "whoami@hostname", color: "green", on: true, line: 1, sample: () => B().user + "@" + B().host },
    { id: "colon", card: "identity", name: "Colon", ds: "literal separator", color: "default", emph: "normal", on: true, line: 1, plain: true, sample: () => ":" },

    // ---- Clock (new in v4) ----
    { id: "clock", card: "clock", name: "Clock", ds: "local time", color: "cyan", on: false, line: 1, live: true, emoji: "🕐", hero: true,
      modes: [["24h", () => S.clockText("24h")], ["12h", () => S.clockText("12h")], ["24h+s", () => S.clockText("24h+s")], ["12h+s", () => S.clockText("12h+s")]] },
  ];
  S.SEGMAP = {};
  S.SEG.forEach((s) => (S.SEGMAP[s.id] = s));

  S.clockText = function (mode) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const s = mode.endsWith("+s") ? ":" + p(d.getSeconds()) : "";
    if (mode.startsWith("12h")) {
      let h = d.getHours() % 12; if (h === 0) h = 12;
      return h + ":" + p(d.getMinutes()) + s + (d.getHours() < 12 ? " AM" : " PM");
    }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + s;
  };

  /* ---- cards ------------------------------------------------------------ */
  // The ring shows one card per group. `kind` picks the face builder:
  // "fields" (rows of segments, optional hero segment on top), "theme", "layout".
  S.CARDS = [
    { id: "directory", kind: "fields", icon: "folder", name: "Directory",
      blurb: "Where you are: the working directory, project root, and any added directories." },
    { id: "model", kind: "fields", icon: "chip", name: "Model",
      blurb: "The model behind the session, plus a badge when fast mode is on." },
    { id: "effortthink", kind: "fields", icon: "gauge", name: "Effort & Thinking",
      blurb: "Reasoning effort level and whether extended thinking is on." },
    { id: "context", kind: "fields", icon: "ring", name: "Context Window",
      blurb: "How full the context window is: percentage, bar, or token count." },
    { id: "lim5h", kind: "fields", icon: "hourglass", name: "5-hour Tokens", scrub: "lim5h",
      blurb: "Usage of the current 5-hour window, so a long session never runs dry." },
    { id: "lim7d", kind: "fields", icon: "calendar", name: "7-day Tokens", scrub: "lim7d",
      blurb: "Usage of the rolling 7-day window, so weekly limits never surprise you." },
    { id: "git", kind: "fields", icon: "branch", name: "Git",
      blurb: "Branch, staged and modified counts, and the active worktree." },
    { id: "github", kind: "fields", icon: "arrowup", name: "GitHub",
      blurb: "Repository link and open pull request, when the session knows them." },
    { id: "cost", kind: "fields", icon: "coin", name: "Cost & Activity",
      blurb: "What the session costs and how long it has been running." },
    { id: "tokens", kind: "fields", icon: "layers", name: "Token Totals",
      blurb: "Cumulative input, output, and cache tokens for this session." },
    { id: "session", kind: "fields", icon: "terminal", name: "Session",
      blurb: "Session name, id, agent, output style, CLI version, and vim mode." },
    { id: "identity", kind: "fields", icon: "person", name: "Identity",
      blurb: "Classic prompt pieces: user@host and a literal colon." },
    { id: "clock", kind: "fields", icon: "clock", name: "Clock",
      blurb: "The current time, in 12 or 24 hour format, with optional seconds." },
    { id: "theme", kind: "theme", icon: "palette", name: "Theme & Colors",
      blurb: "One palette for the whole line. Pick a theme; every field follows." },
    { id: "layout", kind: "layout", icon: "sliders", name: "Layout & Format",
      blurb: "Separator, emoji icons, left padding, and the refresh interval." },
  ];
  S.CARDMAP = {};
  S.CARDS.forEach((c, i) => { c.index = i; c.segs = S.SEG.filter((s) => s.card === c.id).map((s) => s.id); S.CARDMAP[c.id] = c; });

  /* ---- separators & presets --------------------------------------------- */
  S.SEPARATORS = [
    { v: " ",    label: "space" },
    { v: "  ",   label: "double space" },
    { v: " | ",  label: "pipe  |" },
    { v: " · ",  label: "dot  ·" },
    { v: " ◆ ",  label: "diamond  ◆" },
    { v: " › ",  label: "chevron  ›" },
    { v: " • ",  label: "bullet  •" },
  ];

  // Starter layouts. `seg` entries: [id, line, {mode/bar/reset/color/emph overrides}]
  S.PRESETS = [
    { id: "minimal", name: "Minimal", sep: " ", emoji: false,
      segs: [["cwd", 1, { mode: "~" }], ["model", 1, { mode: "version" }]] },
    { id: "essentials", name: "Essentials", sep: " | ", emoji: false,
      segs: [["cwd", 1, {}], ["gitbranch", 1, {}], ["model", 1, {}], ["ctxpct", 1, { bar: false }]] },
    { id: "limits", name: "Limits watch", sep: " | ", emoji: false,
      segs: [["cwd", 1, {}], ["model", 1, {}],
             ["lim5h", 2, { bar: true, reset: true }], ["lim7d", 2, { bar: true, reset: true }], ["ctxpct", 2, { bar: true }]] },
    { id: "telemetry", name: "Full telemetry", sep: " | ", emoji: false,
      segs: [["cwd", 1, {}], ["gitbranch", 1, {}], ["model", 1, {}], ["effort", 1, {}], ["thinking", 1, {}],
             ["lim5h", 2, { bar: true, reset: true }], ["lim7d", 2, { bar: true, reset: true }], ["ctxpct", 2, { bar: true }],
             ["tokin", 2, {}], ["tokout", 2, {}], ["cachetok", 2, {}], ["cost", 2, {}]] },
    { id: "pictured", name: "As pictured", sep: " ◆ ", emoji: false,
      segs: [["cwd", 1, { mode: "~" }], ["model", 1, { mode: "version" }], ["effort", 1, {}],
             ["lim5h", 1, { bar: false, reset: false }], ["lim7d", 1, { bar: false, reset: false }],
             ["gitbranch", 1, {}], ["clock", 1, { mode: "24h" }]] },
  ];

  /* ---- icons (inline, stroke-based, consistent 1.7px weight) ------------ */
  const I = (inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  S.ICONS = {
    folder:   I('<path d="M3.5 7.5c0-1.1.9-2 2-2h3.6l2 2.2h7.4c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2z"/>'),
    chip:     I('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5v2.5M14 3.5v2.5M10 18v2.5M14 18v2.5M3.5 10h2.5M3.5 14h2.5M18 10h2.5M18 14h2.5"/>'),
    gauge:    I('<path d="M5 15.5a7.5 7.5 0 1 1 14 0"/><path d="M12 13.5l3.4-3.4"/><circle cx="12" cy="14" r="1" fill="currentColor"/>'),
    ring:     I('<circle cx="12" cy="12" r="7.5" opacity=".35"/><path d="M12 4.5a7.5 7.5 0 0 1 7.3 9.2"/>'),
    hourglass:I('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
    calendar: I('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3"/>'),
    branch:   I('<circle cx="7" cy="6" r="2.2"/><circle cx="17" cy="8" r="2.2"/><circle cx="7" cy="18" r="2.2"/><path d="M7 8.2v7.6M17 10.2c0 3.5-4 3-7.6 4.6"/>'),
    arrowup:  I('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9.5 14.5l5-5M10.5 9.5h4v4"/>'),
    coin:     I('<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M14.6 9.2c-.6-.9-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.4 1.5 5.4 4.1 0 1.3-1.2 2.1-2.8 2.1-1.2 0-2.2-.5-2.8-1.4"/>'),
    layers:   I('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4.5 12.5L12 16l7.5-3.5" opacity=".55"/><path d="M4.5 16.5L12 20l7.5-3.5" opacity=".3"/>'),
    terminal: I('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 10l2.7 2.3-2.7 2.3M12.5 15h4"/>'),
    person:   I('<circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19.5c1-3.4 3.5-5 6.5-5s5.5 1.6 6.5 5"/>'),
    clock:    I('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3.2 1.8"/>'),
    palette:  I('<path d="M12 4a8 8 0 1 0 .4 16c1.3 0 1.8-.8 1.8-1.7 0-1.5-1.4-1.9-1.4-3 0-.9.7-1.5 1.8-1.5h1.9c2 0 3.5-1.4 3.5-3.3C20 7 16.4 4 12 4z"/><circle cx="8.2" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="10" r="1" fill="currentColor" stroke="none"/>'),
    sliders:  I('<path d="M4.5 8h9M17.5 8h2M4.5 16h3M11.5 16h8"/><circle cx="15.2" cy="8" r="2.2"/><circle cx="9.2" cy="16" r="2.2"/>'),
    reset:    I('<path d="M5.5 9.5a7.3 7.3 0 1 1-1 5"/><path d="M5 4.5v5h5"/>'),
    export:   I('<path d="M12 14.5V4.5M8.5 8L12 4.5 15.5 8"/><path d="M5 13.5v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
    help:     I('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4c.3-1.3 1.3-2 2.5-2 1.4 0 2.5.9 2.5 2.2 0 1.9-2.7 2-2.7 3.6"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>'),
    chevL:    I('<path d="M14.5 6.5L9 12l5.5 5.5"/>'),
    chevR:    I('<path d="M9.5 6.5L15 12l-5.5 5.5"/>'),
    sun:      I('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'),
    moon:     I('<path d="M19.5 13.5A7.8 7.8 0 0 1 10.5 4.5a7.8 7.8 0 1 0 9 9z"/>'),
  };
})(window.SBC);
