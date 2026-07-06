# statusline-designer-dev — project charter

Development home of the statusline-designer Claude Code skill: a macOS-style 'Status Bar Composer' web UI (3D card ring + live terminal preview) that generates the user's status-line script

- Created: 2026-07-05T20:59:45Z (Project Steward 0.2.3)
- Primary language/stack: Python 3 (stdlib server + generators) and vanilla HTML/CSS/JS

## Goals

- Completely redesign the web UI of the installed skill at `~/.claude/skills/statusline-designer`
  as the "Status Bar Composer": macOS frosted-glass aesthetic, live terminal preview,
  15 property cards in a 3D ring (click-to-center focus, drag / arrow-key / dot rotation),
  bottom detail panel, arrangement dock. Reference design: `statusline-designer-ui.png`.
- `statusline-designer/` in this repo is a **drop-in replacement**: copying it over
  `~/.claude/skills/statusline-designer` must work, including re-hydrating the user's
  existing `~/.claude/statusline-designer/choice-applied.json` (13 segments, 2 lines).
- Mock-parity extras: Clock segment, color theme presets (Tokyo Night default, Dracula,
  Nord, Catppuccin Mocha), starter-layout Presets menu, extra separators, Export JSON.
- Full approved plan: `~/.claude/plans/i-want-to-completely-concurrent-pretzel.md`.

## Non-goals

- Codex CLI support: out of scope for this skill entirely. Codex's status-line
  interface likely differs from Claude Code's; it will be designed as a separate
  skill on its own branch later (user decision, 2026-07-06).
- Design JSON import, per-segment custom hex picker (explicitly deferred by user).
- New bar rendering styles in the generated script (Display stays Off / Percent / Bar).

## Users / stakeholders

- wsh (repo owner) — daily Claude Code user with an active generated status line.
- Any Claude Code user who installs the skill by copying the folder (self-contained).

## Constraints

- Cross-platform: the skill must work on Ubuntu, Windows, and macOS (dev host is
  Ubuntu). Font stacks cover all three (incl. emoji fonts); no `/tmp` hardcoding in
  generated scripts (`tempfile.gettempdir()`); paths via `os.path` only.
- The skill must run anywhere with python3 stdlib only: no build step, no npm, no
  external network requests from the UI (vanilla HTML/CSS/JS served by `server.py`).
- Preserve the choice.json contract consumed by `generate.py` / `apply_settings.py`;
  all 33 legacy segment ids keep identical semantics; new keys are strictly optional.
- Preserve server contract: 127.0.0.1, `STATUSLINE_PORT` (8765), `STATUSLINE_DATA_DIR`,
  GET hydration from `choice-applied.json`, POST `/apply` → `choice.json` + copy,
  startup line `Status line designer: http://localhost:PORT ...`, and the
  `pgrep -f "[s]tatusline-designer/.*server\.py"` kill pattern.
- No dev/maintenance files inside `statusline-designer/` (steward, workspace, scratch
  all live at repo root).
- During development never modify `~/.claude/skills/statusline-designer`,
  `~/.claude/settings.json`, or `~/.claude/statusline-designer/` — all server/pipeline
  tests run against `STATUSLINE_DATA_DIR` sandboxes on alternate ports.
