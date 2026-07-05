---
updated_at: 2026-07-05T23:35Z
updated_by: claude (auto-checkpoint)
session_status: active
branch: main
last_commit: ab57775 feat(ui): iteration 2 - full-bleed rework (+ steward log commit after)
---

# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

Iteration 2 (full-bleed rework per user's design review) shipped and verified:
crisp slot-based coverflow, no app chrome, larger scale, edge arrows.
`dev/verify.sh` 26/26. User's first browser Apply already round-tripped through
generate.py successfully (they edited: line 2 ends with `lines` now, not
`cost`). Awaiting the user's verdict on iteration 2.

## In flight

- User review session: sandboxed server on **http://localhost:8899**
  (`STATUSLINE_DATA_DIR=<scratchpad>/sandbox/data`). Background jobs: server
  (task byvpw2q0x) and a re-armed Apply-waiter (task b5tc7h04o).

## Next steps

1. Iterate on any remaining iteration-2 feedback.
2. On approval: final commit, then (explicit go-ahead only) copy
   `statusline-designer/` over `~/.claude/skills/statusline-designer`.
3. Optional, default-skip: skill-creator description-optimization loop.

## Blockers

- Awaiting user input (iteration-2 review verdict).

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
