# Progress log

Newest first. One short entry per semantic checkpoint — not per edit.

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

