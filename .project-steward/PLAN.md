# Plan

Milestones and tasks. If an external task backend is adopted, this file
holds milestones + a pointer only (never a duplicate task list).

## Ship the redesigned Status Bar Composer UI as a verified drop-in replacement for ~/.claude/skills/statusline-designer

- [x] git init + project-steward init at repo root (approved 2026-07-05)
- [ ] Scaffold `statusline-designer/`: copy `generate.py` + `apply_settings.py` verbatim,
      new `server.py` (static `ui/` server + BOOT injection + `/apply`), updated SKILL.md
- [ ] UI pass a: design tokens + static layout (titlebar / nav / stage / terminal /
      detail panel / dock) in light + dark
- [ ] UI pass b: `preview.js` parity renderer (port of generate.py `render()`)
- [ ] UI pass c: catalog / state / hydration (legacy 13-segment JSON reproduces) + card faces
- [ ] UI pass d: `ring.js` 3D carousel (drag+snap, keys, dots, click-to-center, depth
      blur, parallax; reduced-motion + narrow-viewport fallbacks)
- [ ] UI pass e: detail panel + arrangement dock + preview↔ring linking
- [ ] UI pass f: presets, theme palettes, Clock segment, Export, Reset All +
      additive `generate.py` changes (clock render, colorHex, 🕐 emoji)
- [ ] UI pass g: polish (a11y sweep, perf/blur cap, copy audit)
- [ ] Sandboxed end-to-end verification (`dev/verify.sh`): hydration, Chrome drive,
      apply→generate→run against 3 payloads, settings merge, legacy equivalence,
      no-external-URL static checks, drop-in copy test
- [ ] User review session on sandboxed server; iterate on feedback
- [ ] Final commit; on explicit go-ahead, install copy to `~/.claude/skills/`

## Later

- [ ] Codex CLI segment catalog (second target)
- [ ] Optional: skill-creator description-optimization loop (user chose default skip)
