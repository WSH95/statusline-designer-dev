---
updated_at: 2026-07-06T00:40Z
updated_by: claude (auto-checkpoint)
session_status: active
branch: main
last_commit: 79f0221 feat(ui): iteration 3 (+ hygiene commit after)
---

# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

Iteration 3 shipped AND **the skill is installed for real** (rsync'd to
`~/.claude/skills/statusline-designer`, byte-identical, harness picked up the
new description). Panel removed (weight cycles on cards via name/Aa clicks;
Export in toolbar; Reset in Presets menu), trackpad horizontal swipe added,
Codex removed from plans. verify.sh 26/26.

## In flight

- **Real** review loop: installed server on **http://localhost:8765** with the
  real data dir (hydrates the user's actual 13-segment layout, PID via pgrep).
  Background waiter (task bixxzz989) on `~/.claude/statusline-designer/choice.json`:
  when the user clicks Apply, run generate.py -> `~/.claude/statusline-command.py`
  and apply_settings.py -> `~/.claude/settings.json`, then `rm choice.json`
  (SKILL.md steps 4-5) and confirm to the user.

## Next steps

1. On the waiter firing: complete generate+settings, show rendered line.
2. Any further design feedback -> edit repo, re-run verify, **re-rsync to the
   installed copy**, commit.
3. Optional, default-skip: skill-creator description-optimization loop.

## Blockers

- Awaiting user's real Apply / final verdict.

## Key files

- `statusline-designer/scripts/ui/js/{catalog,preview,ring,main}.js` + `app.css`
  + `index.html` - the whole app; `server.py` serves ui/ + injects `window.BOOT`.
- `dev/verify.sh` - full sandboxed test suite; `dev/screenshots/` - QA shots.
- Plan: `~/.claude/plans/i-want-to-completely-concurrent-pretzel.md`.

## Tried and rejected

- Hover-to-center focus (accidental spins) -> click-to-center per user choice.
- Separate hero-preview strips per card -> single `card-foot` preview strip.

## Warnings

- The install boundary moved (user-approved plan, 2026-07-06): the installed
  skill and real data dir are now legitimately touched via the SKILL.md
  workflow. `~/.claude/settings.json` is only written by apply_settings.py
  after a real user Apply. Keep verify.sh runs sandboxed as before.
- After any repo edit, re-rsync to `~/.claude/skills/statusline-designer`
  (`rsync -a --delete`), and keep `__pycache__` out (verify.sh sets
  PYTHONDONTWRITEBYTECODE).
- Headless screenshots: add `--force-prefers-reduced-motion` or transitioned
  properties (active dot, switches) freeze at transition-start under virtual
  time and look broken when they are not.
- curl to 127.0.0.1 needs `--noproxy '*'` in this environment.
- choice.json contract: new keys (`palette`, per-seg `colorHex`, `clock`) are
  strictly optional; legacy layouts must keep round-tripping byte-identically.
