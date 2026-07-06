# Plan

Milestones and tasks. If an external task backend is adopted, this file
holds milestones + a pointer only (never a duplicate task list).

## Ship the redesigned Status Bar Composer UI as a verified drop-in replacement for ~/.claude/skills/statusline-designer

- [x] git init + project-steward init at repo root (approved 2026-07-05)
- [x] Scaffold `statusline-designer/`: copy `generate.py` + `apply_settings.py` verbatim,
      new `server.py` (static `ui/` server + BOOT injection + `/apply`), updated SKILL.md
- [x] UI pass a: design tokens + static layout (titlebar / nav / stage / terminal /
      detail panel / dock) in light + dark
- [x] UI pass b: `preview.js` parity renderer (port of generate.py `render()`)
- [x] UI pass c: catalog / state / hydration (legacy 13-segment JSON reproduces) + card faces
- [x] UI pass d: `ring.js` 3D carousel (drag+snap, keys, dots, click-to-center, depth
      blur, parallax; reduced-motion + narrow-viewport fallbacks)
- [x] UI pass e: detail panel + arrangement dock + preview↔ring linking
- [x] UI pass f: presets, theme palettes, Clock segment, Export, Reset All +
      additive `generate.py` changes (clock render, colorHex, 🕐 emoji, tempfile fix)
- [x] UI pass g: polish (a11y sweep, contrast, copy audit, hint placement)
- [x] Sandboxed end-to-end verification (`dev/verify.sh`, 26 checks green): hydration
      round-trip, apply→generate→run payloads, settings merge, legacy equivalence,
      static checks, drop-in copy test; headless Chrome screenshots for all key states
- [ ] User review session on sandboxed server (http://localhost:8899); iterate on feedback
      (in-browser interaction QA: drag feel, popovers, menus - not coverable headlessly)
- [ ] Final commit; on explicit go-ahead, install copy to `~/.claude/skills/`

## Later

- [ ] Optional: skill-creator description-optimization loop (user chose default skip)

(Codex support removed from this plan 2026-07-06: it will be a separate skill on
its own branch, since Codex's status-line interface may not match Claude Code's.)
