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
- [x] User review: three feedback iterations (2026-07-05/06)
      - iteration 2: full-bleed rework - no app chrome, larger scale, crisp
        slot-based coverflow (2D focused card/terminal, no blur), edge arrows
      - iteration 3: detail panel removed (weight cycles on cards, Export in
        toolbar, Reset in Presets menu), trackpad horizontal swipe, reliable
        side-card clicks
      - iteration 4: preview strips fixed-height flex (block glyphs no longer
        misalign the Context Window card foot)
- [x] Installed to `~/.claude/skills/statusline-designer` (rsync, byte-identical)
      and the user's real status line regenerated via a browser Apply ->
      generate.py -> apply_settings.py (2026-07-06)

**Milestone delivered 2026-07-06.** verify.sh 26/26 at last run.

## Restructure into a Claude-Code-only skills dev repo (2026-07-08)

- [x] Move skill source to `skill-src/statusline-designer/` and dev tooling to
      `tools/` (git mv, byte-identical); moved the concept mock to `docs/`
- [x] Add `tools/build_skill_payloads.py` (skill-src -> `dist/`, cache-clean +
      validated) and a build check to `tools/verify.sh`
- [x] Add `tools/publish_agent_artifact_pr.py` + `agent-artifacts.json`
      (PR into agent-skills at the repo root; never merges; `--dry-run`)
- [x] Remove all legacy other-runtime references; mark the repo Claude Code only
      (AGENTS.md, CLAUDE.md, README.md, PROJECT.md)
- [x] Update docs/ignores: README dev section, `.gitignore` (`dist/`), VERIFY.md
- [x] Verify: `tools/verify.sh` 35/35 + live composer render + publish --dry-run

## Later

- [ ] Optional: run skill-creator's description-optimization loop - it auto-generates
      ~20 realistic should/should-not-trigger prompts, measures how reliably the
      SKILL.md `description` makes Claude invoke the skill, and iteratively rewrites
      it. Current description (inherited from tuned v3) already triggers well; run
      only if mis-triggering is ever observed.
