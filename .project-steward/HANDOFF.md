---
updated_at: 2026-07-05T22:40Z
updated_by: claude (auto-checkpoint)
session_status: active
branch: main
last_commit: 0f26a7e chore(steward): checkpoint - build+verify done, user review next
---

# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

Status Bar Composer fully built in `statusline-designer/` (drop-in replacement
for `~/.claude/skills/statusline-designer`). `dev/verify.sh` green (26/26),
6 commits on main. Waiting on the user's visual review.

## In flight

- User review session: sandboxed server on **http://localhost:8899**
  (`STATUSLINE_DATA_DIR=<scratchpad>/sandbox/data`, seeded with a copy of the
  user's real `choice-applied.json`). Two background jobs: the server
  (task byvpw2q0x) and a waiter on the sandbox `choice.json` (task bfwutxya0)
  that fires when the user clicks Apply.

## Next steps

1. Collect user feedback on the live UI (drag feel, popovers, presets menu are
   the parts not coverable headlessly); iterate.
2. On approval: final commit, then (explicit go-ahead only) copy
   `statusline-designer/` over `~/.claude/skills/statusline-designer`.
3. Optional, default-skip: skill-creator description-optimization loop.

## Blockers

- Awaiting user input (review feedback).

## Key files

- `statusline-designer/scripts/ui/js/{catalog,preview,ring,main}.js` + `app.css`
  + `index.html` - the whole app; `server.py` serves ui/ + injects `window.BOOT`.
- `dev/verify.sh` - full sandboxed test suite; `dev/screenshots/` - QA shots.
- Plan: `~/.claude/plans/i-want-to-completely-concurrent-pretzel.md`.

## Tried and rejected

- Hover-to-center focus (accidental spins) -> click-to-center per user choice.
- Separate hero-preview strips per card -> single `card-foot` preview strip.

## Warnings

- Never modify `~/.claude/skills/statusline-designer`, `~/.claude/settings.json`,
  or `~/.claude/statusline-designer/` during dev; sandbox env vars only.
- Keep `.ring.boot` transition suppression: without it, headless screenshots
  freeze mid-transition (looked like a 3D bug; it is not).
- curl to 127.0.0.1 needs `--noproxy '*'` in this environment.
- choice.json contract: new keys (`palette`, per-seg `colorHex`, `clock`) are
  strictly optional; legacy layouts must keep round-tripping byte-identically.
