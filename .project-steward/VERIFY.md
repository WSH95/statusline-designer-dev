# Verification

How to check the project is healthy. Agents run these before claiming
"validated" in HANDOFF.md.

| Check | Command | Expected |
| --- | --- | --- |
| Build | `python3 tools/build_skill_payloads.py` | builds `dist/`, exits 0 |
| Tests | `bash tools/verify.sh` | all pass |
| Lint | `(none)` | clean |

Last verified: 2026-07-08 — 35 passed, 0 failed.

## What tools/verify.sh covers

Fully sandboxed (mktemp dir + `STATUSLINE_DATA_DIR`/`STATUSLINE_PORT` overrides,
ports 8901-8903); never touches `~/.claude/settings.json`, the installed skill,
or the real `~/.claude/statusline-designer/`:

- python syntax of server.py / generate.py / apply_settings.py
- **legacy equivalence**: installed vs new `generate.py` emit identical ANSI
  output for the user's real applied layout
- clock (24h, 12h+s) and Dracula `colorHex` in generated output
- generated-script null-safety (`{}`, minimal, non-JSON payloads)
- `apply_settings.py` merge preserves foreign settings keys
- server contract: stale choice cleanup, startup line, GET 200 + BOOT injection,
  path-traversal 404, POST `/apply` writes + mirrors byte-exact
- UI static checks: zero external URLs, reduced-motion + reduced-transparency
  blocks, no em/en dashes, `inert` on aside cards
- drop-in test: the folder runs from a copied location
- build check: `tools/build_skill_payloads.py` produces a cache-clean `dist/`
  payload with all required files, and the built copy serves from `dist/`

## Headless visual QA

Screenshot any UI state via deep links
(`#card=<id|index>&theme=dark|light&preset=<id>&palette=<id>&debug=1`):

```bash
google-chrome --headless=new --disable-gpu --hide-scrollbars \
  --force-prefers-reduced-motion \
  --window-size=1440,900 --virtual-time-budget=2500 \
  --screenshot=screenshots/x.png 'http://localhost:8899/#card=lim5h&theme=dark'
```

`--force-prefers-reduced-motion` matters: headless virtual time does not advance
CSS transitions, so without it any transitioned property (active dot, switches)
screenshots at its transition-start state and looks broken when it is not.

`#debug=1` appends `<pre id="dbg">` with ring geometry plus the exact
`buildChoice()` payload; used for the hydrate→choice round-trip check.
