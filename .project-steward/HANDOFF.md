---
updated_at: 2026-07-06T06:34:40Z
updated_by: claude
session_status: closed
branch: main
last_commit: 40bb523 chore(dev): add dev/capture_readme_media.py to regenerate README media
---
# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

**This session: published the repo + added a README with generated media.**
- Repo is **public** on GitHub: `github.com/WSH95/statusline-designer-dev`
  (remote `origin`, SSH). `main` is **pushed and in sync at `40bb523`**.
- Added `README.md` (title, hero, demo GIF, features, install/use, how-it-works,
  development, requirements). The hero is a **fresh live screenshot of the
  shipped UI**, not the older `statusline-designer-ui.png` concept mockup
  (that mockup shows the removed bottom panel / a "Save" button).
- Added `dev/capture_readme_media.py` — a sandboxed, one-command regenerator for
  both README assets (see Key files). README media lives in `docs/`.
- `dev/verify.sh`: 26/26 at last run (unchanged this session).

**Project itself was delivered in prior sessions** and remains live: the Status
Bar Composer (full UI redesign of the statusline-designer skill) is installed at
`~/.claude/skills/statusline-designer` and the user's real status line renders
through the new pipeline. Final UI: full-bleed page (light/dark), toolbar (help /
export / presets / theme / Apply), crisp 2D terminal preview, 15-card 3D
coverflow (drag / swipe / arrows / dots / click-to-center), weight cycling on
cards, arrangement dock (no detail panel).

## In flight

- Nothing. All work committed and pushed; working tree clean; no background
  processes (capture script and its sandbox server/chrome tear down their own
  process groups). `~/.claude` was never touched by this session (all capture
  ran against a temp `STATUSLINE_DATA_DIR` on an alt port).

## Next steps

1. After any future UI change that affects appearance, refresh the README media
   and commit: `python3 dev/capture_readme_media.py` (needs `google-chrome` +
   `ffmpeg`; writes `docs/status-bar-composer.png` + `...-demo.gif`).
2. Codex-CLI variant: **separate skill on its own branch** (user decision;
   deliberately absent from this plan and the shipped skill).
3. Optional, user chose default-skip: skill-creator description-optimization
   loop for the SKILL.md frontmatter.
4. If UI bugs surface in daily use: edit repo, `bash dev/verify.sh`,
   re-`rsync -a --delete statusline-designer/ ~/.claude/skills/statusline-designer/`,
   commit.

## Blockers

- (none)

## Key files

- `statusline-designer/` — the shipped skill (SKILL.md + scripts/{server,generate,apply_settings}.py + scripts/ui/).
- `statusline-designer/scripts/ui/js/` — catalog (segments/cards/palettes/presets),
  preview (1:1 port of generate.py rendering), ring (slot coverflow engine),
  main (state/hydration/actions; boot() supports the `#preset=…&theme=…&card=…`
  deep link + the "As pictured" preset used to reproduce the hero).
- `README.md` + `docs/` — public front page and its media.
- `dev/capture_readme_media.py` — regenerates the README hero + demo GIF. Path-clean
  and sandboxed like verify.sh (temp data dir, alt port 8799, CDP port 9337);
  headless google-chrome for the hero, a stdlib Chrome-DevTools-Protocol/websocket
  driver for the GIF (fractional `SBC.ring.goTo`, `[data-seg-row=…] input` toggles,
  `#themeBtn`), ffmpeg two-pass palette. `--hero-only` / `--gif-only`. Update its
  STORYBOARD selectors if the UI structure changes.
- `dev/verify.sh` — sandboxed 26-check suite; `dev/screenshots/` — QA history (gitignored).
- `~/.claude/plans/i-want-to-completely-concurrent-pretzel.md` — approved redesign plans.

## Tried and rejected

- Literal mock copy (framed app window, traffic lights, glass everywhere, small type) — user rejected; full-bleed instead.
- Cylinder-ring 3D with blur depth — replaced by slot coverflow (CSS 3D rasterization blurred text; focused card/terminal stay on 2D transforms).
- Hover-to-center focus — accidental spins; click/drag/swipe/arrows only.
- Bottom detail panel — redundant with dock + on-card controls; removed.
- Reusing `statusline-designer-ui.png` as the README hero — it is the stale concept mockup; captured a fresh live screenshot instead.

## Warnings

- **Contract**: choice.json schema + all 33 legacy segment ids are frozen; new keys
  (`palette`, per-seg `colorHex`, `clock` segment) strictly optional. Legacy layouts
  must round-trip byte-identically (verify.sh section 1; old generator via
  `git show 4b5598d:statusline-designer/scripts/generate.py`).
- verify.sh + capture_readme_media.py stay fully sandboxed; `~/.claude/settings.json`
  is written only by `apply_settings.py` after a real user Apply.
- **This environment**: `curl`/`urllib` to `127.0.0.1` hit the proxy unless bypassed —
  `curl --noproxy '*'`, and in Python a direct `ProxyHandler({})` opener (the CIDR
  `no_proxy` defeats urllib) + Chrome `--no-proxy-server`.
- **Never `pkill -f <plain pattern>`** here: it matches the killing shell's own argv
  and terminates the shell (seen as exit 144). Kill by explicit PID, use the `[b]racket`
  trick, or (in code) kill the process group.
- Server contract preserved: port 8765 / `STATUSLINE_PORT`, `STATUSLINE_DATA_DIR`,
  POST `/apply` → choice.json + choice-applied.json, startup line, pgrep pattern
  `[s]tatusline-designer/.*server\.py`.
