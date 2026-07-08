# Progress log

Newest first. One short entry per semantic checkpoint — not per edit.

### 2026-07-08T19:20Z — pushed dev repo to origin/main (user approved at session end)
Pushed the restructure + publish commits (through this steward wrap) to
`origin/main`; the dev repo is in sync. PR #1 to agent-skills stays open for the
user's review/merge.

### 2026-07-08T19:10Z — published statusline-designer to agent-skills (PR #1)
Refined the publish step and opened the first registry PR. Changed `target_path`
to `skills/statusline-designer` and added `readme_entry`
(`docs/registry/statusline-designer.md`) — a template-conformant `## Skills` entry
that embeds the demo GIF via this repo's raw URL and uses the real skill name (no
per-skill install line; the registry's `## Installing` covers it). The publish
script now upserts the registry README `## Skills` section idempotently. Verified:
verify.sh 35/35, raw GIF URL 200 (image/gif), `--dry-run` clean. Opened
https://github.com/WSH95/agent-skills/pull/1 (branch
`publish/statusline-designer-20260708-164117`; 11 files; never merged). Dev-repo
commits remain local (not pushed).

### 2026-07-08T18:45Z — restructure into a Claude-Code-only skills dev repo
Reorganized per the agent-artifact-maintainer layout: skill source -> `skill-src/
statusline-designer/`, dev tooling -> `tools/`, concept mock -> `docs/` (all via
git mv, byte-identical). Added `tools/build_skill_payloads.py` (skill-src -> a
clean, validated `dist/<skill>/`), `tools/publish_agent_artifact_pr.py` +
`agent-artifacts.json` (opens a PR placing the payload at the agent-skills repo
root; never merges; `--dry-run` is network-free), and a build section to
`tools/verify.sh`. Removed every legacy other-runtime reference and marked the
repo Claude Code only (AGENTS.md intro + Commands, CLAUDE.md, README, PROJECT.md,
DECISIONS 0003). Verified: `tools/verify.sh` 35/35 green (incl. legacy ANSI
equivalence — the installed skill is unaffected); the composer renders live from
skill-src (headless Chrome; the claude-in-chrome extension was offline);
`publish --dry-run` lists 10 files with no network; a case-insensitive scan for
the old runtime name is clean.
Publish deferred (scaffold + dry-run only; needs `gh` auth + go-ahead).
`~/.claude` untouched.

### 2026-07-06T06:41Z — AGENTS.md Commands: add README-media regen
Listed `python3 dev/capture_readme_media.py` in the AGENTS.md Commands managed
block (guardrail: diff shown + approved; recorded as DECISIONS 0002). README/docs
stay out of AGENTS.md (instructions, not a log).

### 2026-07-06T06:34Z — session wrap: repo public + README shipped
Public GitHub repo, a `README.md` (fresh live hero screenshot + ~10s core-tour
GIF), and `dev/capture_readme_media.py` (reproducible media regenerator) are all
committed and **pushed**; `origin/main` in sync at `40bb523`. Working tree clean,
no background processes, `~/.claude` untouched. Session closed.

### 2026-07-06T06:06Z — dev/capture_readme_media.py (reproducible README media)
Promoted the throwaway capture driver into `dev/capture_readme_media.py`: one
path-clean, sandboxed command that regenerates both `docs/` assets after a UI
change — hero via headless `google-chrome --screenshot` at the "as pictured"
deep link; GIF via a stdlib CDP/websocket driver that scripts the core tour,
encoded with an ffmpeg two-pass palette. Mirrors `dev/verify.sh` (temp
`STATUSLINE_DATA_DIR`, alt port 8799; `~/.claude` untouched) and tears down
whole process groups (no `pkill`; chrome children reaped) so ports free and it
re-runs cleanly. README Development section points to it; `--hero-only` /
`--gif-only` flags. Verified: two clean runs (exit 0), ports free after, both
`docs/` assets regenerated.

### 2026-07-06T05:56Z — [auto-checkpoint] README committed, push pending
README + hero/GIF committed as `a7e6226`; `main` is 1 ahead of `origin`, awaiting user go-ahead to push.

### 2026-07-06T05:54Z — public GitHub repo + README (hero image + demo GIF)
Published the repo public as `WSH95/statusline-designer-dev` and added
`README.md`. It leads with a fresh live screenshot of the *shipped* UI (the
repo's `statusline-designer-ui.png` is the older concept mockup — removed
bottom panel / "Save" button — so it was not reused) and a ~10s "core tour"
GIF: rotate the ring → focus a card → toggle Session cost + Lines changed so
line 2 appears live in the preview → light/dark flip. Media committed under
`docs/`. Capture was fully headless and sandboxed (`STATUSLINE_DATA_DIR` temp
dir, alt port 8793; `~/.claude` untouched): hero via `google-chrome
--headless --screenshot` at the `#preset=pictured&theme=light` deep link; GIF
via a throwaway stdlib CDP driver that drove `SBC.ring.goTo` / DOM toggles /
`themeBtn` over a raw websocket, frames encoded with ffmpeg. Gotchas for
successors: `urllib` to `127.0.0.1` ignores the CIDR `no_proxy` and gets a
502 from the proxy — build a direct `ProxyHandler({})` opener; and never
`pkill -f` a plain port/pattern that appears in the killing shell's own argv
(it self-terminates the shell).

### 2026-07-06T05:00Z — iteration 4 (parting fixes)
Context Window card foot misalignment fixed: preview strips are now 38px
flex-centered (block bar glyphs inflated the line box in fallback mono
fonts and pushed content low). Re-synced to installed skill; verify 26/26.
PLAN.md brought current: milestone marked delivered with iteration 2/3/4
entries; "Later" description-optimization line made self-explanatory.

### 2026-07-06T04:27:46Z — cli
Status Bar Composer delivered: 3 design iterations, installed to ~/.claude/skills, user's live status line regenerated through the new pipeline; verify 26/26

### 2026-07-06T01:05Z — session wrap: project delivered
User's real Apply completed the loop: generate.py + apply_settings.py ran
against the live config and the terminal status line now renders the new
design. All 12 session tasks closed; verify 26/26; designer server and
waiters shut down (skill self-starts on next invocation). Remaining ideas
live in PLAN.md "Later" (optional description optimization). Repo and installed
skill are in sync at 146a665 + wrap commit.

### 2026-07-06T00:40Z — [auto-checkpoint] iteration 3 shipped + skill installed for real; server on :8765 with real data dir; waiter armed for the user's first real Apply

### 2026-07-05T23:35Z — [auto-checkpoint] iteration 2 delivered; user's sandbox Apply verified end-to-end; handoff refreshed

### 2026-07-05T23:20Z — iteration 2 shipped (full-bleed rework per user review)
User rejected round 1 as too literal a mock copy (framed window, small text,
blurry 3D, weak drama, wrong arrows). Rebuilt: full-bleed off-white page, no
app chrome, 14px base / 300x380 cards / 820px terminal, slot-based coverflow
(focused card + terminal on 2D transforms = crisp; 42deg turns; opacity+veil
depth, zero blur filters), rAF-driven motion, perspective-origin parallax,
edge chevron arrows, displacement-based side-card clicks. verify.sh 26/26,
round-trip intact, focused card measured at exactly 300px (no upscale).
Awaiting user re-review on :8899.

### 2026-07-05T22:40Z — [auto-checkpoint] handoff refreshed
Build+verify complete, review server live on :8899, waiter armed on sandbox
choice.json; HANDOFF.md rewritten for the review-in-progress state.

### 2026-07-05T22:30Z — composer built and verified; awaiting user review
Full Status Bar Composer implemented in `statusline-designer/` (drop-in):
rewritten server.py (static ui/ + BOOT injection, same contract), 4-file
vanilla JS app (catalog / preview / ring / main), macOS glass design system
light+dark, 15-card 3D ring with coverflow lean and click-to-center, live
terminal preview that ports generate.py rendering 1:1, arrangement dock,
detail panel, presets, 4 color palettes, clock segment, export. generate.py
gained clock + colorHex + tempfile.gettempdir() (Windows). dev/verify.sh:
26/26 green incl. old-vs-new legacy output equivalence and the
hydrate(real layout) → buildChoice() round-trip. Headless screenshots in
dev/screenshots/. Gotcha for successors: transitions must be suppressed at
boot (.ring.boot) or headless screenshots freeze mid-transition; curl to
127.0.0.1 needs --noproxy in this environment. Next: user review at
http://localhost:8899 (sandboxed server, scratchpad data dir seeded with a
copy of the real layout), then install on explicit go-ahead.

### 2026-07-05T20:59:45Z — project-steward init
Project initialized as a Project Steward managed project.

