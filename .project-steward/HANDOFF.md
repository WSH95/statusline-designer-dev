---
updated_at: 2026-07-06T04:27:46Z
updated_by: cli
session_status: closed
branch: main
last_commit: 69db6ed fix(ui): preview strip centering + PLAN.md current
---
# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

**Project delivered.** The Status Bar Composer (complete UI redesign of the
statusline-designer Claude Code skill) went through three design iterations
with the user and is:
- committed on `main` (11 commits, working tree clean apart from this wrap),
- **installed** at `~/.claude/skills/statusline-designer` (byte-identical to
  the repo's `statusline-designer/` folder),
- **live**: the user's real status line was regenerated through the new
  pipeline from a design they applied in the browser (line 1: cwd, gitbranch,
  addeddirs, model, effort, thinking; line 2: lim5h, lim7d, ctxpct, tokin,
  tokout, cachetok, lines; Tokyo Night legacy palette, " | " separator, 2s refresh).
- `dev/verify.sh`: 26/26 at last run.

Final UI state: full-bleed off-white page (dark toggle), toolbar (help /
export / presets / theme / Apply), crisp 2D terminal preview, 15-card
slot-based 3D coverflow (drag, trackpad horizontal swipe, edge chevrons,
arrow keys, dots, click-to-center), weight cycling on cards (click field
name or Aa chip: bold→normal→dim), arrangement dock as the only line/order
surface, no detail panel.

## In flight

- Nothing. Designer server and Apply-waiters were shut down at wrap
  (the generated status line does not depend on them). The skill relaunches
  its own server whenever it is next invoked ("redesign my statusline").

## Next steps

1. Codex-CLI variant: **separate skill on its own branch** (user decision;
   deliberately absent from this plan and the shipped skill).
2. Optional, user chose default-skip: skill-creator description-optimization
   loop for the SKILL.md frontmatter.
3. If UI bugs surface in daily use: edit repo, `bash dev/verify.sh`,
   re-`rsync -a --delete statusline-designer/ ~/.claude/skills/statusline-designer/`,
   commit.

## Blockers

- (none)

## Key files

- `statusline-designer/` — the shipped skill (SKILL.md + scripts/{server,generate,apply_settings}.py + scripts/ui/).
- `statusline-designer/scripts/ui/js/` — catalog (34 segments/15 cards/palettes/presets),
  preview (1:1 port of generate.py rendering), ring (slot coverflow engine), main (state/hydration/actions).
- `dev/verify.sh` — sandboxed 26-check suite; `dev/screenshots/` — QA history.
- `~/.claude/plans/i-want-to-completely-concurrent-pretzel.md` — approved plans (3 iterations).
- Design reference: `statusline-designer-ui.png` (treat as direction, not spec — user feedback).

## Tried and rejected

- Literal mock copy (framed app window, traffic lights, glass everywhere, small type) — user rejected; full-bleed instead.
- Cylinder-ring 3D with blur depth — replaced by slot coverflow: CSS 3D rasterization blurred text; focused card/terminal must stay on 2D transforms.
- Hover-to-center focus — accidental spins; click/drag/swipe/arrows only.
- Bottom detail panel — redundant with dock + on-card controls; removed.

## Warnings

- **Contract**: choice.json schema + all 33 legacy segment ids are frozen; new keys
  (`palette`, per-seg `colorHex`, `clock` segment) strictly optional. Legacy layouts
  must round-trip byte-identically (verify.sh section 1 enforces via old-vs-new
  generator diff — needs the pre-redesign generate.py, which now only exists in
  git history: `git show 4b5598d:statusline-designer/scripts/generate.py`).
- verify.sh stays fully sandboxed; `~/.claude/settings.json` is written only by
  `apply_settings.py` after a real user Apply.
- Headless QA: add `--force-prefers-reduced-motion` (virtual time freezes CSS
  transitions) and `--noproxy '*'` for localhost curls in this environment.
- Server contract preserved: port 8765 / `STATUSLINE_PORT`, `STATUSLINE_DATA_DIR`,
  POST `/apply` → choice.json + choice-applied.json, startup line, pgrep pattern
  `[s]tatusline-designer/.*server\.py` (kill by PID only — pkill self-match trap).
