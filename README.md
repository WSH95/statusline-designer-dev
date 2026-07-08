<h1 align="center">Status Bar Composer</h1>

<p align="center">
  Visually design your Claude Code terminal status line — a local, macOS-style
  web designer, shipped as a Claude Code skill.
</p>

<p align="center">
  <img src="docs/status-bar-composer.png" alt="Status Bar Composer — a macOS-style designer with a live terminal preview, a 3D ring of property cards, and a two-line arrangement dock" width="880">
</p>

Arrange fields on a **3D card ring**, watch a **live terminal preview** update as you
go, then hit **Apply**: the skill generates a self-contained `python3` status-line
script and wires it into your `settings.json`. It runs entirely on your machine
(binds `127.0.0.1`) — no network requests, no build step.

## Demo

Rotate the ring, focus a card, toggle a field and watch the preview update live,
then flip between light and dark:

<p align="center">
  <img src="docs/status-bar-composer-demo.gif" alt="Rotating the card ring, toggling Session cost and Lines changed so a second status line appears in the live preview, then switching to a dark theme" width="880">
</p>

## Features

- **3D property-card ring** — drag, swipe, arrow-key or click to focus a card.
- **Live terminal preview** — pixel-mirrors the generated script, so what you see is
  what your terminal gets.
- **Light & dark** themes, plus color palettes: Tokyo Night (default), Dracula, Nord,
  Catppuccin Mocha.
- **Starter presets** — Minimal, Essentials, Limits watch, Full telemetry, As pictured.
- **Every field Claude Code exposes** — model, working directory, git branch/changes,
  context-window %, 5-hour & 7-day usage limits, effort level, session cost, cumulative
  input/output/cache tokens, a live clock, and more.
- **Two-line arrangement dock** — drag chips to reorder fields or split across two lines.
- **Export** the design as JSON. **100% local** — vanilla HTML/CSS/JS served by a
  stdlib `python3` server; no external requests.

## Install & use

**From this dev repo** — copy the skill into your Claude Code skills folder:

```bash
git clone https://github.com/WSH95/statusline-designer-dev.git
cp -r statusline-designer-dev/skill-src/statusline-designer ~/.claude/skills/statusline-designer
```

Once it's published to the [agent-skills](https://github.com/WSH95/agent-skills) registry,
you'll also be able to install it with:

```bash
npx skills add WSH95/agent-skills@statusline-designer
```

Then in Claude Code, say something like *"design my status line"* or *"show git branch
and context % in my status bar"*. The skill starts the designer, hands you the URL, and
on **Apply** generates the script and updates `settings.json` for you. Re-run it anytime
to tweak — it re-hydrates from your current layout.

**Run the designer directly.**

```bash
python3 skill-src/statusline-designer/scripts/server.py
# open http://localhost:8765
```

## How it works

```
web UI  ──Apply──▶  choice.json
                        ├─ generate.py        ─▶  ~/.claude/statusline-command.py   (self-contained python3)
                        └─ apply_settings.py   ─▶  settings.json                     (adds the statusLine command)
```

`choice.json` is the contract between the UI and the generators; the status-line script
is pure `python3` (stdlib + `git`), null-safe, and degrades gracefully when a field's
data is absent.

## Development

**Claude Code only.** This repo is the development home of the skill: canonical source
lives in [`skill-src/statusline-designer/`](skill-src/statusline-designer/), release
payloads are **built into `dist/`**, and shipped as pull requests to the
[agent-skills](https://github.com/WSH95/agent-skills) registry.

```
skill-src/statusline-designer/     # canonical skill source (the drop-in: SKILL.md + scripts/)
  scripts/server.py                # serves the composer UI
  scripts/ui/                      # vanilla HTML/CSS/JS (ring, preview, dock)
  scripts/generate.py              # choice.json  ->  status-line script
  scripts/apply_settings.py        # merges statusLine into settings.json
tools/build_skill_payloads.py      # skill-src/  ->  dist/  (clean, validated payload)
tools/publish_agent_artifact_pr.py # opens a PR into agent-skills (never merges)
tools/verify.sh                    # sandboxed end-to-end checks
tools/capture_readme_media.py      # regenerates the README hero + demo GIF
dist/                              # built payloads (generated; gitignored)
docs/                              # README media
agent-artifacts.json               # release manifest (build + publish config)
```

Build the release payload, then run the sandboxed end-to-end suite (never touches your
real `~/.claude`):

```bash
python3 tools/build_skill_payloads.py      # skill-src/ -> dist/
bash tools/verify.sh                        # sandboxed end-to-end suite
```

Preview a release PR with no network calls, then open it for real when ready
(needs an authenticated `gh`):

```bash
python3 tools/publish_agent_artifact_pr.py --dry-run
python3 tools/publish_agent_artifact_pr.py   # opens the PR; never merges
```

Regenerate the README media after a UI change (sandboxed; needs `google-chrome`
and `ffmpeg`):

```bash
python3 tools/capture_readme_media.py       # both; or --hero-only / --gif-only
```

## Requirements

`python3` (standard library only) and a browser. Cross-platform: macOS, Linux, Windows.
