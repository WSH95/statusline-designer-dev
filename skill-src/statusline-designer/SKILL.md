---
name: statusline-designer
description: Design your Claude Code status line in a local web UI, then generate and apply it.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write
---

# Status line designer

A browser-based designer for the Claude Code status line — the **Status Bar Composer**.
The user arranges fields visually (property cards in a 3D ring, a live macOS-style
terminal preview, an arrangement dock for ordering), and on **Apply** the status-line
script is regenerated and wired into their `settings.json`. It is local-only (binds
`127.0.0.1`) — nothing is sent anywhere.

Use it both to **create a status line from scratch** and to **tweak an existing one**
later — re-running re-hydrates the composer with the last applied layout, so the user
edits their current status line rather than starting over.

## Run it

One command does the whole job — serve the UI, open the browser, and apply every design
the page sends (generate the script, update `settings.json`):

```bash
python3 "$HOME/.claude/skills/statusline-designer/scripts/open_designer.py"
```

That is also how the user runs it with no agent involved. The page has **two** apply
buttons, and the difference is the whole workflow:

- **Apply to Terminal** — applies and **leaves the designer open**, so the user can look
  at the result and keep adjusting. Apply as often as they like.
- **Apply & Close** — applies, then stops the server; the command exits (so does Ctrl-C).

`--port`, `--no-browser`, `--data-dir`, `--out` and `--settings` cover the rest —
`--help` lists them.

## Workflow

1. Start the launcher **in the background** so the harness re-invokes you when it exits:

   ```bash
   python3 "$HOME/.claude/skills/statusline-designer/scripts/open_designer.py"
   ```

   It prints `Status line designer: http://localhost:8765` (set `--port` if 8765 is taken)
   and opens that page.

2. Tell the user to design their status line on that page — rotate the card ring with
   drag / arrow keys, click a card to focus it, toggle fields, tune colors and palettes,
   order chips in the dock — applying as often as they want with **Apply to Terminal**,
   and clicking **Apply & Close when they are done**. Say that explicitly: Apply & Close
   is what ends the session and hands control back to you. End your turn; don't poll in a
   tight loop.

3. When the launcher exits, the script and `settings.json` are already written. Confirm
   to the user that the status line refreshes on their next interaction, quoting the
   sample line the launcher rendered.

## The pieces (all bundled in `scripts/`)

- `open_designer.py` — the entry point above. Serves the UI, opens the browser, and runs
  the two generators on every Apply until the page asks it to stop. Never kills anything:
  if a designer is already on the port it reuses it and leaves it running.
- `server.py` — serves the composer from `scripts/ui/`. On **Apply** it writes the chosen
  layout to `~/.claude/statusline-designer/choice.json` (and keeps a copy in
  `choice-applied.json`, which re-hydrates the page on the next run). **Apply & Close**
  posts `?close=1`, which also drops a `close.request` marker for the launcher; run bare
  (no launcher) the server advertises `canClose: false` and the page hides that button.
- `scripts/ui/` — the web app: `index.html`, `app.css`, and `js/` (segment catalog,
  terminal-preview renderer that mirrors the generator exactly, 3D card ring, state).
- `generate.py` — turns `choice.json` into a self-contained python3 status-line script.
  Handles every field, null-safety, the green→red usage gradient, git (cached), the
  clock, color palettes, and **cumulative, deduplicated** token/cost accounting parsed
  from the session transcript.
- `apply_settings.py` — merges the chosen global settings (refresh interval, padding,
  vim indicator) into `settings.json`, preserving all other keys, and writes
  `statusLine = {type:"command", command:"python3 ~/.claude/statusline-command.py", ...}`.

Both generators are plain CLIs, if a step ever needs redoing by hand against the last
applied layout:

```bash
DATA="$HOME/.claude/statusline-designer"
SKILL_DIR="$HOME/.claude/skills/statusline-designer"
python3 "$SKILL_DIR/scripts/generate.py" "$DATA/choice-applied.json" "$HOME/.claude/statusline-command.py"
python3 "$SKILL_DIR/scripts/apply_settings.py" "$DATA/choice-applied.json" "$HOME/.claude/settings.json" "python3 ~/.claude/statusline-command.py"
```

Render the result at any time by piping mock session JSON through the generated script:

```bash
echo '{"cwd":"'$PWD'","model":{"id":"claude-opus-4-8"},"context_window":{"used_percentage":24}}' \
  | python3 "$HOME/.claude/statusline-command.py"
```

## Remove the status line

Delete the `statusLine` block from `~/.claude/settings.json` (and optionally remove
`~/.claude/statusline-command.py`). The user can also just ask to "remove my status line".

## Notes & gotchas

- **Paths**: never hardcode a home directory — use `$HOME` / `os.path.expanduser`. The
  bundled scripts already do; the `settings.json` command uses `~`, which the shell expands.
- **Stopping a stray server**: the launcher closes its own server, so this is only for a
  bare `server.py`. Kill by PID with the bracket trick — a plain `pkill -f` pattern matches
  the killing shell's own command line and kills itself:
  `pid=$(pgrep -f "[s]tatusline-designer/.*server\.py"); [ -n "$pid" ] && kill $pid`
- **Token accounting**: the status line's input/output/cache figures are cumulative for
  the session and **deduplicated by message id** (the transcript logs each API call
  several times). They reconcile with `cost.total_cost_usd` to within a few percent; the
  small residual is sub-agent calls, which bill to the session but live in their own
  transcripts.
- **Null-safety**: the generated script is pure python3 (stdlib + `git`, no `jq`) and
  degrades gracefully when fields are absent — rate limits, git, PR simply don't show.
- **Single vs two lines**: leaving Line 2 empty produces a one-line status.
- **Clock**: the clock segment is "live" — when it shows seconds the composer auto-picks
  a 1s refresh interval, otherwise 2s.
- **Palettes**: a chosen palette bakes per-segment `colorHex` values into `choice.json`;
  segments without `colorHex` fall back to the classic named-color rendering, so layouts
  applied by older versions look exactly as before (new keys are all optional).
- **Sharing**: this whole directory is self-contained. Another Claude Code user installs
  it by copying it to their own `~/.claude/skills/statusline-designer/` (or via a plugin).
