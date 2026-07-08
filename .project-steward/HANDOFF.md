---
updated_at: 2026-07-08T19:10:00Z
updated_by: claude
session_status: closed
branch: main
last_commit: ae4cf35 feat(publish): target agent-skills/skills/ and add a README use-case entry with the demo GIF
---
# Handoff

Written for a zero-context successor (another agent, another tool,
another device). Keep every section current at wrap-up.

## Now

**The skill is published to the agent-skills registry via an OPEN PR, and this is
a Claude-Code-only skill development repo with a build + publish pipeline.**

- **Open PR (NOT merged):** https://github.com/WSH95/agent-skills/pull/1 — branch
  `publish/statusline-designer-20260708-164117`. It adds the payload at
  **`skills/statusline-designer/`** (10 files) and fills the registry README's
  `## Skills` section (use-case text + the demo GIF via this repo's raw URL).
  Review and merge on GitHub. **An agent must not merge it.**
- Layout: `skill-src/statusline-designer/` (canonical source, byte-identical),
  `tools/` (build/publish/verify/capture), `dist/` (gitignored build output),
  `docs/` (README media + `docs/registry/statusline-designer.md` = the registry
  README entry), `agent-artifacts.json` (manifest).
- Distribution: `python3 tools/build_skill_payloads.py` -> clean `dist/<skill>/`;
  `python3 tools/publish_agent_artifact_pr.py` builds, copies to `skills/<name>/`
  in agent-skills, upserts the registry README `## Skills` section from
  `readme_entry`, pushes a fresh timestamped branch, and `gh pr create` (never
  merges). `--dry-run` is network-free.
- Scope: Claude Code only; no other-runtime references remain.

## In flight

- Nothing local. Working tree clean; the sandbox review server (port 8765) was
  torn down. `~/.claude` untouched. Dev-repo commits are **pushed** — `origin/main`
  is in sync (the user approved the push at session end).

## Next steps

1. **Review + merge PR #1** on GitHub. After merge, confirm once that
   `npx skills add WSH95/agent-skills@statusline-designer` resolves the skill now
   that it lives under `skills/` (that CLI selects by skill name).
2. Re-publish after a skill change: `python3 tools/build_skill_payloads.py` then
   `python3 tools/publish_agent_artifact_pr.py` — opens a NEW timestamped branch/PR
   each run (skips if the payload has no diff).
3. Add another skill: create `skill-src/<name>/` + a manifest entry (+ optional
   `readme_entry`), then build / verify / publish.
4. After a UI change: `python3 tools/capture_readme_media.py` (needs google-chrome
   + ffmpeg), then commit.

## Blockers

- (none)

## Key files

- `skill-src/statusline-designer/` — the shipped skill (unchanged content).
- `tools/build_skill_payloads.py` — skill-src -> `dist/<skill>/`; validates + fails loud.
- `tools/publish_agent_artifact_pr.py` — dist -> PR into agent-skills; upserts the
  registry README `## Skills` section from `readme_entry`; `--dry-run`, `--checkout`,
  `--base`; never merges.
- `agent-artifacts.json` — `target_path: skills/statusline-designer`,
  `readme_entry: docs/registry/statusline-designer.md`.
- `docs/registry/statusline-designer.md` — the registry README `## Skills` section
  (follows agent-skills' template verbatim; embeds the demo GIF by raw URL; uses the
  real skill name).
- `tools/verify.sh` — sandboxed suite, 35 checks. `README.md` + `docs/` — front page + media.

## Tried and rejected

- A verbose custom registry entry, a per-skill install line, and the UI label
  "Status Bar Composer" — the user wants the target repo's README template followed
  verbatim, concise, no install line (its `## Installing` covers it), and the real
  skill name `statusline-designer`.
- claude-in-chrome MCP for the live smoke test — the extension was offline; used
  headless `google-chrome --no-proxy-server` instead.

## Warnings

- **The PR must not be merged by an agent** — review/merge is the user's.
- **Skill content is frozen here** (`git mv` only; verify.sh §1 = byte-identical ANSI).
- **Publish is outward-facing**: needs `gh` auth; opens a PR, never merges; `--dry-run` first.
- **Never `pkill -f` a plain pattern** here (self-match → exit 144); use the
  `[s]tatusline…` bracket trick, or kill by PID/port.
- The registry README GIF is served from this repo's public raw URL on `main`
  (`docs/status-bar-composer-demo.gif`); keep that path/branch public or it breaks.
