---
name: statusline-designer
description: Visually design, create, or customize the Claude Code terminal status line through a local web UI — the Status Bar Composer, a macOS-style designer with a live terminal preview, property cards arranged in a 3D ring, light/dark themes, color palettes (Tokyo Night, Dracula, Nord, Catppuccin), starter presets, and fields like model, working directory, git branch/changes, context-window %, 5-hour & 7-day usage limits, effort level, session cost, cumulative input/output/cache token usage, and a live clock. Use this whenever the user wants to set up, change, redesign, customize, or add fields to their status line / statusline / statusLine / bottom bar (e.g. "show git branch and context % in my status line", "make my status bar show token cost", "redesign my statusline", "add the 5h usage limit to my prompt bar"), even if they don't name this tool. It opens a browser-based designer, then generates the status-line script and wires it into the user's settings.json automatically.

allowed-tools: Bash, Read, Edit, Write
---

# Status line designer

A browser-based designer for the Claude Code status line — the **Status Bar Composer**.
The user arranges fields visually (property cards in a 3D ring, a live macOS-style
terminal preview, an arrangement dock for ordering), and on **Apply** this skill
regenerates the status-line script and updates the user's `settings.json`. It is
local-only (binds `127.0.0.1`) — nothing is sent anywhere.

Use it both to **create a status line from scratch** and to **tweak an existing one**
later — re-running re-hydrates the composer with the user's last applied layout.

## The pieces (all bundled in `scripts/`)

- `server.py` — serves the composer on `http://localhost:8765` from `scripts/ui/`
  (vanilla HTML/CSS/JS, no build step, no external requests). On **Apply** it writes
  the chosen layout to `~/.claude/statusline-designer/choice.json` (and keeps a copy in
  `choice-applied.json` so the next run starts from the current design).
- `scripts/ui/` — the web app: `index.html`, `app.css`, and `js/` (segment catalog,
  terminal-preview renderer that mirrors the generator exactly, 3D card ring, state).
- `generate.py` — turns `choice.json` into a self-contained python3 status-line script.
  Handles every field, null-safety, the green→red usage gradient, git (cached), the
  clock, color palettes, and **cumulative, deduplicated** token/cost accounting parsed
  from the session transcript.
- `apply_settings.py` — merges the chosen global settings (refresh interval, padding,
  vim indicator) into `settings.json`, preserving all other keys.

## Workflow

Run these steps in order. Set the variables once; everything else is path-clean and
works for any user (no hardcoded home directories).

```bash
SKILL_DIR="$HOME/.claude/skills/statusline-designer"   # this skill's directory
DATA="$HOME/.claude/statusline-designer"               # writable run/data dir (auto-created)
OUT="$HOME/.claude/statusline-command.py"              # the generated status-line script
SETTINGS="$HOME/.claude/settings.json"                 # user settings (created if missing)
```

### 1. Start the designer (background)

First clear any instance already holding the port, then launch. **Do not** `pkill -f`
with the plain pattern — its own command line contains the pattern and it kills its own
shell. Kill by PID with the bracket trick, or by port:

```bash
pid=$(pgrep -f "[s]tatusline-designer/.*server\.py"); [ -n "$pid" ] && kill $pid
# start it (run in the background so it keeps serving):
python3 "$SKILL_DIR/scripts/server.py"
```

The server prints `Status line designer: http://localhost:8765`. (Override the port with
`STATUSLINE_PORT` if 8765 is taken.)

### 2. Hand the user the URL

Tell them: open **http://localhost:8765**, design the status line (rotate the card ring
with drag / arrow keys, click a card to focus it, toggle fields, tune colors and
palettes, order chips in the dock), and click **Apply to Terminal**.
Then end your turn or move to step 3 — don't poll in a tight loop.

### 3. Wait for the user's Apply (background)

Block until `choice.json` appears, then read it. Run this in the background so the harness
re-invokes you when the user confirms:

```bash
while [ ! -f "$DATA/choice.json" ]; do sleep 1; done; echo READY; cat "$DATA/choice.json"
```

### 4. Generate the script and wire up settings

When `choice.json` exists:

```bash
python3 "$SKILL_DIR/scripts/generate.py" "$DATA/choice.json" "$OUT"
python3 "$SKILL_DIR/scripts/apply_settings.py" "$DATA/choice.json" "$SETTINGS" "python3 ~/.claude/statusline-command.py"
rm -f "$DATA/choice.json"     # clear so a later Apply re-triggers cleanly
```

`apply_settings.py` writes `statusLine = {type:"command", command:"python3 ~/.claude/statusline-command.py", ...}`
into `settings.json` (with `refreshInterval`/`padding` when chosen, and
`hideVimModeIndicator` when the vim segment is used), leaving all other settings intact.

### 5. Confirm

Tell the user it's applied and the status line will refresh on their next interaction.
Optionally show the rendered line by piping mock JSON through the script:

```bash
echo '{"cwd":"'$PWD'","model":{"id":"claude-opus-4-8"},"context_window":{"used_percentage":24}}' | python3 "$OUT"
```

## Re-running / customizing later

Just invoke the skill again. Step 1 restarts the server, which **re-hydrates the page
from `choice-applied.json`** — the user sees their current status line and edits from
there. Everything else is identical. Layouts applied by older versions of this skill
hydrate cleanly (new keys like `palette` / `colorHex` / the `clock` segment are optional).

## Verifying / testing a change

- The generated script is pure python3 (stdlib + `git`); no `jq` needed.
- Test against real data by capturing one status-line payload: temporarily set
  `settings.json` `statusLine.command` to a script that tees stdin to a file, or just
  trust the live render — the script is null-safe and degrades gracefully when fields are
  absent (rate limits, git, PR, etc. simply don't show).

## Remove the status line

Delete the `statusLine` block from `~/.claude/settings.json` (and optionally remove
`~/.claude/statusline-command.py`). The user can also just ask to "remove my status line".

## Notes & gotchas

- **Paths**: never hardcode a home directory — use `$HOME` / `os.path.expanduser`. The
  bundled scripts already do; the `settings.json` command uses `~` which the shell expands.
- **`pkill -f` self-match**: the classic trap — a plain pattern matches the killing
  shell's own command line. Use `pgrep`/`pkill` with the bracket trick (`"[s]tatusline…"`)
  or kill by PID, and never put the plain path elsewhere in the same command.
- **Token accounting**: the status line's input/output/cache figures are cumulative for
  the session and **deduplicated by message id** (the transcript logs each API call
  several times). They reconcile with `cost.total_cost_usd` to within a few percent; the
  small residual is sub-agent calls, which bill to the session but live in their own
  transcripts.
- **Single vs two lines**: leaving Line 2 empty produces a one-line status.
- **Clock**: the clock segment is "live" — when it shows seconds the composer auto-picks
  a 1s refresh interval, otherwise 2s.
- **Palettes**: a chosen palette bakes per-segment `colorHex` values into `choice.json`;
  segments without `colorHex` fall back to the classic named-color rendering, so old
  layouts look exactly as before.
- **Sharing**: this whole directory is self-contained. Another Claude Code user installs
  it by copying it to their own `~/.claude/skills/statusline-designer/` (or via a plugin).
